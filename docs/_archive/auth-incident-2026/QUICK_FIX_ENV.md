# ⚡ QUICK FIX: Environment Variable Format

## 🔴 Problem

Your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is split across multiple lines in `.env.local`, causing 401 errors.

## ✅ Solution (30 seconds)

### Step 1: Open `.env.local`
```powershell
code .env.local
```

### Step 2: Find and Fix the Anon Key

**Find this (BROKEN - multi-line):**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi
OiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJ
pYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4N
hflk8o8ciBhRE
```

**Replace with this (CORRECT - single line):**
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDE2ODUsImV4cCI6MjA4MzYwMTY4NX0.zUcWLjm6PHRnksIq1uS986iPO98Q4Nhflk8o8ciBhRE
```

**How to fix:**
1. Delete all line breaks in the key value
2. Put the entire key on ONE line
3. Save the file

### Step 3: Clear Cache & Restart
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

### Step 4: Test
Go to `http://localhost:3000/forgot-password` - 401 errors should be gone!

## 🔍 Validate Format

Run this to check:
```powershell
.\scripts\validate-env-format.ps1
```

## ✅ Expected Result

After fix:
- ✅ No 401 errors
- ✅ Login works
- ✅ Forgot password works
- ✅ Reset password works
