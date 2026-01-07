// =============================================================================
// BILLING INVOICES API
// Phase 6: Billing & Time Tracking (Read-Only)
// =============================================================================

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

    const invoices = await db.invoice.findMany({
      where: {
        billingAccount: {
          firmId: session.user.firmId,
        },
      },
      include: {
        lineItems: {
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ data: invoices, success: true });
  } catch (error) {
    console.error("[API] Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", code: "FETCH_ERROR" },
      { status: 500 }
    );
  }
}

