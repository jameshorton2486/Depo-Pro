# 🔧 Depo-Pro Deployment Troubleshooting Guide

**Quick Reference:** Common issues and their solutions

---

## 🚨 CRITICAL ERRORS

### Error: "DATABASE_URL environment variable not found"

**Symptoms:**
- Build fails on Vercel
- Error message: `PrismaClient unable to initialize`

**Solutions:**

1. **Verify environment variable exists**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Confirm `DATABASE_URL` is listed
   - Check it's enabled for: Production, Preview, Development

2. **Verify format is correct**
   ```bash
   # Correct format:
   postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   
   # Common mistakes:
   ❌ Missing password
   ❌ Using [YOUR-PASSWORD] literally
   ❌ Extra spaces
   ❌ Wrong port (should be 5432)
   ```

3. **Test connection locally**
   ```bash
   # In VS Code terminal
   npx prisma db push
   ```
   If this fails, your DATABASE_URL is wrong

4. **Redeploy**
   - After fixing, go to Vercel → Deployments
   - Click "..." → "Redeploy"

---

### Error: "Prisma Client did not initialize"

**Symptoms:**
- Error: `@prisma/client did not initialize yet`
- App crashes on database queries

**Solutions:**

1. **Generate Prisma Client**
   ```bash
   # In your local project
   npx prisma generate
   git add prisma/
   git commit -m "Generate Prisma Client"
   git push origin main
   ```

2. **Verify postinstall script**
   Check `package.json` has:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate"
     }
   }
   ```

3. **Manual fix in Vercel**
   - Go to Vercel → Settings → General
   - Override Build Command:
     ```bash
     npm install && npx prisma generate && npm run build
     ```

---

### Error: "Error connecting to database"

**Symptoms:**
- `Connection refused` or `Connection timeout`
- Database queries fail

**Solutions:**

1. **Check Supabase project status**
   - Go to Supabase Dashboard
   - Verify project is not paused (free tier pauses after inactivity)
   - Click "Restore" if paused

2. **Try connection pooler**
   Use port 6543 instead of 5432:
   ```bash
   # Instead of:
   postgresql://...@db.xxxxx.supabase.co:5432/postgres
   
   # Use:
   postgresql://...@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
   ```

3. **Verify password**
   - Go to Supabase → Settings → Database
   - Click "Reset database password"
   - Update `DATABASE_URL` in Vercel with new password

4. **Check IP restrictions**
   - Go to Supabase → Settings → Database
   - Ensure "Restrict IP addresses" is OFF for now

---

## 🔑 AUTHENTICATION ISSUES

### Error: "NextAuth URL mismatch"

**Symptoms:**
- Can't login after deployment
- Error: `Invalid callback URL`
- Redirects to wrong domain

**Solutions:**

1. **Update NEXTAUTH_URL**
   ```bash
   # Should match your Vercel deployment URL exactly
   NEXTAUTH_URL=https://your-actual-app-name.vercel.app
   
   # Common mistakes:
   ❌ http:// instead of https://
   ❌ Trailing slash: .vercel.app/
   ❌ Using localhost in production
   ```

2. **Verify NEXTAUTH_SECRET exists**
   - Must be at least 32 characters
   - Generate new one if needed:
     ```bash
     openssl rand -base64 32
     ```

3. **Clear browser cookies**
   - Press F12 → Application → Cookies
   - Delete all cookies for your domain
   - Try login again

---

### Error: "Invalid credentials" (even with correct password)

**Symptoms:**
- Login fails with correct email/password
- No specific error message

**Solutions:**

1. **Check password in database**
   - Go to Supabase → Table Editor → User table
   - Verify `passwordHash` column has a value (should start with `$2a$`)
   - If blank, password wasn't hashed

2. **Reset user password**
   ```sql
   -- In Supabase SQL Editor
   UPDATE "User" 
   SET "passwordHash" = crypt('NewPassword123!', gen_salt('bf'))
   WHERE email = 'test@example.com';
   ```

3. **Check user is active**
   ```sql
   -- In Supabase SQL Editor
   SELECT id, email, "isActive", role 
   FROM "User" 
   WHERE email = 'test@example.com';
   ```
   If `isActive` is `false`, set it to `true`:
   ```sql
   UPDATE "User" SET "isActive" = true WHERE email = 'test@example.com';
   ```

---

## 📁 FILE UPLOAD ISSUES

### Error: "Storage bucket not found"

**Symptoms:**
- File upload button doesn't work
- Error: `Bucket 'depo-files' not found`

**Solutions:**

1. **Verify bucket name**
   - Go to Supabase → Storage
   - Confirm bucket is named exactly: `depo-files`
   - Case-sensitive! Must be lowercase

2. **Verify environment variable**
   ```bash
   SUPABASE_STORAGE_BUCKET=depo-files
   ```
   Must match bucket name exactly

3. **Recreate bucket if needed**
   - Delete old bucket
   - Create new: `depo-files`
   - Make it PRIVATE (not public)

---

### Error: "Unauthorized" when uploading files

**Symptoms:**
- Upload fails with 401 or 403 error
- Error: `Unauthorized` or `Access denied`

**Solutions:**

1. **Check storage policies**
   Go to Supabase → Storage → depo-files → Policies
   
   You need these 3 policies:
   
   ```sql
   -- Policy 1: Uploads
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'depo-files');
   
   -- Policy 2: Downloads
   CREATE POLICY "Allow authenticated reads"
   ON storage.objects
   FOR SELECT
   TO authenticated
   USING (bucket_id = 'depo-files');
   
   -- Policy 3: Deletes
   CREATE POLICY "Allow authenticated deletes"
   ON storage.objects
   FOR DELETE
   TO authenticated
   USING (bucket_id = 'depo-files');
   ```

2. **Verify service role key**
   - Go to Vercel → Settings → Environment Variables
   - Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Should start with `eyJhbGc...`

3. **Check file size limits**
   - Go to Supabase → Storage → depo-files → Settings
   - Verify file size limit (default: 50MB)
   - Increase if needed

---

## 📧 EMAIL ISSUES

### Error: "Invalid credentials" when sending email

**Symptoms:**
- Emails not sending
- Error: `Invalid login` or `535 Authentication failed`

**Solutions:**

1. **Regenerate Gmail App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Delete old password
   - Create new one
   - Update in Vercel:
     ```bash
     SMTP_PASSWORD=new-16-char-password
     ```

2. **Verify 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Confirm "2-Step Verification" is ON
   - App passwords won't work without it

3. **Check SMTP settings**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com  # Must match FROM_EMAIL
   FROM_EMAIL=your-email@gmail.com
   ```

