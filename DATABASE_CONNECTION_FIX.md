# Database Connection Troubleshooting Guide

## Current Status
Your `.env` file has been configured with:
- Direct connection format (for development)
- SSL mode enabled (`sslmode=require`)

## If You're Getting "Can't reach database server"

### Step 1: Verify Connection String in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ildhcfspbmhuemzgvzyx`
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Click the **URI** tab
6. **Toggle OFF** "Use connection pooler" (for direct connection)
7. Copy the exact string shown
8. Replace `[YOUR-PASSWORD]` with: `vK7rkgEyCJJzjR5x`

### Step 2: Check Database Status

In Supabase Dashboard:
- Go to **Settings** → **Database**
- Check if database is **paused** (free tier pauses after inactivity)
- If paused, click **Resume** or **Restore**

### Step 3: Try Connection Pooler Instead

If direct connection fails (port 5432 blocked), use the pooler:

```env
DATABASE_URL="postgresql://postgres.ildhcfspbmhuemzgvzyx:vK7rkgEyCJJzjR5x@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
```

**Note:** Pooler uses port **6543** instead of 5432, which often works better through firewalls.

### Step 4: Test Connection

Run the test script:
```bash
npx tsx scripts/test-db-connection.ts
```

Or test with Prisma:
```bash
npx prisma db push
```

### Step 5: Common Issues

#### Issue: "Tenant or user not found"
- **Cause:** Wrong connection string format
- **Fix:** Use the exact format from Supabase Dashboard

#### Issue: "Can't reach database server"
- **Cause:** Port 5432 blocked by firewall/network
- **Fix:** Use pooler connection (port 6543) instead

#### Issue: "Connection timeout"
- **Cause:** Database is paused (free tier)
- **Fix:** Resume database in Supabase Dashboard

#### Issue: "SSL connection required"
- **Cause:** Missing SSL parameter
- **Fix:** Add `?sslmode=require` to connection string

## Quick Fix Commands

### Switch to Pooler Connection:
```powershell
(Get-Content .env) -replace 'DATABASE_URL="postgresql://postgres:vK7rkgEyCJJzjR5x@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres\?sslmode=require"', 'DATABASE_URL="postgresql://postgres.ildhcfspbmhuemzgvzyx:vK7rkgEyCJJzjR5x@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"' | Set-Content .env
```

### Switch to Direct Connection:
```powershell
(Get-Content .env) -replace 'DATABASE_URL="postgresql://postgres.ildhcfspbmhuemzgvzyx:vK7rkgEyCJJzjR5x@aws-0-us-east-1.pooler.supabase.com:6543/postgres\?pgbouncer=true&sslmode=require"', 'DATABASE_URL="postgresql://postgres:vK7rkgEyCJJzjR5x@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"' | Set-Content .env
```

## After Fixing

1. **Stop your dev server** (Ctrl+C)
2. **Push schema:**
   ```bash
   npx prisma db push
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Still Having Issues?

1. Check Supabase project status in dashboard
2. Verify password is correct (try resetting in Supabase)
3. Check your network/firewall allows outbound connections
4. Try the pooler connection (port 6543) instead of direct (port 5432)

