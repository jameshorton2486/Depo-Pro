# 🔴 CRITICAL: Environment Variable Format Fix

## 🎯 Issue

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` is split across multiple lines, causing it to be read incorrectly and resulting in 401 errors.

## ❌ BROKEN Format (Multi-line)

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi
OiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJ
pYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4N
hflk8o8ciBhRE
```

**Problem:** Environment variables must be on a single line. Line breaks break the value.

## ✅ CORRECT Format (Single Line)

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4Nhflk8o8ciBhRE
```

**Solution:** The entire key must be on ONE line with no line breaks.

## 🔧 How to Fix

### Option 1: Manual Fix (Recommended)

1. **Open `.env.local` in your editor:**
   ```powershell
   code .env.local
   ```

2. **Find the line starting with `NEXT_PUBLIC_SUPABASE_ANON_KEY=`**

3. **Remove all line breaks** - The entire key should be on one line:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4Nhflk8o8ciBhRE
   ```

4. **Save the file**

5. **Clear cache and restart:**
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev
   ```

### Option 2: Use Fix Script

```powershell
.\scripts\fix-env-format.ps1
```

This will check the format and warn if issues are found.

## ✅ Verification

After fixing, verify:

1. **Check the key is on one line:**
   ```powershell
   Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY" | Measure-Object -Line
   ```
   Should return: `1` (one line only)

2. **Check key length:**
   ```powershell
   $line = Select-String -Path .env.local -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY="
   $key = ($line.Line -split '=', 2)[1]
   Write-Host "Key length: $($key.Length) characters"
   ```
   Should be: `200+ characters`

3. **Test login:**
   - Go to `http://localhost:3000/login`
   - Try to log in
   - Should NOT see 401 errors

## 📝 Complete .env.local Format

Your `.env.local` should look like this:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ildhcfspbmhuemzgvzyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4Nhflk8o8ciBhRE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Other env vars...
```

**Rules:**
- ✅ One key=value per line
- ✅ No quotes around values
- ✅ No spaces around `=`
- ✅ No line breaks in values
- ✅ Entire anon key on ONE line

## 🚨 Common Mistakes

❌ **Multi-line values:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OiJzdXBhYmFzZSIs...
```
✅ **Single line:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

❌ **Quotes:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```
✅ **No quotes:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

❌ **Spaces:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
```
✅ **No spaces:**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## ✅ After Fix

Once fixed:
1. ✅ Clear `.next` cache
2. ✅ Restart dev server
3. ✅ Test login - 401 errors should be gone
4. ✅ Test forgot-password - should work
