# 🔍 Debugging Supabase Client (CORRECT WAY)

## ❌ WRONG: Don't Do This in Client Components

```typescript
// ❌ THIS WILL CRASH IN CLIENT COMPONENTS
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

**Why it fails:**
- `process.env` is **NOT** available in browser runtime
- You'll get: `Uncaught ReferenceError: process is not defined`
- This breaks your entire app

## ✅ CORRECT: How to Verify Supabase Client

### Option 1: Check the Client Works (Recommended)

```typescript
'use client';

import { supabase } from '@/utils/supabase/client';

// In your component or browser console:
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data);
console.log('Error:', error);

// Or check if client is initialized:
console.log('Supabase client:', supabase);
console.log('Supabase URL:', supabase.supabaseUrl); // This works!
```

### Option 2: Verify Build-Time Values (Server-Only)

Create a server-only debug route:

```typescript
// app/api/debug/env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
    // Don't log the actual key!
  });
}
```

Then visit: `http://localhost:3000/api/debug/env`

### Option 3: Check Network Tab

1. Open DevTools → Network tab
2. Try to login
3. Look for request to: `https://[project].supabase.co/auth/v1/token`
4. If you see it → client is working
5. If you don't → client isn't initialized

## 🎯 Why This Happens

### Build-Time vs Runtime

```typescript
// utils/supabase/client.ts
// ✅ THIS IS CORRECT - evaluated at BUILD TIME
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // ← Replaced at build time
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // ← Replaced at build time
);
```

When Next.js builds:
1. Reads `process.env.NEXT_PUBLIC_SUPABASE_URL`
2. Replaces it with the actual value
3. Bundles the result into client code
4. At runtime, `process.env` doesn't exist - the values are already inlined

### What Gets Sent to Browser

After build, the client code looks like:
```javascript
// What actually runs in browser:
export const supabase = createBrowserClient(
  "https://ildhcfspbmhuemzgvzyx.supabase.co",  // ← Actual value
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // ← Actual value
);
```

## ✅ Quick Verification Test

Run this in browser console (after page loads):

```javascript
// Import the client (if using module system)
// Or just check if Supabase is working:
const test = async () => {
  const { supabase } = await import('/utils/supabase/client');
  const { data, error } = await supabase.auth.getSession();
  console.log('✅ Client works:', !error);
  console.log('Session:', data?.session ? 'Has session' : 'No session');
};

test();
```

## 🚨 If You See "process is not defined"

1. **Remove all `process.env` from client components**
2. **Check `utils/supabase/client.ts` is correct** (it is)
3. **Restart dev server** (`npm run dev`)
4. **Clear browser cache** (hard refresh: Ctrl+Shift+R)

## 📝 Summary

- ✅ `process.env` in `utils/supabase/client.ts` = OK (build time)
- ❌ `process.env` in client components = CRASHES
- ✅ Use `supabase.supabaseUrl` to check URL at runtime
- ✅ Use Network tab to verify API calls
- ✅ Use `supabase.auth.getSession()` to test client
