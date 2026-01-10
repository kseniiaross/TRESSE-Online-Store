// src/features/payments/stripe.ts
import { loadStripe, type Stripe } from "@stripe/stripe-js";

let cached: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (cached) return cached;

  const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

  // ✅ НЕ КИДАЕМ ОШИБКУ. Просто отключаем Stripe, если ключа нет.
  if (!pk || typeof pk !== "string" || !pk.startsWith("pk_")) {
    console.warn("Stripe is disabled: VITE_STRIPE_PUBLIC_KEY is missing/invalid");
    cached = Promise.resolve(null);
    return cached;
  }

  cached = loadStripe(pk);
  return cached;
}