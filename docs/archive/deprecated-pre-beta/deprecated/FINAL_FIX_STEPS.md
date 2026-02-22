# 🎯 FINAL FIX STEPS - "Invalid API key" Error

## ✅ Current Status

**Verified:**
- ✅ `.env` file is **DELETED** (confirmed)
- ✅ `.env.local` has correct `NEXT_PUBLIC_SUPABASE_ANON_KEY` (208 characters, starts with `eyJ`)
- ✅ Files are correct (`browser.ts` has diagnostic logging)
- ✅ TypeScript: 0 errors

**Still failing:**
- ❌ "Invalid API key" error persists

---

## 🔍 Answer: Which API Key?

**The error is from:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

This is the **Supabase Anonymous/Public Key** used for client-side authentication.

**Your key value (from .env.local):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM
```

**This key is correct** (208 characters, JWT format).

---

## 🚨 The Problem

**The key is correct in `.env.local`, but the browser bundle has stale/undefined values.**

This means:
1. `.env.local` has correct values ✅
2. `.next` build cache has old values ❌
3. Browser bundle wasn't rebuilt with new env vars ❌
4. Supabase receives `undefined` or wrong key → "Invalid API key" ❌

---

## ✅ THE FIX (Do This Now)

### Step 1: Stop Dev Server

```powershell
# Press Ctrl+C in the terminal running npm run dev
# Or kill all Node processes:
taskkill /F /IM node.exe 2>$null
```

### Step 2: Delete Build Cache (CRITICAL)

```powershell
# Delete .next folder completely
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Verify it's gone
if (Test-Path ".next") {
    Write-Host "ERROR: .next folder still exists!" -ForegroundColor Red
} else {
    Write-Host "✅ .next folder deleted successfully" -ForegroundColor Green
}
```

### Step 3: Restart Dev Server

```powershell
npm run dev
```

**Wait for:** `Ready on http://localhost:3000`

---

## 🔍 Step 4: Check Browser Console

**Open:** `http://localhost:3000/forgot-password`

**Open DevTools (F12) → Console tab**

### What You Should See:

#### ✅ CORRECT (Env vars loaded):
```
[Supabase Client] Environment Check
  URL: https://ildhcfspbmhuemzgvzyx.supabase.co...
  Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Key Length: 208
  ✅ Environment variables look valid
```

#### ❌ WRONG (Env vars undefined):
```
🚨 CRITICAL: Supabase environment variables are UNDEFINED in browser!
   NEXT_PUBLIC_SUPABASE_URL: ❌ UNDEFINED
   NEXT_PUBLIC_SUPABASE_ANON_KEY: ❌ UNDEFINED
```

**If you see UNDEFINED:**
- Build cache is still stale
- Delete `.next` again and restart
- Make sure you're restarting AFTER deleting `.next`

---

## 🔍 Step 5: Check Network Request Headers

**This is the CRITICAL check to see what's actually being sent.**

### Steps:

1. **Open DevTools (F12) → Network tab**

2. **Clear network log** (click 🚫 Clear button)

3. **Submit forgot password form:**
   - Enter: `jameshorton2486@gmail.com`
   - Click: "Send Reset Link"

4. **Find the failed request:**
   - Look for: `ildhcfspbmhuemzgvzyx.supabase.co/auth/v1/recover`
   - Status: `401` (Unauthorized)

5. **Click on the request** → Go to **"Headers" tab**

6. **Scroll to "Request Headers" section**

7. **Find the `apikey` header** (this is what Supabase receives)

8. **Tell me what you see:**
   - Is it: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (correct key)?
   - Is it: `undefined`?
   - Is it: empty/blank?
   - Is it: a different key value?

---

## 📋 What to Report Back

After running the fix steps, report:

### Option A: Console shows UNDEFINED
```
1️⃣ YES - Clean build completed
2️⃣ Browser console shows: "CRITICAL: UNDEFINED"
3️⃣ Still seeing "Invalid API key" error
```

### Option B: Console shows valid values
```
1️⃣ YES - Clean build completed
2️⃣ Browser console shows: "✅ Environment variables look valid"
3️⃣ Network tab `apikey` header value: [paste the first 30 characters]
```

### Option C: Still failing but different error
```
1️⃣ YES - Clean build completed
2️⃣ Browser console shows: [paste the console output]
3️⃣ Network tab `apikey` header: [paste value]
4️⃣ New error: [paste error message]
```

---

## 🎯 Expected Results After Clean Build

### ✅ SUCCESS:
1. Browser console: "✅ Environment variables look valid"
2. Network request: `apikey` header has your key (`eyJhbGci...`)
3. Request succeeds: `200 OK` (not `401`)
4. Cookies appear: `sb-ildhcfspbmhuemzgvzyx-auth-token`

### ❌ IF STILL FAILING:
- Share the `apikey` header value from Network tab
- Share the browser console output
- Share any new error messages

---

## 🚀 Quick Clean Build Script

Run this to do everything at once:

```powershell
# Stop dev server (kill all Node processes)
taskkill /F /IM node.exe 2>$null

# Delete build cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Verify .env file is deleted (should be False)
if (Test-Path ".env") {
    Write-Host "⚠️  .env file still exists - deleting it..." -ForegroundColor Yellow
    Remove-Item .env -Force
}

# Verify only .env.local exists
Write-Host "`n📁 Environment files:" -ForegroundColor Cyan
Get-ChildItem -Name .env* | ForEach-Object { Write-Host "  Found: $_" }

# Restart dev server
Write-Host "`n🚀 Starting dev server..." -ForegroundColor Cyan
npm run dev
```

---

**After running this, check browser console and Network tab. The diagnostic logging will tell us exactly what's wrong.**
