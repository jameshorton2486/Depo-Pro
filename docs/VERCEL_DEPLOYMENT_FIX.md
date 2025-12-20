# Vercel Deployment Fix - DATABASE_URL Error

## Problem

```
Failed to load config file "/vercel/path0" as a TypeScript/JavaScript module. 
Error: PrismaConfigEnvError: Missing required environment variable: DATABASE_URL
```

**Root Cause:** The `postinstall` script runs `prisma generate`, which requires `DATABASE_URL` to be set, but it's not configured in Vercel.

## Solution

### Step 1: Add DATABASE_URL to Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project: `depo-pro`

2. **Open Settings**
   - Click **Settings** tab
   - Click **Environment Variables** in the left sidebar

3. **Add DATABASE_URL**
   - Click **Add New**
   - **Name:** `DATABASE_URL`
   - **Value:** Your Supabase connection string
   - **Environment:** Select all (Production, Preview, Development)

4. **Connection String Format for Vercel (Use Pooler)**
   ```
   postgresql://postgres.ildhcfspbmhuemzgvzyx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```
   
   **OR use direct connection:**
   ```
   postgresql://postgres:PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require
   ```

   **Important:**
   - Replace `PASSWORD` with your actual Supabase database password
   - For Vercel, pooler connection (port 6543) is recommended for better performance
   - Include `?sslmode=require` or `&sslmode=require` (depending on format)

### Step 2: Get Connection String from Supabase

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx/settings/database

2. **For Vercel (Recommended: Pooler)**
   - Scroll to "Connection string"
   - Click "URI" tab
   - Toggle "Connection pooler" to **ON**
   - Copy the connection string
   - Format: `postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

3. **For Direct Connection (Alternative)**
   - Toggle "Connection pooler" to **OFF**
   - Copy the connection string
   - Format: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require`

### Step 3: Add Other Required Environment Variables

While you're in Vercel Environment Variables, also add:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your Vercel app URL | `https://depo-pro.vercel.app` (or your custom domain) |
| `DEEPGRAM_API_KEY` | Deepgram API key | Deepgram Console |
| `ANTHROPIC_API_KEY` | Claude API key | Anthropic Console |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard |

### Step 4: Redeploy

After adding environment variables:

1. **Trigger New Deployment**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - OR push a new commit to trigger automatic deployment

2. **Verify Build**
   - Watch the build logs
   - Should see: `✅ prisma generate` succeed
   - Should see: `✅ Build completed successfully`

## Alternative: Make DATABASE_URL Optional During Build

If you want to make the build more resilient, you can modify `prisma.config.ts`:

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL', { default: 'postgresql://placeholder' }),
  },
});
```

**However, this is NOT recommended** because:
- Prisma needs the actual schema to generate correct types
- Better to set environment variables properly

## Quick Checklist

- [ ] Added `DATABASE_URL` to Vercel environment variables
- [ ] Added `NEXTAUTH_SECRET` to Vercel
- [ ] Added `NEXTAUTH_URL` to Vercel
- [ ] Added all API keys (Deepgram, Anthropic, Supabase)
- [ ] Triggered new deployment
- [ ] Build succeeds
- [ ] Application loads without errors

## Troubleshooting

### Build Still Fails

1. **Check Environment Variables**
   - Verify all variables are set in Vercel
   - Check that values don't have extra spaces
   - Ensure quotes are not included in the value

2. **Check Connection String Format**
   - Pooler: Must include `?pgbouncer=true`
   - Direct: Must include `?sslmode=require`
   - Password must be URL-encoded if it contains special characters

3. **Check Prisma Logs**
   - Look for specific error messages
   - Verify Prisma can connect to database

### Runtime Errors

If build succeeds but app fails at runtime:

1. **Check Vercel Function Logs**
   - Go to **Deployments** → **Functions** tab
   - Check for database connection errors

2. **Verify Database Access**
   - Ensure Supabase allows connections from Vercel IPs
   - Check Supabase project is not paused

3. **Test Connection**
   - Use the test script: `npx tsx scripts/test-db-connection.ts`
   - Verify connection string works locally first

## Production vs Development

**Development (.env.local):**
- Use direct connection (port 5432)
- Format: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require`

**Production (Vercel):**
- Use pooler connection (port 6543) - recommended
- Format: `postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
- OR use direct connection if pooler causes issues

---

**After fixing, your deployment should succeed!** 🎉

