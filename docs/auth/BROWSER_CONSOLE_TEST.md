# 🧪 Direct Browser Console Test

## ⚠️ IMPORTANT: This code goes in BROWSER CONSOLE, not PowerShell!

**Step 1:** Open browser console (F12 → Console tab)

**Step 2:** If you see a warning about "past[ing] code", type:
```
allow pasting
```
Then press Enter

**Step 3:** Paste this JavaScript code and press Enter:

```javascript
// Test 1: Check if env vars are actually available
console.log('=== TEST 1: Check Environment Variables ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : 'process is not defined');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...' : 'process is not defined');

// Test 2: Direct Supabase API call with hardcoded key
console.log('\n=== TEST 2: Direct API Call ===');
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
  console.log('Response Status:', r.status);
  console.log('Response Data:', data);
  if (r.status === 200 || r.status === 204) {
    console.log('✅ SUCCESS! API key works. Problem is in app code.');
  } else if (r.status === 401) {
    console.log('❌ FAILED: Invalid API key at Supabase level.');
    console.log('Check Supabase Dashboard → Settings → API → anon/public key');
  } else {
    console.log('⚠️  Unexpected status:', r.status);
  }
})
.catch(err => {
  console.error('❌ Network Error:', err);
});
```

## 📋 What to Look For:

### Test 1 Results:
- **If `process is not defined`:** This is NORMAL - `process.env` doesn't exist in browser. Next.js replaces `process.env.NEXT_PUBLIC_*` at build time with actual values.
- **If it shows actual values:** Env vars ARE being replaced correctly.

### Test 2 Results:
- **Status 200 or 204:** ✅ API key is VALID. Problem is in your app code.
- **Status 401:** ❌ API key is INVALID. Check Supabase Dashboard.
- **Network Error:** ❌ Connection issue or CORS problem.

---

## 🔍 Next Steps Based on Results:

### If Test 2 = SUCCESS (200/204):
**Problem:** App code is not using the key correctly.
**Fix:** Check if diagnostic logging shows env vars in browser console when page loads.

### If Test 2 = FAILED (401):
**Problem:** API key is wrong or Supabase project has issues.
**Fix:** 
1. Go to Supabase Dashboard → Your Project → Settings → API
2. Copy the **anon/public** key again
3. Verify it matches `.env.local`

### If Network Error:
**Problem:** CORS or connection issue.
**Fix:** Check if Supabase project is accessible, check firewall/network.
