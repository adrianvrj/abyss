/**
 * Stripe server-side SDK configuration
 */

import Stripe from 'stripe';
import { env } from './env';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = env.stripeSecretKey();

    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }

  return stripeInstance;
}

// Export stripe as a getter to lazy-load
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe];
  }
});
