# Database Connection Fix for Exhibit Schema Push

## Error Message
```
Error: P1001: Can't reach database server at `db.ildhcfspbmhuemzgvzyx.supabase.co:5432`
```

## Quick Fix Steps

### Step 1: Verify Your Connection String Format

Your `DATABASE_URL` should be in this format:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
```

**Important:**
- Replace `YOUR_PASSWORD` with your actual Supabase database password
- Include `?sslmode=require` at the end
- Use port `5432` (direct connection, not pooler)
- Keep quotes around the entire string

### Step 2: Get Your Connection String from Supabase

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Database Settings**
   - Click **Settings** (gear icon) → **Database**

3. **Copy Connection String**
   - Scroll to **"Connection string"** section
   - Click **"URI"** tab
   - **Toggle "Connection pooler" to OFF** (use direct connection)
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your actual password

4. **Add SSL Mode**
   - Add `?sslmode=require` to the end of the connection string

### Step 3: Update Your .env File

1. **Open `.env.local` or `.env`** in your project root

2. **Add or update `DATABASE_URL`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.ildhcfspbmhuemzgvzyx.supabase.co:5432/postgres?sslmode=require"
   ```

3. **Save the file**

### Step 4: Test Connection

Run:
```bash
npx prisma db push
```

**Expected Success Output:**
```
✅ Prisma schema loaded
✅ Database connection successful
✅ Schema pushed to database
```

### Step 5: If Still Failing - Check These

1. **Supabase Project Status**
   - Go to Supabase dashboard
   - Verify project is **active** (not paused)
   - Check if project needs to be resumed

2. **Database Password**
   - Go to Supabase → Settings → Database
   - Click **"Reset Database Password"** if needed
   - Update `.env.local` with new password

3. **Network/Firewall**
   - Check your internet connection
   - Verify you can access Supabase dashboard
   - Check if your IP needs to be whitelisted

4. **Connection String Format**
   - Must start with `postgresql://`
   - Must include password (not `[YOUR-PASSWORD]`)
   - Must end with `?sslmode=require`
   - Must use port `5432` (not `6543`)

## Alternative: Use Pooler Connection (If Direct Fails)

If direct connection doesn't work, try the pooler connection:

1. **In Supabase Dashboard:**
   - Settings → Database → Connection string
   - Toggle **"Connection pooler"** to **ON**
   - Copy the pooler connection string

2. **Format:**
   ```env
   DATABASE_URL="postgresql://postgres.ildhcfspbmhuemzgvzyx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

3. **Note:** Pooler uses port `6543` and includes `pgbouncer=true`

## After Successful Connection

Once `npx prisma db push` succeeds:

1. ✅ Your exhibit schema changes will be applied
2. ✅ New `Exhibit` model with `caseId` and nullable `jobId`
3. ✅ New `TranscriptAnnotationExhibit` junction table
4. ✅ All relations updated

Then you can proceed with testing the exhibit features!

