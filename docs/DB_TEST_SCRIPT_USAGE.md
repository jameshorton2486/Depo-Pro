# Database Connection Test Script Usage

## Quick Start

### PowerShell (Windows)
```powershell
$env:DOTENV_CONFIG_PATH=".env.local"
npx tsx scripts/test-db-connection.ts
```

### Bash (Linux/Mac)
```bash
DOTENV_CONFIG_PATH=.env.local npx tsx scripts/test-db-connection.ts
```

## Why This Is Needed

`.env.local` is **NOT automatically loaded** by plain Node.js scripts. It's only loaded by Next.js.

The test script is a plain Node/tsx script, so we must:
1. Use `dotenv/config` to load environment variables
2. Explicitly tell it to read `.env.local` (not `.env`)

## Expected Success Output

```
🔍 Testing raw PostgreSQL connection...

📁 Loading environment from: .env.local

✅ DATABASE_URL is set
   Connection: postgresql://postgres:****@db.xxx.supabase.co:5432/postgres?sslmode=require...

✅ Database connected!
✅ Query successful: {"ok":1,"db_name":"postgres"}
✅ PostgreSQL version: PostgreSQL 15.x...
✅ All connection tests passed!

📝 Next steps:
   1. Run: npx prisma generate
   2. Run: npx prisma db push
   3. Then build Review UI! 🚀
```

## Common Errors

### Error: `DATABASE_URL is not set`
**Fix:** Make sure you're running with the `DOTENV_CONFIG_PATH` environment variable set.

### Error: `password authentication failed`
**Fix:** Your database password is incorrect. Reset it in Supabase Dashboard → Settings → Database → Reset Database Password.

### Error: `getaddrinfo ENOTFOUND db.xxx.supabase.co`
**Fix:** 
- Check your Supabase project is not paused
- Verify the connection string uses the direct connection (not pooler)
- Check your network connection

### Error: `certificate verify failed`
**Fix:** Make sure your connection string includes `?sslmode=require`

## After Test Passes

Once the test script succeeds, run:

```powershell
npx prisma generate
npx prisma db push
```

These should now work without P1001 errors.


