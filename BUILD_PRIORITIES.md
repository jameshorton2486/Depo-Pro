# 🎯 Build Priorities

**Status:** Architecture Complete - Ready for Feature Development  
**Date:** January 2025

---

## 🟢 TIER 1 — High ROI / Low Risk

**Build these first** - Maximum impact with minimal risk.

### Admin Dashboards
- **Job throughput** - Visualize jobs created, completed, in-progress
- **Reporter utilization** - Track reporter workload and availability
- **System health** - Monitor errors, performance, usage metrics

**Impact:** High visibility, helps identify bottlenecks  
**Risk:** Low - Read-only dashboards  
**Effort:** Medium (2-3 days)

### Transcript Editor Polish
- **Lock state indicators** - Show when transcript is locked/finalized
- **Save status feedback** - Real-time save status (saving, saved, error)
- **Auto-save** - Automatic saving of edits
- **Conflict resolution** - Handle concurrent edits gracefully

**Impact:** Critical UX improvement  
**Risk:** Low - UI enhancements only  
**Effort:** Medium (3-5 days)

### Calendar UX
- **Conflict previews** - Show conflicts before scheduling
- **Drag-reschedule feedback** - Visual feedback during drag operations
- **Availability indicators** - Show reporter availability
- **Recurring events** - Support for recurring depositions

**Impact:** High - Core scheduling feature  
**Risk:** Medium - Complex interactions  
**Effort:** High (5-7 days)

---

## 🟡 TIER 2 — Power Features

**After stability** - Enhance functionality once core is solid.

### AI Review Transparency
- **Show what AI changed** - Highlight AI-suggested corrections
- **Confidence scores** - Display confidence levels for flagged words
- **Review workflow** - Streamlined review and approval process
- **Bulk actions** - Accept/reject multiple AI suggestions

**Impact:** High - Differentiates product  
**Risk:** Medium - AI integration complexity  
**Effort:** High (7-10 days)

### Export Pipelines
- **DOCX presets** - Pre-configured DOCX export formats
- **PDF presets** - Pre-configured PDF export formats
- **Custom templates** - User-defined export templates
- **Batch export** - Export multiple transcripts at once

**Impact:** Medium - Power user feature  
**Risk:** Low - Extends existing export  
**Effort:** Medium (4-6 days)

### Notifications
- **Assignment notifications** - Alert on job assignment
- **Status change notifications** - Alert on job/transcript status changes
- **Email notifications** - Email alerts for important events
- **In-app notifications** - Real-time in-app notification center

**Impact:** High - Improves user engagement  
**Risk:** Medium - Notification delivery reliability  
**Effort:** High (5-7 days)

---

## 🔵 TIER 3 — Scale & Differentiation

**When ready** - Advanced features for scale and competitive advantage.

### Analytics
- **Turnaround time** - Track average time from job creation to completion
- **Error rates** - Monitor transcription accuracy and error rates
- **Usage patterns** - Analyze user behavior and feature usage
- **Performance metrics** - Track system performance and bottlenecks

**Impact:** High - Data-driven insights  
**Risk:** Low - Analytics are read-only  
**Effort:** High (7-10 days)

### Firm-Level Configuration
- **Custom workflows** - Firm-specific job workflows
- **Branding** - Custom branding for firm exports
- **Integration settings** - Firm-level third-party integrations
- **Billing settings** - Firm-level billing and subscription management

**Impact:** Medium - Enterprise feature  
**Risk:** Medium - Complex configuration  
**Effort:** High (10-14 days)

### Advanced Permissions
- **Role-based access control** - Fine-grained permissions
- **Delegation** - Allow users to delegate access
- **Audit trails** - Comprehensive audit logging
- **Compliance** - HIPAA, SOC 2 compliance features

**Impact:** High - Enterprise requirement  
**Risk:** High - Security critical  
**Effort:** Very High (14-21 days)

---

## 📋 Feature Development Checklist

For each feature, follow this checklist:

### Before Development
- [ ] Identify which query file(s) are needed
- [ ] Check if RLS policies exist or need creation
- [ ] Design API route structure
- [ ] Plan UI component structure
- [ ] Estimate effort and risk

### During Development
- [ ] Create/update query functions in `lib/supabase/queries/*`
- [ ] Create/update API routes in `app/api/*`
- [ ] Create/update UI components
- [ ] Map snake_case → camelCase in responses
- [ ] Add proper error handling
- [ ] Add loading states

### Before Commit
- [ ] Run `npm run lint` - Must pass
- [ ] Run `npm run typecheck` - Must pass
- [ ] Run `npm run dev` - Must start without errors
- [ ] Test manually - Verify functionality
- [ ] Verify no Prisma references introduced
- [ ] Verify no direct `.from()` calls in routes

---

## 🎯 Quick Start Guide

### Adding a New Feature

1. **Create Query Functions**
   ```typescript
   // lib/supabase/queries/<domain>.ts
   export async function getResourceById(
     supabase: SupabaseClient,
     resourceId: string
   ) {
     // Query logic here
   }
   ```

2. **Create API Route**
   ```typescript
   // app/api/<resource>/[id]/route.ts
   export async function GET(request: NextRequest, { params }) {
     const supabase = await createSupabaseServerClient();
     const resource = await getResourceById(supabase, id);
     return NextResponse.json(resource);
   }
   ```

3. **Create UI Component**
   ```typescript
   // app/(dashboard)/<resource>/page.tsx
   const resource = await fetch(`/api/${resource}/${id}`).then(r => r.json());
   // Use camelCase data
   ```

4. **Verify**
   ```bash
   npm run lint && npm run typecheck && npm run dev
   ```

---

## 🚫 What NOT to Build Yet

**Avoid these until architecture is fully stable:**

- ❌ Complex multi-table transactions (use RPC functions instead)
- ❌ Real-time subscriptions (add after core features)
- ❌ Advanced search/elasticsearch (add after basic search works)
- ❌ Mobile apps (focus on web first)
- ❌ Third-party integrations (stabilize core first)

---

## ✅ Success Criteria

A feature is "done" when:

- ✅ All database access through query layer
- ✅ No Prisma references
- ✅ No direct Supabase in routes
- ✅ Proper error handling
- ✅ TypeScript types are explicit
- ✅ Lint and typecheck pass
- ✅ Manual testing confirms functionality
- ✅ RLS policies protect data (if applicable)

---

**Current Status:** ✅ Architecture Finalized  
**Build Mode:** ✅ Active  
**Next Feature:** Choose from Tier 1 priorities