4. **Try alternative port**
   If port 587 doesn't work:
   ```bash
   SMTP_PORT=465
   ```

---

### Emails sending but not arriving

**Symptoms:**
- No error in logs
- Emails never arrive in inbox

**Solutions:**

1. **Check spam folder**
   - Look in spam/junk folder
   - Mark as "Not Spam"

2. **Verify FROM_EMAIL**
   ```bash
   # Must be a real, working email
   FROM_EMAIL=your-actual-email@gmail.com
   ```

3. **Add SPF/DKIM records** (for custom domains)
   - Only needed if using custom domain
   - See Gmail documentation for setup

---

## 🎙️ TRANSCRIPTION ISSUES

### Error: "Deepgram API key invalid"

**Symptoms:**
- Transcription doesn't start
- Error: `Invalid API key`

**Solutions:**

1. **Verify API key**
   - Go to: https://console.deepgram.com
   - Navigate to: API Keys
   - Verify key is active (not deleted)

2. **Check environment variable**
   ```bash
   DEEPGRAM_API_KEY=your-actual-key-here
   USE_DEEPGRAM=true
   ```

3. **Regenerate key**
   - Delete old key in Deepgram console
   - Create new key
   - Update in Vercel
   - Redeploy

---

### Transcription fails with "Insufficient credits"

**Symptoms:**
- Error: `Insufficient balance`
- Transcription stops midway

**Solutions:**

1. **Check Deepgram balance**
   - Go to: https://console.deepgram.com
   - Check remaining credits
   - Add payment method if needed

