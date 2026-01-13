# Supabase Client Rules

## One Client Per Request Rule

**CRITICAL:** Never create multiple Supabase clients in the same request/component.

### Why This Matters

1. **Session Management**: Each client instance manages its own session state
2. **Cookie Conflicts**: Multiple clients can overwrite each other's cookies
3. **Performance**: Unnecessary client creation adds overhead
4. **Predictability**: Single client ensures consistent auth state

### Rules

#### ✅ DO: Use One Client Per Request

```tsx
// ✅ GOOD: Single client instance
'use client';

function MyComponent() {
  const supabase = getSupabaseBrowserClient();
  
  // Use the same instance throughout
  const { data } = await supabase.from('jobs').select('*');
  const { data: profile } = await supabase.from('profiles').select('*');
}
```

```ts
// ✅ GOOD: Server component - single client
export default async function ServerPage() {
  const supabase = await createSupabaseServerClient();
  
  // Use the same instance throughout
  const { data } = await supabase.from('jobs').select('*');
}
```

#### ❌ DON'T: Create Multiple Clients

```tsx
// ❌ BAD: Multiple client instances
function MyComponent() {
  const supabase1 = getSupabaseBrowserClient();
  const supabase2 = getSupabaseBrowserClient(); // ❌ Don't do this!
  
  // These may have different session states
}
```

```ts
// ❌ BAD: Creating client in loops or multiple times
async function fetchData() {
  for (const id of ids) {
    const supabase = getSupabaseBrowserClient(); // ❌ New client each iteration
    await supabase.from('jobs').select('*').eq('id', id);
  }
}
```

### Client Types

#### Browser Client (`lib/supabase/browser.ts`)
- **Use in**: Client components only
- **Key**: Anon key only
- **Session**: Managed via cookies automatically
- **Example**: `const supabase = getSupabaseBrowserClient();`

#### Server Client (`lib/supabase/server.ts`)
- **Use in**: Server components, API routes
- **Key**: Anon key
- **Session**: Reads from cookies
- **Example**: `const supabase = await createSupabaseServerClient();`

#### Admin Client (`lib/supabase/admin.ts`)
- **Use in**: Server-only (admin operations, cron jobs)
- **Key**: Service role key
- **Session**: No session (bypasses RLS)
- **Example**: `const supabase = getSupabaseAdmin();`
- **⚠️ Never use for user login/auth**

### Best Practices

1. **Create client once at component/function top level**
2. **Pass client as parameter if needed in helper functions**
3. **Use React hooks for client components** (useAuth hook handles this)
4. **Never create clients in loops or conditionals**

### Example: Proper Client Usage

```tsx
// ✅ GOOD: Client component with hook
'use client';

import { useAuth } from '@/hooks/use-auth';

function Dashboard() {
  const { user, profile, isLoading } = useAuth();
  // useAuth internally manages a single client instance
}
```

```ts
// ✅ GOOD: Server component
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function JobsPage() {
  const supabase = await createSupabaseServerClient();
  
  // Single client used for all operations
  const { data: jobs } = await supabase.from('jobs').select('*');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id);
  
  return <JobsList jobs={jobs} />;
}
```

```ts
// ✅ GOOD: API route
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  
  // Single client for the entire request
  const { data, error } = await supabase.from('jobs').select('*');
  
  return Response.json(data);
}
```

### Migration Checklist

- [ ] Replace all `createSupabaseBrowserClient()` with `getSupabaseBrowserClient()`
- [ ] Ensure only one client per component/function
- [ ] Remove client creation from loops
- [ ] Use `useAuth()` hook in client components instead of manual client creation
- [ ] Verify no client creation in conditionals
