// =============================================================================
// BILLING INVOICES API
// Phase 6: Billing & Time Tracking (Read-Only)
// =============================================================================

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isBillingEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";

// GET /api/billing/invoices - List invoices for current firm
export async function GET(request: NextRequest) {
  // Feature flag check
  if (!isBillingEnabled()) {
    return NextResponse.json({ error: "Feature not available" }, { status: 404 });
  }

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.firmId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    
    // Get billing account for firm
    const { data: billingAccount } = await supabase
      .from('billing_accounts')
      .select('id')
      .eq('firm_id', currentUser.firmId)
      .maybeSingle();

    if (!billingAccount) {
      return NextResponse.json({ data: [], success: true });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = (page - 1) * limit;
    const rangeTo = offset + limit - 1;

    // Get invoices with line items
    const { data: invoices, error: invoicesError, count } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items (*)
      `, { count: 'exact' })
      .eq('billing_account_id', billingAccount.id)
      .order('created_at', { ascending: false })
      .range(offset, rangeTo);

    if (invoicesError) {
      throw invoicesError;
    }

    // Transform to match expected format
    const transformedInvoices = (invoices || []).map((invoice: any) => ({
      ...invoice,
      lineItems: (invoice.invoice_line_items || []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: transformedInvoices,
      success: true,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    logger.error("[API] Error fetching invoices", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Failed to fetch invoices", code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}
