# 🔑 Run API Key Test - Browser Console

## ✅ VERIFIED: Your .env.local Key Looks Good

**From your `.env.local`:**
- ✅ Key starts with: `eyJhbGci...` (correct JWT format)
- ✅ Key length: 208 characters (correct)
- ✅ No quotes
- ✅ No spaces

**This key SHOULD be valid, but we need to test if Supabase accepts it.**

---

## 🧪 CRITICAL TEST: Run This in Browser Console

**This test bypasses your app completely and tests the key directly against Supabase.**

### Steps:

1. **Open your browser** (Chrome/Edge)
2. **Go to:** `http://localhost:3000` (any page works)
3. **Open DevTools:** Press `F12`
4. **Go to Console tab** (NOT PowerShell!)
5. **If you see a warning about pasting, type:**
   ```
   allow pasting
   ```
   Press Enter

6. **Paste this code and press Enter:**

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
  console.log('═══════════════════════════════════════');
  console.log('📊 TEST RESULTS:');
  console.log('═══════════════════════════════════════');
  console.log('Status Code:', r.status);
  console.log('Response:', data);
  console.log('');
  
  if (r.status === 200 || r.status === 204) {
    console.log('✅ SUCCESS! API key is VALID');
    console.log('✅ Email service is configured');
    console.log('✅ Problem is in your app code (check how @supabase/ssr sends key)');
  } else if (r.status === 401) {
    console.log('❌ FAILED: Invalid API key');
    console.log('');
    console.log('🔍 POSSIBLE CAUSES:');
    console.log('  1. Key was ROTATED in Supabase Dashboard');
    console.log('  2. Key in .env.local is outdated');
    console.log('  3. Key is from different Supabase project');
    console.log('');
    console.log('🔧 FIX:');
    console.log('  1. Go to: https://supabase.com/dashboard');
    console.log('  2. Select project: ildhcfspbmhuemzgvzyx');
    console.log('  3. Navigate to: Settings → API');
    console.log('  4. Copy NEW "anon public" key');
    console.log('  5. Update .env.local with new key');
    console.log('  6. Delete .next folder');
    console.log('  7. Restart dev server');
  } else if (r.status === 400) {
    console.log('✅ API KEY IS VALID! (Supabase accepted it)');
    console.log('⚠️  Status 400 = Bad Request (but key authentication worked)');
    console.log('');
    console.log('This could mean:');
    console.log('  - Email service not configured (key works, email doesn\'t)');
    console.log('  - Invalid email format (key works, request format issue)');
    console.log('');
    console.log('If status is 400, the API key is correct!');
  } else {
    console.log('⚠️  Unexpected status:', r.status);
    console.log('Check response for more details');
  }
  console.log('═══════════════════════════════════════');
})
.catch(e => {
  console.error('❌ Network Error:', e);
  console.log('');
  console.log('This could mean:');
  console.log('  - CORS issue (Supabase should allow this)');
  console.log('  - Network connection problem');
  console.log('  - Browser blocking request');
});
```

---

## 📋 What Each Result Means:

### ✅ Status 200 or 204:
**API key is VALID and email was sent!**
- Key is correct
- Email service is configured
- Problem is likely in how your app uses the Supabase client
- Check: Is `@supabase/ssr` sending the key correctly?

### ❌ Status 401:
**API key is INVALID**
- Key was rotated in Supabase Dashboard
- OR key in `.env.local` doesn't match Dashboard
- **Fix:** Get new key from Supabase Dashboard → Settings → API → anon/public

### ⚠️ Status 400:
**API key is VALID (Supabase accepted it)**
- Authentication worked!
- Status 400 means "Bad Request" (usually email format or missing email service)
- **This is actually good** - it means the key is correct!

### ❌ Network Error:
**Connection/CORS issue**
- Check network connection
- Try in incognito mode
- Check if browser is blocking requests

---

## 🔍 AFTER RUNNING TEST:

**Please report back:**

1. **What status code did you get?**
   - [ ] 200/204
   - [ ] 401
   - [ ] 400
   - [ ] Other: _______
   - [ ] Network Error

2. **If status is 401:**
   - Did you check Supabase Dashboard → Settings → API → anon/public key?
   - Does it match your `.env.local` key?

3. **If status is 400:**
   - This means key is valid!
   - Check if email service is configured in Supabase Dashboard

4. **Check Network Tab:**
   - Open Network tab in DevTools
   - Submit forgot password form
   - Find request to `/auth/v1/recover`
   - Check `apikey` header value
   - Does it show your key or `undefined`?

---

**Run this test NOW and tell me what status code you get. This will tell us exactly what's wrong.**
