# Environment Variables Setup

## ✅ Correct Setup

Environment variables should be stored in `.env.local` file (not in PowerShell session).

### Required Variables

Create or update `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### How It Works

1. **`.env.local`** - Local development (git-ignored)
2. **`.env.example`** - Template for other developers (committed to git)
3. **Vercel Dashboard** - Production environment variables

### Next.js 16 Behavior

- ✅ `NEXT_PUBLIC_*` variables are automatically exposed to client
- ✅ No need to list them in `next.config.ts` `env: {}`
- ✅ They're injected at build time
- ✅ Available in both server and client code

### Verification

After setting up `.env.local`:

```bash
# Restart dev server to pick up new env vars
npm run dev
```

The Supabase clients will automatically read from `.env.local`.

## 🚨 Security Notes

- ✅ `.env.local` is git-ignored (safe for secrets)
- ❌ Never commit `.env.local` to git
- ✅ Use Vercel environment variables for production
- ❌ Never hardcode credentials in source files

## Current Status

Your code correctly reads from `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Just make sure `.env.local` exists with these values!
