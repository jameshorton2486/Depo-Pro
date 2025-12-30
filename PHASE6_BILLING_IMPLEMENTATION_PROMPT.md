# DEPO-PRO PHASE 6: BILLING & TIME TRACKING SYSTEM

## COMPLETE CURSOR AI IMPLEMENTATION PROMPT

**Execution Mode:** Autonomous  
**Estimated Time:** 2-4 hours  
**Risk Level:** LOW (parallel system, no core modifications)  
**Prerequisites:** Working Depo-Pro MVP with authentication and job management

---

## 🎯 MISSION OBJECTIVE

You are a senior SaaS billing architect. Your mission is to implement a complete, production-grade billing and time tracking system for Depo-Pro, a legal transcription SaaS platform.

**Critical Success Criteria:**
- ✅ Zero modifications to existing job, calendar, or transcript logic
- ✅ All billing data is immutable once invoiced
- ✅ Complete tenant isolation (no cross-tenant data leakage)
- ✅ Stripe-compatible invoice generation
- ✅ Full audit trail for compliance
- ✅ TypeScript strict mode compliance
- ✅ All tests passing

---

## 📋 EXECUTION CHECKLIST

Complete these steps in exact order. Do not skip steps. Verify each step before proceeding.

```
□ Step 1: Environment verification
□ Step 2: Prisma schema additions
□ Step 3: Generate and apply migration
□ Step 4: Create billing types and constants
□ Step 5: Implement Stripe client configuration
□ Step 6: Implement usage tracking service
□ Step 7: Implement billing rate service
□ Step 8: Implement invoice builder service
□ Step 9: Create Stripe webhook handlers
□ Step 10: Create billing API routes
□ Step 11: Create billing UI components
□ Step 12: Create billing dashboard page
□ Step 13: Add feature flag
□ Step 14: Run validation suite
□ Step 15: Document completion
```

---

## 🔐 SAFETY RULES (NON-NEGOTIABLE)

```typescript
// NEVER DO THESE THINGS:
❌ Modify existing Job, Transcript, or Calendar models
❌ Delete or UPDATE invoice records after finalization
❌ Delete usage records (append-only)
❌ Allow cross-tenant billing queries
❌ Store Stripe API keys in code
❌ Recalculate historical invoices
❌ Use Stripe subscriptions (invoices only)
❌ Skip tenant isolation checks

// ALWAYS DO THESE THINGS:
✅ Snapshot billing rates at invoice time
✅ Include tenantId in ALL billing queries
✅ Log all billing mutations
✅ Verify webhook signatures
✅ Use cents for all monetary values
✅ Version billing rates (never update in place)
✅ Link usage records to invoice line items
```

---

*[Full implementation details continue in the original prompt - this file serves as a reference document]*

---

**Note:** This Phase 6 implementation should be executed AFTER Phase 5 stabilization is complete.