2. **Free tier limits**
   - Free tier: $200 credits
   - ~45 hours of audio
   - Upgrade to paid plan if needed

---

## 🏗️ BUILD ERRORS

### Error: "Type error" during build

**Symptoms:**
- Build fails with TypeScript errors
- `error TS2xxx`

**Solutions:**

1. **Fix locally first**
   ```bash
   # Run type check
   npm run typecheck
   
   # Fix all errors
   # Then:
   git add .
   git commit -m "Fix type errors"
   git push
   ```

2. **Common fixes**
   ```typescript
   // Add null checks:
   user?.firmId  // Instead of: user.firmId
   
   // Add type assertions:
   const value = data as string
   
   // Add optional chaining:
   data?.map(...)  // Instead of: data.map(...)
   ```

---

### Error: "Module not found"

**Symptoms:**
- `Cannot find module '@/...'`
- Import errors

**Solutions:**

1. **Verify tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

2. **Reinstall dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Update dependencies"
   git push
   ```

---

## 🔄 DEPLOYMENT ISSUES

### Build succeeds but app shows 500 error

**Symptoms:**
- Build completes successfully
- App loads but shows 500 Internal Server Error

**Solutions:**

1. **Check Vercel logs**
   - Go to Vercel → Deployments → Your deployment
   - Click "Function Logs" tab
   - Look for actual error message

2. **Common causes**
   - Missing environment variable
   - Database connection failed
   - Prisma Client not generated

3. **Test locally with production env**
   ```bash
   # Create .env.local with production values
   npm run build
   npm run start
   ```

---

### Environment variables not updating

**Symptoms:**
- Changed env var in Vercel
- Still using old value

**Solutions:**

1. **Redeploy after changes**
   - Changing env vars requires redeploy
   - Go to: Deployments → "..." → "Redeploy"

2. **Verify variable scope**
   - Check all three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

3. **Clear cache**
   - Redeploy with: "..." → "Redeploy" → "Force"

---

## 📊 PERFORMANCE ISSUES

### App is very slow

**Symptoms:**
- Pages take 5+ seconds to load
- Database queries timeout

**Solutions:**

1. **Check Supabase region**
   - Verify Supabase and Vercel are in same region
   - US East → US East
   - Recreate project if needed

2. **Use connection pooler**
   ```bash
   DATABASE_URL=postgresql://...@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
   ```

3. **Check database indexes**
   - Verify indexes exist in Prisma schema
   - Run: `npx prisma migrate deploy`

---

## 🆘 GENERAL TROUBLESHOOTING STEPS

When stuck, try these in order:

1. **Check Vercel logs**
   - Deployment → Function Logs
   - Look for actual error messages

2. **Check Supabase logs**
   - Supabase → Logs → Postgres Logs
   - Look for connection errors

3. **Verify all env vars**
   - Count them: should have 15-18 variables
   - No typos in variable names
   - No extra spaces in values

4. **Test locally**
   ```bash
   npm run build
   npm run start
   ```
   If it works locally, issue is with Vercel setup

5. **Redeploy from scratch**
   - Delete deployment
   - Re-import project
   - Add env vars again
   - Deploy

6. **Check service status**
   - Vercel Status: https://www.vercel-status.com
   - Supabase Status: https://status.supabase.com

---

## 🔗 USEFUL DEBUGGING COMMANDS

```bash
# Check local build
npm run build

# Test database connection
npx prisma db push

# View Prisma schema
npx prisma studio

# Check TypeScript
npm run typecheck

# Check linting
npm run lint

# Full check
npm run check

# View environment variables
cat .env | grep -v "^#"
```

---

## 📞 GET HELP

**Still stuck?**

1. **Check documentation**
   - Vercel: https://vercel.com/docs
   - Supabase: https://supabase.com/docs
   - Next.js: https://nextjs.org/docs

2. **Search error message**
   - Copy exact error
   - Search: "nextjs [your error]"
   - Check GitHub issues

3. **Community support**
   - Vercel Discord: https://vercel.com/discord
   - Supabase Discord: https://discord.supabase.com
   - Next.js Discussions: https://github.com/vercel/next.js/discussions

---

**Last Updated:** November 13, 2025
