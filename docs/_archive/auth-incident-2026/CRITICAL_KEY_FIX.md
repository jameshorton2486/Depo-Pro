# 🔴 CRITICAL: Fix Supabase Key Issue

**Status:** URGENT - Auth will fail until this is fixed  
**Issue:** Browser is sending legacy JWT key instead of publishable key

---

## 🚨 The Problem

Your browser requests are showing:

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

This is a **legacy JWT anon key**, not the **publishable key** (`sb_publishable_*`).

**Result:** Supabase returns `401 Unauthorized` for all auth requests.

---

## ✅ The Solution

### Step 1: Get Your Publishable Key

1. Go to **Supabase Dashboard**
2. Navigate to **Settings → API Keys**
3. Find the **"Publishable"** key (starts with `sb_publishable_`)
4. Copy the **entire key**

### Step 2: Update `.env.local`

Open `.env.local` and update:

```bash
# ❌ WRONG (Legacy JWT):
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ CORRECT (Publishable):
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wz4osy1...
```

**Important:** The key must start with `sb_publishable_`, not `eyJhbGciOi`.

### Step 3: Hard Restart (MANDATORY)

Run these commands **in order**:

```powershell
# Option 1: Use the script
.\scripts\hard-restart.ps1
npm run dev

# Option 2: Manual commands
taskkill /F /IM node.exe 2>$null
Remove-Item -Recurse -Force .next
npm run dev
```

**Do NOT skip clearing `.next`** - the old key is cached there.

### Step 4: Hard Refresh Browser

1. **Close ALL tabs** for `localhost:3000`
2. Open a **new tab**
3. Go to `/login`
4. Open DevTools → Network tab
5. Attempt login/signup
6. Check the request headers

---

## ✅ How to Verify It's Fixed

### Check Request Headers

In DevTools → Network → Click on `/auth/v1/token` request:

**✅ CORRECT (Fixed):**
```
apikey: sb_publishable_wz4osy1...
authorization: Bearer sb_publishable_wz4osy1...
```

**❌ WRONG (Still broken):**
```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Use Verification Script

```powershell
.\scripts\verify-publishable-key.ps1
```

This will tell you if your key is correct.

---

## 🧠 Why This Happens

1. **Old key in `.env.local`** - Still has legacy JWT
2. **Next.js cache** - `.next` directory has old key embedded
3. **Browser cache** - Old bundle loaded before restart

**Solution:** Update key → Clear cache → Restart → Hard refresh browser

---

## 🚨 If You Still See `eyJhbGciOi` After Fixing

This means one of these is still true:

1. ❌ `.env.local` was not saved after editing
2. ❌ Dev server was not restarted
3. ❌ `.next` directory was not cleared
4. ❌ Browser tab is from before restart (old bundle)
5. ❌ Wrong key copied (still JWT instead of publishable)

**Fix:** Repeat Step 3 (Hard Restart) and Step 4 (Hard Refresh).

---

## 📝 Quick Reference

### Correct Key Format
```
sb_publishable_<random_string>
```

### Wrong Key Format
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Verification Command
```powershell
.\scripts\verify-publishable-key.ps1
```

### Hard Restart Command
```powershell
.\scripts\hard-restart.ps1
npm run dev
```

---

## ✅ Success Criteria

Once fixed, you should see:

- ✅ Request headers show `apikey: sb_publishable_...`
- ✅ `/auth/v1/token` returns `200 OK` (not `401`)
- ✅ Login works
- ✅ Signup works
- ✅ Cookies are set
- ✅ Session persists

---

**Remember:** The key must be `sb_publishable_*`, not `eyJhbGciOi*`. Once the browser bundle is rebuilt with the correct key, everything will work immediately.
