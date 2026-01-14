# 🔍 Run Environment Validation

## Quick Validation Command

Run this in PowerShell from your project root:

```powershell
.\scripts\validate-env-format.ps1
```

## Manual Validation (Alternative)

If the script doesn't work, check manually:

### Step 1: Check if .env.local exists
```powershell
Test-Path .env.local
```
Should return: `True`

### Step 2: Check anon key format
```powershell
$lines = Get-Content .env.local
$anonKey = $lines | Where-Object { $_ -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY' }
Write-Host "Lines found: $($anonKey.Count)"
```

**Expected:** `Lines found: 1` (must be exactly 1 line)

### Step 3: Check key length
```powershell
$line = Get-Content .env.local | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' }
if ($line) {
    $key = ($line -split '=', 2)[1]
    Write-Host "Key length: $($key.Length) characters"
    if ($key.Length -lt 200) {
        Write-Host "WARNING: Key appears too short!" -ForegroundColor Yellow
    }
}
```

**Expected:** `Key length: 200+ characters`

## ✅ What to Look For

**✅ CORRECT:**
- Anon key is on exactly ONE line
- Key is 200+ characters long
- No line breaks in the value

**❌ INCORRECT:**
- Anon key split across multiple lines
- Key is shorter than 200 characters
- Line breaks or spaces in the value

## 🔧 If Issues Found

1. Open `.env.local`:
   ```powershell
   code .env.local
   ```

2. Find `NEXT_PUBLIC_SUPABASE_ANON_KEY=` and ensure it's on ONE line

3. Save and restart:
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run dev
   ```
