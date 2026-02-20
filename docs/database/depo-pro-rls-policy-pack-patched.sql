-- Depo-Pro RLS Policy Pack (Schema-Aligned Patch)
-- Generated to match live PascalCase CRM schema in production.
-- Safe to rerun: drops/recreates only the policies defined here.

BEGIN;

-- Helper overload: current tables often pass TEXT ids.
CREATE OR REPLACE FUNCTION public.user_belongs_to_firm(check_firm_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF check_firm_id IS NULL OR length(trim(check_firm_id)) = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND (
        p.firm_id::text = check_firm_id
        OR p.org_id::text = check_firm_id
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.org_id::text = check_firm_id
      AND om.status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Case
ALTER TABLE public."Case" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_select_rls ON public."Case";
DROP POLICY IF EXISTS case_insert_rls ON public."Case";
DROP POLICY IF EXISTS case_update_rls ON public."Case";
CREATE POLICY case_select_rls ON public."Case"
  FOR SELECT USING (public.user_belongs_to_firm("firmId"));
CREATE POLICY case_insert_rls ON public."Case"
  FOR INSERT WITH CHECK (public.user_belongs_to_firm("firmId"));
CREATE POLICY case_update_rls ON public."Case"
  FOR UPDATE USING (public.user_belongs_to_firm("firmId"));

-- CaseAttorney
ALTER TABLE public."CaseAttorney" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_attorney_rls ON public."CaseAttorney";
CREATE POLICY case_attorney_rls ON public."CaseAttorney"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."Case" c
      WHERE c.id = "CaseAttorney"."caseId"
        AND public.user_belongs_to_firm(c."firmId")
    )
  );

-- CaseDocument
ALTER TABLE public."CaseDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_document_rls ON public."CaseDocument";
CREATE POLICY case_document_rls ON public."CaseDocument"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."Case" c
      WHERE c.id = "CaseDocument"."caseId"
        AND public.user_belongs_to_firm(c."firmId")
    )
  );

-- CaseMembership
ALTER TABLE public."CaseMembership" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_membership_rls ON public."CaseMembership";
CREATE POLICY case_membership_rls ON public."CaseMembership"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."Case" c
      WHERE c.id = "CaseMembership"."caseId"
        AND public.user_belongs_to_firm(c."firmId")
    )
    OR "CaseMembership"."userId" = auth.uid()::text
  );

-- Invoice
ALTER TABLE public."Invoice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_rls ON public."Invoice";
CREATE POLICY invoice_rls ON public."Invoice"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."BillingAccount" ba
      WHERE ba.id = "Invoice"."billingAccountId"
        AND public.user_belongs_to_firm(ba."firmId")
    )
  );

-- InvoiceLineItem
ALTER TABLE public."InvoiceLineItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS line_item_rls ON public."InvoiceLineItem";
CREATE POLICY line_item_rls ON public."InvoiceLineItem"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."Invoice" i
      JOIN public."BillingAccount" ba ON ba.id = i."billingAccountId"
      WHERE i.id = "InvoiceLineItem"."invoiceId"
        AND public.user_belongs_to_firm(ba."firmId")
    )
  );

-- Notification
ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_rls ON public."Notification";
DROP POLICY IF EXISTS notification_update_rls ON public."Notification";
CREATE POLICY notification_rls ON public."Notification"
  FOR SELECT USING ("userId" = auth.uid()::text);
CREATE POLICY notification_update_rls ON public."Notification"
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- JobAssignment (live schema uses scopistId, not assigneeId)
ALTER TABLE public."JobAssignment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_assignment_rls ON public."JobAssignment";
CREATE POLICY job_assignment_rls ON public."JobAssignment"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = "JobAssignment"."jobId"::uuid
        AND (
          j.reporter_id = auth.uid()
          OR j.scopist_id = auth.uid()
          OR public.user_belongs_to_firm(j.firm_id::text)
        )
    )
    OR "JobAssignment"."scopistId" = auth.uid()::text
  );

-- AttorneyProfile
ALTER TABLE public."AttorneyProfile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attorney_profile_rls ON public."AttorneyProfile";
DROP POLICY IF EXISTS attorney_profile_update_rls ON public."AttorneyProfile";
CREATE POLICY attorney_profile_rls ON public."AttorneyProfile"
  FOR SELECT USING ("userId" = auth.uid()::text);
CREATE POLICY attorney_profile_update_rls ON public."AttorneyProfile"
  FOR UPDATE USING ("userId" = auth.uid()::text);

-- Exhibit
ALTER TABLE public."Exhibit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS exhibit_rls ON public."Exhibit";
CREATE POLICY exhibit_rls ON public."Exhibit"
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public."Case" c
      WHERE c.id = "Exhibit"."caseId"
        AND public.user_belongs_to_firm(c."firmId")
    )
  );

-- BillingAccount / BillingRate (live BillingRate is firm-scoped directly)
ALTER TABLE public."BillingAccount" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_account_rls ON public."BillingAccount";
CREATE POLICY billing_account_rls ON public."BillingAccount"
  FOR SELECT USING (public.user_belongs_to_firm("firmId"));

ALTER TABLE public."BillingRate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS billing_rate_rls ON public."BillingRate";
CREATE POLICY billing_rate_rls ON public."BillingRate"
  FOR SELECT USING (public.user_belongs_to_firm("firmId"));

-- Message (live schema has senderId only, plus jobId)
ALTER TABLE public."Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_rls ON public."Message";
CREATE POLICY message_rls ON public."Message"
  FOR SELECT USING (
    "senderId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.jobs j
      WHERE j.id = "Message"."jobId"::uuid
        AND (
          j.reporter_id = auth.uid()
          OR j.scopist_id = auth.uid()
          OR public.user_belongs_to_firm(j.firm_id::text)
        )
    )
  );

COMMIT;
