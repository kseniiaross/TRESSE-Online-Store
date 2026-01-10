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

  const res = await fetch("/api/newsletter/subscribe/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: clean, source }),
  });

  if (!res.ok) {
    let msg = "Subscription failed. Please try again.";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") msg = data.detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  markNewsletterSubscribed();
}