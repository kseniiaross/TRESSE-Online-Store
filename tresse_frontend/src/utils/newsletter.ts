import axiosInstance from "../api/axiosInstance";

export type SubscribeSource = "modal" | "footer" | "unknown";

const DISMISS_KEY = "tresse:newsletter:lastDismissedAt";
const SUBSCRIBED_KEY = "tresse:newsletter:lastSubscribedAt";

const DISMISS_COOLDOWN_DAYS = 14;
const SUBSCRIBED_COOLDOWN_DAYS = 365;

const REQUEST_TIMEOUT_MS = 12_000;

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function markNewsletterDismissed(): void {
  safeLocalStorageSet(DISMISS_KEY, String(Date.now()));
}

export function markNewsletterSubscribed(): void {
  safeLocalStorageSet(SUBSCRIBED_KEY, String(Date.now()));
}

function isCooldownPassed(key: string, cooldownDays: number): boolean {
  const raw = safeLocalStorageGet(key);
  if (!raw) return true;

  const last = Number(raw);
  if (!Number.isFinite(last) || last <= 0) return true;

  return Date.now() - last > daysToMs(cooldownDays);
}

export function canShowNewsletterModal(isLoggedIn: boolean): boolean {
  if (isLoggedIn) return false;

  const subscribedOk = isCooldownPassed(SUBSCRIBED_KEY, SUBSCRIBED_COOLDOWN_DAYS);
  if (!subscribedOk) return false;

  const dismissedOk = isCooldownPassed(DISMISS_KEY, DISMISS_COOLDOWN_DAYS);
  return dismissedOk;
}

function extractBestErrorMessage(data: unknown): string | null {

  if (isString(data)) return data;

  if (!isRecord(data)) return null;

  const detail = data["detail"];
  if (isString(detail)) return detail;

  const nonField = data["non_field_errors"];
  if (isStringArray(nonField) && nonField.length > 0) return nonField[0];

  const emailField = data["email"];
  if (isStringArray(emailField) && emailField.length > 0) return emailField[0];

  for (const key of Object.keys(data)) {
    const v = data[key];
    if (isStringArray(v) && v.length > 0) return v[0];
  }

  return null;
}

function isAxiosLikeError(err: unknown): err is { response?: { status?: number; data?: unknown } } {
  return isRecord(err) && ("response" in err || "message" in err);
}

export async function subscribeNewsletter(email: string, source: SubscribeSource): Promise<void> {
  const clean = email.trim();

  if (!isValidEmail(clean)) {
    throw new Error("Please enter a valid email address.");
  }

  try {
    await axiosInstance.post(
      "/newsletter/subscribe/",
      { email: clean, source },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    markNewsletterSubscribed();
  } catch (err: unknown) {
    let msg = "Subscription failed. Please try again.";

    if (isRecord(err) && isString(err["message"])) {
      const m = err["message"].toLowerCase();
      if (m.includes("timeout")) {
        throw new Error("Server is taking too long to respond. Please try again in a moment.");
      }
    }

    if (isAxiosLikeError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;

      const extracted = extractBestErrorMessage(data);
      if (extracted) msg = extracted;

      if (!extracted && typeof status === "number") {
        if (status === 400) msg = "Please check your email and try again.";
        if (status === 404) msg = "Subscribe endpoint not found. Please contact support.";
        if (status === 405) msg = "Subscribe endpoint does not allow this method.";
        if (status >= 500) msg = "Server error. Please try again later.";
      }
    }

    throw new Error(msg);
  }
}