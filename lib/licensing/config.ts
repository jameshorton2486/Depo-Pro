import 'server-only';

export const LICENSING_CONTRACT_VERSION = '1.0' as const;
export const licensingConfig = {
  monthlyPriceCents: Number(process.env.LICENSING_MONTHLY_PRICE_CENTS ?? 4900),
  includedSeconds: Number(process.env.LICENSING_INCLUDED_SECONDS ?? 108000),
  graceDays: Number(process.env.LICENSING_GRACE_DAYS ?? 5),
  deviceLimit: Number(process.env.LICENSING_DEVICE_LIMIT ?? 2),
  stripePriceId: process.env.STRIPE_LICENSE_PRICE_ID ?? '',
};
