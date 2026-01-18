// src/features/payments/stripe.ts
import { loadStripe, type Stripe } from "@stripe/stripe-js";

let cached: Promise<Stripe | null> | null = null;

function readPublishableKey(): string {
  const raw = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

  if (typeof raw !== "string") return "";
  return raw.trim();
}

export function getStripePromise(): Promise<Stripe | null> {
  if (cached) return cached;

  const pk = readPublishableKey();

  // ✅ Не кидаем ошибку — просто отключаем Stripe, если ключа нет/битый
  if (!pk || !pk.startsWith("pk_")) {
    console.warn(
      "[Stripe] Disabled: VITE_STRIPE_PUBLIC_KEY is missing or invalid. " +
        "Expected a publishable key starting with 'pk_'."
    );
    cached = Promise.resolve(null);
    return cached;
  }

  cached = loadStripe(pk);
  return cached;
}