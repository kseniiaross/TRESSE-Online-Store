import axiosInstance from "../api/axiosInstance";


type SubscribeSource = "modal" | "footer" | "unknown";

const DISMISS_KEY = "tresse:newsletter:lastDismissedAt";
const SUBSCRIBED_KEY = "tresse:newsletter:lastSubscribedAt";

const DISMISS_COOLDOWN_DAYS = 14;
const SUBSCRIBED_COOLDOWN_DAYS = 365;

function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function markNewsletterDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function markNewsletterSubscribed(): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function isCooldownPassed(key: string, cooldownDays: number): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;

    const last = Number(raw);
    if (!Number.isFinite(last) || last <= 0) return true;

    return Date.now() - last > daysToMs(cooldownDays);
  } catch {
    return true;
  }
}

export function canShowNewsletterModal(isLoggedIn: boolean): boolean {
  if (isLoggedIn) return false;

  const subscribedOk = isCooldownPassed(SUBSCRIBED_KEY, SUBSCRIBED_COOLDOWN_DAYS);
  if (!subscribedOk) return false;

  const dismissedOk = isCooldownPassed(DISMISS_KEY, DISMISS_COOLDOWN_DAYS);
  return dismissedOk;
}

export async function subscribeNewsletter(email: string, source: SubscribeSource): Promise<void> {
  const clean = email.trim();
  if (!isValidEmail(clean)) {
    throw new Error("Please enter a valid email address.");
  }

  try {
    // axiosInstance уже смотрит в VITE_API_URL и добавляет /api при создании baseURL
    await axiosInstance.post("/newsletter/subscribe/", { email: clean, source });

    markNewsletterSubscribed();
  } catch (err: unknown) {
    let msg = "Subscription failed. Please try again.";

    // аккуратно вытаскиваем detail из ответа DRF
    if (typeof err === "object" && err !== null) {
      const anyErr = err as { response?: { data?: unknown } };
      const data = anyErr.response?.data;

      if (data && typeof data === "object" && "detail" in data) {
        const detail = (data as { detail?: unknown }).detail;
        if (typeof detail === "string") msg = detail;
      }
    }

    throw new Error(msg);
  }
}