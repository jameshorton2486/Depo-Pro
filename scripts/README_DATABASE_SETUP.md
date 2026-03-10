# Database Connection Setup for Supabase

## Quick Fix for P1000 Errors

Supabase requires **TWO** connection strings:

1. **DATABASE_URL** - Pooled connection (runtime) - `pooler.supabase.com`
2. **DIRECT_URL** - Direct connection (migrations) - `db.*.supabase.co` ⚠️ **REQUIRED**

## Auto-Setup

```powershell
npm run db:setup-urls
```

This script will:
- Detect your current `DATABASE_URL`
- Help generate the correct `DIRECT_URL`
- Add it to `.env.local` automatically

## Manual Setup

Add to `.env.local`:

```bash
# Pooled (runtime)
DATABASE_URL="postgresql://postgres.xxx:password@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Direct (migrations) - REQUIRED
DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

## Get Connection Strings

1. Supabase Dashboard → Project Settings → Database
2. **Connection pooling** → Use for `DATABASE_URL`
3. **Direct connection** → Use for `DIRECT_URL`

## Verify

```powershell
# Test direct connection
psql "$DIRECT_URL" -c "SELECT 1"
```
