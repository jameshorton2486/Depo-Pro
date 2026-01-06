// =============================================================================
// STRIPE CLIENT SERVICE
// =============================================================================
// Location: lib/stripe/client.ts
// Purpose: Initialize and export Stripe SDK client
// =============================================================================

import Stripe from 'stripe';

// Validate environment variable exists
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set - billing features will be mocked');
}

// Initialize Stripe client
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover', // Use latest stable API version
      typescript: true,
    })
  : null;

// Helper to check if Stripe is configured
export function isStripeEnabled(): boolean {
  return stripe !== null && process.env.ENABLE_BILLING_PHASE_6 === 'true';
}

// Export the API version for consistency
export const STRIPE_API_VERSION = '2025-10-29.clover';
