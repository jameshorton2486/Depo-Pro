# 🔑 API Key Verification Test

## Critical Test: Is the API Key Actually Valid?

You're correct - the "Invalid API key" (401) error means Supabase is rejecting the API key itself, not an email configuration issue.

---

## 🧪 TEST 1: Direct API Call in Browser Console

**This bypasses your app completely and tests the key directly against Supabase.**

### Steps:
1. Open your browser (Chrome/Edge)
2. Go to: `http://localhost:3000` (any page works)
3. Open DevTools: Press `F12`
4. Go to **Console** tab
5. If you see a warning about pasting, type: `allow pasting` and press Enter
6. Paste this code and press Enter:

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
  const data = await r.json().catch(() => ({ error: 'Could not parse response' }));
  console.log('✅ Status Code:', r.status);
  console.log('Response:', data);
  
  if (r.status === 200 || r.status === 204) {
    console.log('✅ SUCCESS! API key is VALID and email was sent.');
  } else if (r.status === 401) {
    console.log('❌ FAILED: Invalid API key');
    console.log('The key in your code is WRONG or was ROTATED in Supabase Dashboard.');
    console.log('Fix: Go to Supabase Dashboard → Settings → API → Copy the NEW anon/public key');
  } else if (r.status === 400) {
    console.log('⚠️  BAD REQUEST: API key is valid but request format is wrong (this is OK - means key works)');
  } else {
    console.log('⚠️  Unexpected status:', r.status);
  }
})
.catch(e => {
  console.error('❌ Network Error:', e);
  console.log('This could mean CORS issue or network problem');
});
```

### Expected Results:

#### ✅ If Status = 200 or 204:
- **API key is VALID**
- **Email service is configured** (email was sent)
- **Problem is in your app code** (check how key is being sent)

#### ❌ If Status = 401:
- **API key is INVALID**
- **Key was rotated/changed in Supabase Dashboard**
- **Key in .env.local is outdated**
- **Fix:** Get new key from Supabase Dashboard → Settings → API → anon/public key

#### ⚠️ If Status = 400:
- **API key is VALID** (Supabase accepted it)
- **Request format issue** (this is actually good - means key works!)
- Email might not be configured, but authentication is working

---

## 🔍 TEST 2: Verify Key in Supabase Dashboard

**Check if the key in your .env.local matches the key in Supabase Dashboard:**

### Steps:
1. Go to: https://supabase.com/dashboard
2. Select your project: **ildhcfspbmhuemzgvzyx**
3. Navigate to: **Settings → API**
4. Look for: **"Project API keys"** section
5. Find: **"anon public"** key
6. Compare with your `.env.local` file

**Expected Format:**
- Starts with: `eyJhbGci...`
- Length: ~200+ characters
- Type: JWT (JSON Web Token)

**If keys DON'T match:**
- ✅ Key was rotated in Supabase
- ✅ Copy NEW key from Dashboard
- ✅ Update `.env.local`
- ✅ Delete `.next` folder
- ✅ Restart dev server

---

## 🔍 TEST 3: Check What Key Your App Is Actually Sending

**Let's verify what's in the browser bundle:**

1. Go to: `http://localhost:3000/forgot-password`
2. Open DevTools (F12) → **Network** tab
3. Clear network log (🚫 button)
4. Submit the forgot password form
5. Find the request to: `ildhcfspbmhuemzgvzyx.supabase.co/auth/v1/recover`
6. Click on the request → **Headers** tab
7. Look at **Request Headers** section
8. Find: `apikey:` header

**Compare:**
- What's in the `apikey` header?
- Does it match your `.env.local` key?
- Does it match Supabase Dashboard key?
- Is it `undefined` or empty?

---

## 🚨 POSSIBLE CAUSES

### 1. Key Was Rotated in Supabase Dashboard
**Symptom:** Key in `.env.local` doesn't match Dashboard  
**Fix:** Copy new key from Dashboard → Update `.env.local` → Clean build

### 2. Wrong Project Key
**Symptom:** Key from different Supabase project  
**Fix:** Verify project reference `ildhcfspbmhuemzgvzyx` matches key

### 3. Key Not Replaced at Build Time
**Symptom:** `apikey` header shows `undefined` or wrong value  
**Fix:** Delete `.next` folder → Restart dev server → Hard refresh browser

### 4. Key Has Quotes or Whitespace
**Symptom:** Key in `.env.local` has quotes or extra spaces  
**Fix:** Remove quotes/spaces → Key should be: `KEY=value` not `KEY="value"`

### 5. Service Role Key Instead of Anon Key
**Symptom:** Using service role key for client-side requests  
**Fix:** Use `anon public` key, not `service_role` key

---

## ✅ VERIFICATION CHECKLIST

- [ ] Key in `.env.local` matches Supabase Dashboard `anon public` key
- [ ] Key has no quotes or extra spaces
- [ ] Key is from correct project (`ildhcfspbmhuemzgvzyx`)
- [ ] `.next` folder deleted and rebuilt
- [ ] Dev server restarted after updating key
- [ ] Browser hard refreshed (`Ctrl+Shift+R`)
- [ ] Direct API test shows status 200/204 or 400 (not 401)
- [ ] Network tab shows correct `apikey` header value

---

## 📋 WHAT TO REPORT BACK

After running the browser console test, tell me:

1. **What status code did you get?**
   - 200/204 = Key valid, email configured
   - 401 = Key invalid, needs update
   - 400 = Key valid, request format issue (good sign)
   - Other = Network/CORS issue

2. **Does `.env.local` key match Supabase Dashboard key?**
   - YES = Key is correct, issue elsewhere
   - NO = Key was rotated, update needed

3. **What does Network tab show for `apikey` header?**
   - Shows correct key = Problem is elsewhere
   - Shows `undefined` = Build cache issue
   - Shows wrong key = Wrong key in `.env.local`

---

**Run the browser console test first - that will tell us exactly what's wrong.**
