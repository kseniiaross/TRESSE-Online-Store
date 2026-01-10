
import { loadStripe } from '@stripe/stripe-js';

const pk = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string;
if (!pk) {

  console.error('VITE_STRIPE_PUBLIC_KEY is missing');
  throw new Error('Missing VITE_STRIPE_PUBLIC_KEY');
}

export const stripePromise = loadStripe(pk);