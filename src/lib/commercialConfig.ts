export const commercialProposal = {
  monthlyPriceCents: 4900,
  includedHours: 30,
  overageTerms: "Additional-usage pricing is not yet approved.",
  status: "proposal",
} as const;

export function formatMonthlyPrice(): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(commercialProposal.monthlyPriceCents / 100);
}
