# 🔴 IMMEDIATE ACTION REQUIRED - Database Connection Fix

## Current Status
- ✅ Prisma config is correct
- ✅ Schema is correct  
- ❌ **DATABASE_URL authentication failing (P1000)**
- ⚠️ DATABASE_URL may be in wrong file or has wrong password

---

## 🎯 STEP-BY-STEP FIX (Do This Now)

### Step 1: Check Which .env File Has DATABASE_URL

Run these commands to see where DATABASE_URL is:

```powershell
# Check .env
if (Test-Path .env) { Get-Content .env | Select-String "DATABASE_URL" }

# Check .env.local  
if (Test-Path .env.local) { Get-Content .env.local | Select-String "DATABASE_URL" }
```

**You need DATABASE_URL in `.env.local`** (Next.js loads this first)

---

### Step 2: Get Fresh Connection String from Supabase

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Check Project Status**
   - Make sure project is **ACTIVE** (not paused)
   - If paused, click "Resume"

3. **Get Connection String**
   - Settings → Database
   - Scroll to **"Connection string"**
   - Click **"URI"** tab
   - **⚠️ Toggle "Connection pooler" to OFF**
   - Copy the connection string

4. **Reset Password (If Needed)**
   - Same page: **"Database password"** section
   - Click **"Reset Database Password"**
   - **Copy the new password immediately** (you won't see it again)

5. **Build Correct Connection String**
   - Format: `postgresql://postgres:NEW_PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require`
   - Replace `NEW_PASSWORD` with actual password
   - Replace `xxx` with your project ID
   - **Must include `?sslmode=require`**

---

### Step 3: Update .env.local

1. **Open `.env.local`** in project root
   - If it doesn't exist, create it

2. **Add/Update DATABASE_URL:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres?sslmode=require"
   ```

3. **Important:**
   - Use quotes around entire string
   - Port must be `5432` (NOT `6543`)
   - Must include `?sslmode=require`
   - No line breaks
   - No smart quotes

4. **Save the file**

---

### Step 4: Verify Environment Variable is Loaded

```powershell
node -e "require('dotenv').config({ path: '.env.local' }); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')"
```

**Expected:** `DATABASE_URL: SET`

---

### Step 5: Test Connection

```powershell
npx tsx scripts/test-db-connection.ts
```

**Expected Success:**
```
✅ DATABASE_URL is set
✅ Connection successful!
✅ Query test successful
✅ All connection tests passed!
```

---

### Step 6: If Test Passes, Push Schema

```powershell
npx prisma db push
```

**Expected Success:**
```
✅ Prisma schema loaded
✅ Database connection successful
✅ Schema pushed to database
```

Then:

```powershell
npx prisma generate
```

---

## 🔍 Common Issues

### Issue: "DATABASE_URL: NOT SET"

**Fix:**
- Ensure `.env.local` exists in project root
- Ensure `DATABASE_URL=` line is in `.env.local`
- Restart terminal after updating `.env.local`

### Issue: "Authentication failed" (P1000)

**Fix:**
- Reset Supabase database password
- Update `.env.local` with new password
- Ensure password doesn't have unencoded special characters

### Issue: "Can't reach database server" (P1001)

**Fix:**
- Verify connection string uses `db.xxx.supabase.co:5432` (NOT pooler)
- Check Supabase project is not paused
- Try different network (disable VPN)

---

## ✅ Success Checklist

After completing all steps:

- [ ] `npx tsx scripts/test-db-connection.ts` passes
- [ ] `npx prisma db push` succeeds  
- [ ] `npx prisma generate` succeeds
- [ ] No P1000 or P1001 errors

**Once all checkboxes are green, you're ready to build the Review UI! 🎉**

---

## 📝 Quick Reference

**Correct Connection String Format:**
```
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres?sslmode=require
```

**Get It From:**
- Supabase Dashboard → Settings → Database → Connection string → URI
- **Connection pooler: OFF**
- Port: **5432** (NOT 6543)

