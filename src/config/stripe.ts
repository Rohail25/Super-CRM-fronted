import { loadStripe } from '@stripe/stripe-js';

// Stripe public key - loaded from .env file
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51SFZTeFZetT6fppMXO3CMbwUEfzCdEKbn9wlyDFnqMUGZWVQzsenp6jzWM3NAedklviHaCIl1P30Nc1n47aa6rwM00RYn3J6d4';

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

