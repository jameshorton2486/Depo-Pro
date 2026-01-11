# 🔍 Network Request Diagnostic Guide

## Critical Check: What API Key is Actually Being Sent?

The "Invalid API key" error means Supabase is receiving an invalid key. We need to see what's actually being sent.

---

## 📋 Step-by-Step: Check Network Request

### Step 1: Open DevTools

1. **Open your browser:** `http://localhost:3000/forgot-password`
2. **Open DevTools:** Press `F12` (or right-click → Inspect)
3. **Go to Network tab**

### Step 2: Clear Network Log

1. Click the **"Clear"** button (🚫 icon) in Network tab
2. This ensures you see only new requests

### Step 3: Submit Forgot Password Form

1. Enter your email: `jameshorton2486@gmail.com`
2. Click **"Send Reset Link"**
3. Watch the Network tab for a new request

### Step 4: Find the Failed Request

1. **Look for a request to:** `ildhcfspbmhuemzgvzyx.supabase.co/auth/v1/recover`
2. **Status should be:** `401` (Unauthorized)
3. **Click on this request**

### Step 5: Check Request Headers

1. **Click the "Headers" tab** (in the request details panel)
2. **Scroll down to "Request Headers"** section
3. **Look for these headers:**

```
apikey: [VALUE HERE] ← THIS IS THE CRITICAL ONE
authorization: Bearer [VALUE HERE]
```

### Step 6: Screenshot or Copy These Values

**You need to tell me:**

1. **What is the `apikey` header value?**
   - Is it `undefined`?
   - Is it empty/blank?
   - Is it the correct key (`eyJhbGci...`)?
   - Is it a different/incorrect key?

2. **What is the `authorization` header value?**
   - Is it present?
   - What does it contain?

---

## 🎯 What to Look For

### ✅ CORRECT Request Headers:
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM
```

### ❌ WRONG Request Headers (What We're Seeing):
```
apikey: undefined
```
OR
```
apikey: (empty/blank)
```
OR
```
apikey: [wrong key from different project]
```

---

## 🔍 Also Check Browser Console

After submitting the form, check the **Console tab** (next to Network tab) for:

1. **Do you see this error?**
   ```
   🚨 CRITICAL: Supabase environment variables are UNDEFINED in browser!
   ```
   - If YES → Env vars not replaced at build time → Delete `.next` and restart

2. **Do you see this warning?**
   ```
   ⚠️  WARNING: NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short
   ```
   - If YES → Key is being replaced but with wrong/partial value

3. **Do you see this?**
   ```
   [Supabase Client] Environment Check
     URL: https://ildhcfspbmhuemzgvzyx.supabase.co...
     Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     Key Length: 208
     ✅ Environment variables look valid
   ```
   - If YES → Env vars are loaded correctly → Problem is elsewhere

---

## 📸 What to Share

After checking the Network request, share:

1. **The `apikey` header value** (first 30 characters is enough)
   ```
   apikey: eyJhbGci... (208 chars)  ← GOOD
   OR
   apikey: undefined                ← BAD
   ```

2. **Browser console output** (copy/paste the diagnostic messages)

3. **Whether you see the "CRITICAL: UNDEFINED" error** or the "Environment Check" success message

---

## 🔧 Quick Fix (While You Check Network)

**If the diagnostic shows env vars are undefined, run this:**

```powershell
# Stop dev server (Ctrl+C)

# Kill all Node processes (clean slate)
taskkill /F /IM node.exe 2>$null

# Delete build cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Delete empty .env if it exists
Remove-Item .env -Force -ErrorAction SilentlyContinue

# Verify only .env.local exists
Get-ChildItem -Name .env*

# Restart dev server
npm run dev
```

**After restart:**
- Check browser console for diagnostic messages
- Check Network tab for the actual `apikey` header value

---

**This will tell us exactly what's wrong. The Network tab doesn't lie - it shows the actual request being sent to Supabase.**
