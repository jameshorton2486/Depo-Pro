# Next.js Version Information

## Current Version
**Next.js 16.1.1** (with Turbopack)

## Important Notes

### Next.js 16 vs 15
- **You're on Next.js 16.1.1** (not 15)
- Next.js 16 maintains the same async cookies API as Next.js 15
- All our Supabase client code is compatible with Next.js 16

### Environment Variables in Next.js 16

#### Client Components (`'use client'`)
- ✅ `process.env.NEXT_PUBLIC_*` variables work at runtime
- ✅ They are injected at build time
- ✅ Safe to use in browser code (they're public anyway)

#### Server Components / API Routes
- ✅ `process.env.*` variables work normally
- ✅ Use `await cookies()` for Next.js 15+ async API

### Supabase Client Usage

#### Browser Client (`lib/supabase/browser.ts` or `client.ts`)
```typescript
// ✅ CORRECT - Works in Next.js 16
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

#### Server Client (`lib/supabase/server.ts`)
```typescript
// ✅ CORRECT - Must await in Next.js 16
const supabase = await createSupabaseServerClient();
```

#### Middleware (`lib/supabase/middleware.ts`)
```typescript
// ✅ CORRECT - Edge runtime compatible
const { supabase, response } = await createSupabaseMiddlewareClient(request);
```

## Security Note

**NEVER hardcode credentials in code!**
- ❌ Hardcoded URLs/keys in source files
- ✅ Use `.env.local` for local development
- ✅ Use Vercel environment variables for production

## Verification

Your setup is correct for Next.js 16.1.1:
- ✅ Async cookies API (Next.js 15+ compatible)
- ✅ Environment variables work in client components
- ✅ Supabase clients properly configured
