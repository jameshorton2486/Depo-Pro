# 🔧 Database Connection Fix - Final Checklist

## ✅ Root Cause Confirmed
- ❌ Using pooler connection (Prisma cannot use this)
- ❌ Wrong format: `postgres.xxx@pooler.supabase.com`
- ✅ Need: Direct connection `postgres@db.xxx.supabase.co:5432`

---

## 🎯 EXECUTION ORDER (Do Exactly This)

### Step 1: Get Correct Connection String from Supabase

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Project: `ildhcfspbmhuemzgvzyx`

2. **Check Project Status**
   - Must be **ACTIVE** (not paused)
   - If paused → Click "Resume"

3. **Get Direct Connection String**
   - Settings → Database
   - Scroll to **"Connection string"**
   - Click **"URI"** tab
   - **⚠️ CRITICAL: Toggle "Connection pooler" to OFF**
   - Copy the connection string

4. **Reset Database Password**
   - Same page: **"Database password"** section
   - Click **"Reset Database Password"**
   - **Copy the new password immediately** (you won't see it again)

5. **Build Correct Connection String**
   - Format: `postgresql://postgres:NEW_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require`
   - Replace `NEW_PASSWORD` with the password you just copied
   - **Must include `?sslmode=require`**

---

### Step 2: Update .env.local

1. **Open `.env.local`** in project root
   - If it doesn't exist, create it

2. **Add/Update DATABASE_URL:**
   ```env
   DATABASE_URL="postgresql://postgres:NEW_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
   ```

3. **Important:**
   - Use quotes around entire string
   - Port must be `5432` (NOT `6543`)
   - Must include `?sslmode=require`
   - No line breaks
   - No smart quotes

4. **Save the file**

5. **Restart your terminal** (to reload environment variables)

---

### Step 3: Quick Sanity Check

```powershell
node -e "require('dotenv').config({ path: '.env.local' }); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')"
```

**Expected:** `DATABASE_URL: SET`

If it says `NOT SET`:
- Check `.env.local` exists in project root
- Check file has `DATABASE_URL=` line
- Restart terminal

---

### Step 4: Test Raw Connection (No Prisma)

```powershell
npx tsx scripts/test-db-connection.ts
```

**Expected Success:**
```
✅ DATABASE_URL is set
✅ Database connected!
✅ Query successful: {"ok":1,"db_name":"postgres"}
✅ PostgreSQL version: PostgreSQL 15.x...
✅ All connection tests passed!
```

**If it fails:**
- The script will tell you exactly what's wrong
- Follow the error messages
- Common issues:
  - Wrong password → Reset in Supabase
  - Pooler format → Get direct connection string
  - Project paused → Resume in Supabase

---

### Step 5: Generate Prisma Client

**ONLY AFTER Step 4 passes:**

```powershell
npx prisma generate
```

**Expected Success:**
```
✅ Generated Prisma Client
```

---

### Step 6: Push Schema to Database

**ONLY AFTER Step 5 passes:**

```powershell
npx prisma db push
```

**Expected Success:**
```
✅ Prisma schema loaded
✅ Database connection successful
✅ Schema pushed to database
```

---

## ✅ Success Checklist

After completing all steps:

- [ ] `.env.local` has DATABASE_URL with correct format
- [ ] Connection string uses `db.xxx.supabase.co:5432` (NOT pooler)
- [ ] Connection string includes `?sslmode=require`
- [ ] `npx tsx scripts/test-db-connection.ts` passes
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma db push` succeeds
- [ ] No P1000 or P1001 errors

---

## 🚀 Once All Green

**You're ready for:**
- ✅ Review UI implementation
- ✅ Schema migrations
- ✅ Feature development

**Next:** Build the Review UI (audio player + synced transcript)

---

## 📝 Quick Reference

**Correct Format:**
```
postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres?sslmode=require
```

**Get It From:**
- Supabase Dashboard → Settings → Database → Connection string → URI
- **Connection pooler: OFF**
- Port: **5432** (NOT 6543)

