# Database Connection Fix Guide

## Problem
```
Error: P1000: Authentication failed against database server, 
the provided database credentials for `postgres` are not valid.
```

## Solution

### Step 1: Get Correct Connection String from Supabase

1. **Go to Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Select project: `ildhcfspbmhuemzgvzyx`

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon in left sidebar)
   - Click **Database** in the settings menu

3. **Get Connection String**
   - Scroll to **"Connection string"** section
   - Click **"URI"** tab (not "JDBC" or "Golang")
   - **IMPORTANT:** Toggle **"Connection pooler"** to **OFF**
   - Copy the connection string

4. **Expected Format**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require
   ```

### Step 2: Update .env.local

1. **Open `.env.local` file** in your project root

2. **Find or add `DATABASE_URL` line**

3. **Replace with your connection string:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
   ```

4. **Important Notes:**
   - Use **direct connection** (port `5432`), NOT pooler (port `6543`)
   - Include `?sslmode=require` at the end
   - Replace `YOUR_ACTUAL_PASSWORD` with your Supabase database password
   - Keep the quotes around the connection string

### Step 3: Verify Connection

Run this command to test the connection:

```bash
npx prisma db push
```

**Expected Output:**
```
✅ Database connection successful
✅ Schema pushed to database
```

**If you see errors:**
- Check that password is correct
- Verify connection string format
- Ensure SSL mode is included
- Try resetting your Supabase database password if needed

### Step 4: Verify in Application

Start the dev server:

```bash
npm run dev
```

Check for database errors in the console. You should see:
- ✅ No database connection errors
- ✅ Application starts successfully
- ✅ Can log in and access dashboards

## Common Issues

### Issue: "Tenant or user not found"
**Solution:** Connection string format is wrong. Use direct connection (port 5432), not pooler.

### Issue: "SSL connection required"
**Solution:** Add `?sslmode=require` to the end of your connection string.

### Issue: "Password authentication failed"
**Solution:** 
1. Verify password in Supabase dashboard
2. Reset database password if needed: Settings → Database → Reset Database Password
3. Update `.env.local` with new password

### Issue: "Can't reach database server"
**Solution:**
1. Check internet connection
2. Verify Supabase project is active
3. Check if IP is whitelisted (Settings → Database → Connection Pooling → Allowed IPs)

## Quick Reference

**Direct Connection (Recommended for Development):**
```
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require
```

**Pooler Connection (For Production/Vercel):**
```
postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**For MVP, use DIRECT connection.**

## After Fixing

Once the connection works:

1. ✅ Run `npx prisma db push` - should succeed
2. ✅ Run `npm run dev` - should start without database errors
3. ✅ Test login - should work
4. ✅ Proceed to Phase 8 (E2E Testing)

---

**Need Help?** If you're still having issues, check:
- Supabase project status (not paused)
- Database password is correct
- Connection string format matches exactly
- `.env.local` file is in project root (not `.env`)

