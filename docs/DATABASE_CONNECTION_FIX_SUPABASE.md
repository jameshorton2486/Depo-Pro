# Database Connection Fix - Supabase P1001 Error

## Error Message
```
Error: P1001: Can't reach database server at `db.ildhcfspbmhuemzgvzyx.supabase.co:5432`
```

## ✅ IMMEDIATE FIX CHECKLIST

### Step 1: Get Correct Connection String from Supabase

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon) → **Database**

3. **Get Direct Connection String**
   - Scroll to **"Connection string"** section
   - Click **"URI"** tab
   - **⚠️ CRITICAL: Toggle "Connection pooler" to OFF**
   - Copy the connection string
   - It should look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres
     ```

4. **Replace Password**
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - If you don't know it: Settings → Database → Reset Database Password

5. **Add SSL Mode**
   - Add `?sslmode=require` to the end:
     ```
     postgresql://postgres:YOUR_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require
     ```

### Step 2: Update .env.local

1. **Open `.env.local`** in your project root

2. **Add or update `DATABASE_URL`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
   ```

3. **Important:**
   - Use quotes around the entire string
   - Use port `5432` (NOT `6543` - that's the pooler)
   - Include `?sslmode=require` at the end
   - Replace `YOUR_ACTUAL_PASSWORD` with real password

### Step 3: Verify Connection

```bash
npx prisma db push
```

**Expected Success:**
```
✅ Prisma schema loaded
✅ Database connection successful
✅ Schema pushed to database
```

## 🔍 COMMON ISSUES

### Issue 1: Wrong URL Type

**❌ Wrong (Pooler):**
```
postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**✅ Correct (Direct):**
```
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require
```

**Why:** Prisma cannot use the pooler connection. You MUST use direct connection (port 5432).

### Issue 2: Supabase Project Paused

**Check:**
- Supabase Dashboard → Project → Status
- Free tiers auto-pause after inactivity
- Click "Resume" if paused

### Issue 3: Missing SSL Mode

**Add to connection string:**
```
?sslmode=require
```

### Issue 4: Wrong Password

**Reset:**
- Supabase → Settings → Database → Reset Database Password
- Update `.env.local` with new password

### Issue 5: Network/Firewall

**If on VPN or corporate network:**
- Try home network
- Try mobile hotspot
- Check if IP needs whitelisting in Supabase

## 🧪 TEST CONNECTION

After updating `.env.local`, test:

```bash
# Test Prisma connection
npx prisma db push

# If successful, generate client
npx prisma generate
```

## 📝 QUICK REFERENCE

**Direct Connection (For Prisma):**
```
postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres?sslmode=require
```

**Pooler Connection (For Production/Vercel - NOT for Prisma):**
```
postgresql://postgres.xxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

**For MVP/Development:** Always use direct connection.

