// =============================================================================
// STRIPE CUSTOMER SERVICE
// =============================================================================
// Location: lib/stripe/customer-service.ts
// Purpose: Manage Stripe customers linked to BillingAccounts
// =============================================================================

import { stripe, isStripeEnabled } from './client';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CustomerCreateParams {
  firmId: string;
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  success: boolean;
  stripeCustomerId?: string;
  error?: string;
}

// -----------------------------------------------------------------------------
// Create or Get Stripe Customer
// -----------------------------------------------------------------------------

export async function getOrCreateStripeCustomer(
  params: CustomerCreateParams
): Promise<CustomerResult> {
  if (!isStripeEnabled() || !stripe) {
    console.log('[MOCK] Would create Stripe customer for firm:', params.firmId);
    return {
      success: true,
      stripeCustomerId: `cus_mock_${params.firmId}`,
    };
  }

  try {
    // Check if billing account exists with Stripe customer
    const billingAccount = await db.billingAccount.findUnique({
      where: { firmId: params.firmId },
    });

    if (billingAccount?.stripeCustomerId) {
      // Customer already exists
      return {
        success: true,
        stripeCustomerId: billingAccount.stripeCustomerId,
      };
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        firmId: params.firmId,
        ...params.metadata,
      },
    });

    // Update or create billing account with Stripe customer ID
    if (billingAccount) {
      await db.billingAccount.update({
        where: { firmId: params.firmId },
        data: { stripeCustomerId: customer.id },
      });
    } else {
      await db.billingAccount.create({
        data: {
          firmId: params.firmId,
          stripeCustomerId: customer.id,
          billingEmail: params.email,
        },
      });
    }

    console.log(`✅ Created Stripe customer ${customer.id} for firm ${params.firmId}`);

    return {
      success: true,
      stripeCustomerId: customer.id,
    };
  } catch (error) {
    console.error('❌ Failed to create Stripe customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Get Customer by Firm ID
// -----------------------------------------------------------------------------

export async function getStripeCustomerByFirm(firmId: string): Promise<string | null> {
  const billingAccount = await db.billingAccount.findUnique({
    where: { firmId },
    select: { stripeCustomerId: true },
  });

  return billingAccount?.stripeCustomerId || null;
}

// -----------------------------------------------------------------------------
// Update Customer Email
// -----------------------------------------------------------------------------

export async function updateCustomerEmail(
  firmId: string,
  newEmail: string
): Promise<CustomerResult> {
  if (!isStripeEnabled() || !stripe) {
    return { success: true };
  }

  try {
    const stripeCustomerId = await getStripeCustomerByFirm(firmId);

    if (!stripeCustomerId) {
      return { success: false, error: 'No Stripe customer found for firm' };
    }

    await stripe.customers.update(stripeCustomerId, {
      email: newEmail,
    });

    await db.billingAccount.update({
      where: { firmId },
      data: { billingEmail: newEmail },
    });

    return { success: true, stripeCustomerId };
  } catch (error) {
    console.error('❌ Failed to update customer email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Delete Customer (for account deletion)
// -----------------------------------------------------------------------------

export async function deleteStripeCustomer(firmId: string): Promise<CustomerResult> {
  if (!isStripeEnabled() || !stripe) {
    return { success: true };
  }

  try {
    const stripeCustomerId = await getStripeCustomerByFirm(firmId);

    if (stripeCustomerId) {
      await stripe.customers.del(stripeCustomerId);
      console.log(`✅ Deleted Stripe customer ${stripeCustomerId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete Stripe customer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
