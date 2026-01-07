# Depo-Pro Final Global Rule

You are working on Depo-Pro, a HIPAA-compliant legal transcription SaaS.

## 🚫 FINAL RULES (Violations are failures)

### 1. Never Bypass RLS
- **Never** use service role in UI flows
- **Never** bypass RLS policies
- **Always** use `createSupabaseServerClient()` for server routes
- **Always** respect RLS policies - admins are additive, not bypasses

### 2. Never Upgrade Next.js Beyond 15.0.3
- **Locked version:** `15.0.3` (exact, no caret, no tilde)
- **Never** upgrade to 16.x or beyond
- **Never** use experimental features
- **Always** run `npm run check:version` before committing

### 3. Never Expose PHI to Client
- **Never** log PHI (transcript content, personal info)
- **Never** send PHI to client without encryption
- **Always** log access to sensitive data (`transcript.viewed`, etc.)
- **Always** strip identifiers before AI calls

### 4. AI Output Must Be Auditable and Reversible
- **Never** overwrite transcripts directly with AI output
- **Always** store AI output as revisions (not applied)
- **Always** require explicit user approval before applying AI changes
- **Always** log all AI actions (`transcript.ai_review_requested`, etc.)

### 5. Admin Privileges Are Additive, Not Bypasses
- **Never** use service role for admin UI flows
- **Always** use `is_admin()` function in RLS policies
- **Always** check admin role with `requireAdmin()` helper
- **Always** maintain separate admin policies (additive to user policies)

### 6. If Unsure, STOP and Ask
- **Never** guess about security implications
- **Never** bypass established patterns
- **Always** verify with existing code patterns
- **Always** check documentation before implementing

## ✅ ALWAYS DO

1. **Use RLS First** - Always rely on RLS policies for access control
2. **Log Sensitive Actions** - Always log access to PHI and sensitive data
3. **Test Admin Access** - Always verify admin policies work correctly
4. **Strip PHI from Logs** - Never log transcript content or personal info
5. **Use Helper Functions** - Use `requireAdmin()`, `auditLog()`, etc.
6. **Follow Patterns** - Use existing code patterns for new features

## 🚨 VIOLATION EXAMPLES

### ❌ WRONG
```typescript
// Using service role in UI flow
const supabase = createServiceClient(); // ❌ NEVER DO THIS

// Bypassing RLS
const { data } = await supabase
  .from('transcripts')
  .select('*')
  .eq('id', id); // ❌ Missing RLS check

// Logging PHI
console.log('Transcript content:', transcript.content); // ❌ NEVER LOG PHI

// Upgrading Next.js
"next": "^16.0.0" // ❌ NEVER UPGRADE
```

### ✅ CORRECT
```typescript
// Using server client (RLS-enforced)
const supabase = await createSupabaseServerClient(); // ✅

// RLS automatically enforces access
const { data } = await supabase
  .from('transcripts')
  .select('*')
  .eq('id', id); // ✅ RLS enforces access

// Logging access, not content
await auditLog('transcript.viewed', { 
  entity: 'transcript', 
  entityId: transcriptId 
}); // ✅ Log access, not content

// Locked version
"next": "15.0.3" // ✅ Exact version
```

## 🔒 SECURITY PRINCIPLES

1. **RLS First** - Always use RLS for access control
2. **Audit Everything** - Log all sensitive data access
3. **Admin Additive** - Admins add permissions, don't bypass
4. **PHI Protection** - Never expose or log PHI
5. **Reversible AI** - All AI changes must be reviewable

## 📋 PATTERNS TO FOLLOW

### Admin Routes
```typescript
import { requireAdmin } from '@/lib/admin';

export async function GET() {
  await requireAdmin(); // ✅ Check admin access
  // ... admin logic
}
```

### Audit Logging
```typescript
import { audit } from '@/lib/audit';

await audit.transcriptViewed(transcriptId, {
  userId: user.id,
  timestamp: new Date().toISOString(),
}); // ✅ Log access
```

### RLS Policies
```sql
-- User can access own data
create policy "read own transcripts"
on transcripts for select
using (auth.uid() = created_by);

-- Admin can access all data (additive)
create policy "admins read all transcripts"
on transcripts for select
using (is_admin()); -- ✅ Admin is additive
```

---

**Status:** These rules are non-negotiable. Violations are failures.
