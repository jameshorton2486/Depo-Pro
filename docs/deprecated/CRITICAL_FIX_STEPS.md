# 🔴 CRITICAL: Fix "Invalid API key" Error

## 🎯 Root Cause

The diagnostic logging (`[Supabase Client] Environment Check`) is **NOT appearing** in your browser console. This means either:
1. Browser has cached old JavaScript
2. Cached client instance from before fix
3. Code isn't being recompiled

---

## ✅ IMMEDIATE FIX (Do These In Order)

### Step 1: Hard Refresh Browser (CRITICAL)

**This clears cached JavaScript:**
- **Chrome/Edge:** Press `Ctrl+Shift+R` or `Ctrl+F5`
- **Or:** DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 2: Verify Diagnostic Logging Appears

**After hard refresh, open:**
- `http://localhost:3000/forgot-password`
- **Open Console (F12)**
- **Look for:** `[Supabase Client] Environment Check`

**Expected output:**
```
[Supabase Client] Environment Check
  URL: https://ildhcfspbmhuemzgvzyx.supabase.co...
  Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Key Length: 208
  ✅ Environment variables look valid
```

**OR if env vars are undefined:**
```
[Supabase Client] Environment Check
  URL: ❌ UNDEFINED
  Key: ❌ UNDEFINED
  Key Length: 0
  🚨 CRITICAL: Supabase environment variables are UNDEFINED in browser!
```

### Step 3: If Diagnostic STILL Doesn't Appear

**Force rebuild and clear all caches:**

```powershell
# Stop dev server
taskkill /F /IM node.exe 2>$null

# Delete ALL caches
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue

# Verify no .env file exists
Remove-Item .env -Force -ErrorAction SilentlyContinue

# Restart dev server
npm run dev
```

**Then do Step 1 again (hard refresh)**

---

## 🧪 Direct API Test (Bypass App Entirely)

**If diagnostic still doesn't show, test the API key directly:**

### In Browser Console (NOT PowerShell):

1. **Open:** `http://localhost:3000` (any page)
2. **Open Console (F12)**
3. **If you see "past[ing] code" warning, type:**
   ```
   allow pasting
   ```
   Press Enter

4. **Paste this code:**
   ```javascript
   fetch('https://ildhcfspbmhuemzgvzyx.supabase.co/auth/v1/recover', {
     method: 'POST',
     headers: {
       'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM',
       'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ email: 'jameshorton2486@gmail.com' })
   })
   .then(async r => {
     const data = await r.json().catch(() => ({}));
     console.log('Status:', r.status);
     console.log('Response:', data);
     if (r.status === 200 || r.status === 204) {
       console.log('✅ API KEY WORKS! Problem is in app.');
     } else if (r.status === 401) {
       console.log('❌ API KEY INVALID at Supabase level.');
     }
   })
   .catch(e => console.error('Error:', e));
   ```
5. **Press Enter**

### Results:

- **Status 200/204:** ✅ API key is VALID. Problem is in app code.
- **Status 401:** ❌ API key is INVALID. Check Supabase Dashboard.
- **Network Error:** ❌ Connection/CORS issue.

---

## 📋 What to Report

**After hard refresh, tell me:**

1. **Do you see `[Supabase Client] Environment Check` in console?**
   - YES → What does it show? (URL, Key, Key Length)
   - NO → Diagnostic not running (cached code issue)

2. **If you ran the direct API test:**
   - What status code did you get?
   - What was the response?

3. **If diagnostic shows UNDEFINED:**
   - Confirm `.env.local` exists and has correct values
   - Confirm `.env` file is deleted
   - Confirm dev server was restarted after deleting `.next`

---

## 🔍 Answer to Your Question: "What API Key?"

**The API key causing the error is:**
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Expected Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM`
- **Length:** 208 characters
- **Format:** JWT (starts with `eyJ`)

**This key is correct in `.env.local`.**

**The problem:** The browser bundle might have `undefined` or old values because:
- Build cache is stale (`.next` folder)
- Browser has cached old JavaScript
- Env vars weren't replaced at build time

**The fix:** Hard refresh + clean rebuild (steps above)
