import type { Stripe } from "@stripe/stripe-js";

let cachedPromise: Promise<Stripe | null> | null = null;

function getPublishableKey(): string | null {
  const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

  if (typeof pk !== "string") return null;
  const key = pk.trim();

  if (!key || !key.startsWith("pk_")) return null;

  return key;
}

export function getStripePromise(): Promise<Stripe | null> {
  if (cachedPromise) return cachedPromise;

  const key = getPublishableKey();

  if (!key) {
    console.warn("Stripe disabled: missing/invalid VITE_STRIPE_PUBLIC_KEY");
    cachedPromise = Promise.resolve(null);
    return cachedPromise;
  }

  cachedPromise = import("@stripe/stripe-js").then(({ loadStripe }) => loadStripe(key));

  return cachedPromise;
}