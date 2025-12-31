# Central Permission Helpers

Authoritative server-side permission checks for Phase 6A.

## Usage

```typescript
import { requireRole, requireAnyRole, assertEditableBeforeFinal } from '@/lib/auth/permissions';
import { getCurrentUser } from '@/lib/auth/session';

// In API routes
const user = await getCurrentUser();
if (!user) {
  return error('UNAUTHENTICATED', 'Authentication required', 401);
}

// Require specific role (throws if not)
requireRole(user.role, [UserRole.REPORTER]);

// Check if user has any allowed role (returns boolean)
if (!requireAnyRole(user.role, [UserRole.REPORTER, UserRole.SCOPIST])) {
  return error('FORBIDDEN', 'Access denied', 403);
}

// Assert transcript is editable
assertEditableBeforeFinal(jobStatus);
```

## Functions

### `requireRole(userRole, allowed)`
Throws `FORBIDDEN` error if user doesn't have required role.

### `requireAnyRole(userRole, allowed)`
Returns `boolean` - true if user has any of the allowed roles.

### `assertEditableBeforeFinal(jobStatus)`
Throws `TRANSCRIPT_FINALIZED` error if transcript is finalized.

**Note:** Currently checks `Job.status` since `Transcript` model doesn't have a `status` field yet. When `Transcript.status` is added, update this function to check it instead.