-- Migration: Billing Tables
-- Creates billing_accounts, invoices, and invoice_line_items
-- Referenced by app/api/jobs/[id]/invoice/route.ts and
-- app/api/billing/invoices/route.ts

-- ============================================================
-- BILLING ACCOUNTS
-- One per firm. Links the firm to Stripe customer.
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id           UUID NOT NULL UNIQUE REFERENCES firms(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  billing_email     TEXT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'USD',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_billing_account_access" ON billing_accounts
  USING (firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_billing_accounts_firm
  ON billing_accounts(firm_id);

CREATE INDEX IF NOT EXISTS idx_billing_accounts_stripe
  ON billing_accounts(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- INVOICES
-- One per billing period per firm.
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id UUID NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  invoice_number    TEXT NOT NULL UNIQUE,
  stripe_invoice_id TEXT,
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'DRAFT',
  total_cents       INTEGER NOT NULL DEFAULT 0,
  subtotal_cents    INTEGER NOT NULL DEFAULT 0,
  tax_cents         INTEGER NOT NULL DEFAULT 0,
  paid_at           TIMESTAMPTZ,
  due_date          TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_invoices_access" ON invoices
  USING (
    billing_account_id IN (
      SELECT id FROM billing_accounts
      WHERE firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_invoices_billing_account
  ON invoices(billing_account_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe
  ON invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- ============================================================
-- INVOICE LINE ITEMS
-- Individual line items on an invoice.
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  quantity          NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents       INTEGER NOT NULL DEFAULT 0,
  job_id            UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_line_items_access" ON invoice_line_items
  USING (
    invoice_id IN (
      SELECT inv.id FROM invoices inv
      JOIN billing_accounts ba ON inv.billing_account_id = ba.id
      WHERE ba.firm_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_line_items_invoice
  ON invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_line_items_job
  ON invoice_line_items(job_id)
  WHERE job_id IS NOT NULL;

-- Auto-update updated_at on invoices
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_updated_at ON invoices;
CREATE TRIGGER set_invoice_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoice_updated_at();
