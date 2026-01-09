// =============================================================================
// BILLING INVOICES API
// Phase 6: Billing & Time Tracking (Read-Only)
// =============================================================================

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isBillingEnabled } from "@/lib/feature-flags";

// GET /api/billing/invoices - List invoices for current firm
export async function GET(_request: NextRequest) {
  // Feature flag check
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: "Feature not available" }, { status: 404 });
  }

  try {
    const session = await auth();

    if (!session?.user?.firmId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Get billing account for firm
    const { data: billingAccount } = await supabase
      .from('billing_accounts')
      .select('id')
      .eq('firm_id', session.user.firmId)
      .maybeSingle();

    if (!billingAccount) {
      return NextResponse.json({ data: [], success: true });
    }

    // Get invoices with line items
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*)
      `)
      .eq('billing_account_id', billingAccount.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (invoicesError) {
      throw invoicesError;
    }

    // Transform to match expected format
    const transformedInvoices = (invoices || []).map((invoice: any) => ({
      ...invoice,
      lineItems: (invoice.invoice_line_items || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    }));

    return NextResponse.json({ data: transformedInvoices, success: true });
  } catch (error) {
    console.error("[API] Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}

