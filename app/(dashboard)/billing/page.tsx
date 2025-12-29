// =============================================================================
// BILLING PAGE
// Phase 6: Billing & Time Tracking (Read-Only)
// =============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isBillingUIEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Billing | Depo-Pro",
  description: "View invoices and billing information",
};

export default async function BillingPage() {
  // Feature flag check
  if (!isBillingUIEnabled()) {
    redirect("/dashboard");
  }

  const session = await auth();

  if (!session?.user?.firmId) {
    redirect("/dashboard");
  }

  // Fetch invoices directly from database
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing & Invoices</h1>
        <p className="text-gray-600 mt-1">
          View your invoices and billing information.
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>

          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No invoices yet.</p>
              <p className="text-sm mt-2">
                Invoices will appear here once billing activity is recorded.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-3">
                        {new Date(inv.periodStart).toLocaleDateString()} –{" "}
                        {new Date(inv.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            inv.status === "PAID"
                              ? "bg-green-100 text-green-800"
                              : inv.status === "VOID"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        ${(inv.totalCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

