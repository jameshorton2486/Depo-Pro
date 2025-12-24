# Database Connection Fix - Step-by-Step Guide

## 🎯 Goal
Get `npx prisma db push` to succeed cleanly.

## ⚠️ Prerequisites
- Supabase account and project
- Access to Supabase Dashboard
- `.env.local` file in project root (or `.env`)

---

## Step 1: Get Correct Connection String from Supabase

### 1.1 Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project (or create one if needed)

### 1.2 Navigate to Database Settings
1. Click **Settings** (gear icon in left sidebar)
2. Click **Database** in settings menu

### 1.3 Get Direct Connection String
1. Scroll to **"Connection string"** section
2. Click the **"URI"** tab (not "JDBC" or "Golang")
3. **⚠️ CRITICAL:** Toggle **"Connection pooler"** to **OFF**
   - This ensures you get port 5432 (direct), not 6543 (pooler)
4. Copy the connection string
   - It should look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres
     ```

### 1.4 Replace Password Placeholder
- If you see `[YOUR-PASSWORD]`, you need to:
  1. Click **"Reset Database Password"** button
  2. Copy the new password immediately (you won't see it again)
  3. Replace `[YOUR-PASSWORD]` in the connection string

### 1.5 Add SSL Mode
- Add `?sslmode=require` to the end of the connection string
- Final format:
  ```
  postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require
  ```

---

## Step 2: Update .env.local

### 2.1 Locate .env.local
- File should be in project root: `C:\Users\james\depo-pro\.env.local`
- If it doesn't exist, create it

### 2.2 Add/Update DATABASE_URL
```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
```

**Important:**
- Use quotes around the entire string
- Replace `YOUR_ACTUAL_PASSWORD` with your real password
- Replace `ildhcfspbmhuemzgvzyx` with your actual project ID
- Port must be `5432` (NOT `6543`)
- Must include `?sslmode=require` at the end

### 2.3 Verify .env.local is in .gitignore
- Check that `.env.local` is listed in `.gitignore`
- Never commit this file to Git

---

## Step 3: Test Connection

### 3.1 Run Test Script
```powershell
npx tsx scripts/test-db-connection.ts
```

**Expected Success:**
```
✅ DATABASE_URL is set
✅ Connection successful!
✅ Query test successful
✅ Connected to database: postgres
✅ Schema appears to be in sync
✅ All connection tests passed!
```

**If it fails:**
- The script will tell you exactly what's wrong
- Follow the error messages

### 3.2 If Test Passes, Push Schema
```powershell
npx prisma db push
```

**Expected Success:**
```
✅ Prisma schema loaded
✅ Database connection successful
✅ Schema pushed to database
```

### 3.3 Generate Prisma Client
```powershell
npx prisma generate
```

**Expected Success:**
```
✅ Generated Prisma Client
```

---

## 🔍 Common Issues & Fixes

### Issue 1: "Can't reach database server" (P1001)

**Causes:**
- Wrong connection string format
- Supabase project is paused
- Network/firewall blocking

**Fixes:**
1. **Verify connection string:**
   - ✅ Correct: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require`
   - ❌ Wrong: `postgresql://postgres.xxx:PASSWORD@pooler.supabase.com:6543/postgres`

2. **Check Supabase project status:**
   - Dashboard → Project → Check if "Paused"
   - Click "Resume" if paused

3. **Try different network:**
   - Disable VPN
   - Try home network vs corporate
   - Try mobile hotspot

### Issue 2: "Authentication failed" (P1000)

**Causes:**
- Wrong password
- Password contains special characters that need URL encoding

**Fixes:**
1. Reset database password:
   - Supabase → Settings → Database → Reset Database Password
   - Copy new password immediately
   - Update `.env.local`

2. If password has special characters:
   - URL-encode them (e.g., `@` becomes `%40`)
   - Or reset to a simpler password

### Issue 3: "Connection pooler" error

**Cause:**
- Using pooler connection (port 6543) instead of direct (port 5432)

**Fix:**
- Get connection string with pooler **OFF**
- Must use port `5432`

---

## ✅ Success Checklist

After completing all steps, verify:

- [ ] `npx tsx scripts/test-db-connection.ts` passes
- [ ] `npx prisma db push` succeeds
- [ ] `npx prisma generate` succeeds
- [ ] No P1001 or P1000 errors
- [ ] Can query database (test with `npx prisma studio`)

---

## 🚀 Next Steps (After DB is Fixed)

1. **Verify schema is in sync:**
   ```powershell
   npx prisma studio
   ```
   - Should open browser with database tables

2. **Create migration script** (for existing data):
   - Assign `firmId` to existing users
   - Create `CaseMembership` records

3. **Build Review UI** (now safe to do)

---

## 📞 Still Stuck?

If you're still getting errors after following this guide:

1. **Check Supabase project status:**
   - Dashboard → Project → Status
   - Ensure it's "Active" (not paused)

2. **Verify connection string format:**
   - Run: `npx tsx scripts/test-db-connection.ts`
   - It will show exactly what's wrong

3. **Check network:**
   - Try from different network
   - Check if corporate firewall is blocking

4. **Reset everything:**
   - Reset database password
   - Get fresh connection string
   - Update `.env.local`

---

**Once this is green, you're ready to build the Review UI! 🎉**

