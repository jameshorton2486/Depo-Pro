# Setting Up Admin Account for jameshorton2486@gmail.com

## Current Issue
You cannot log in because the authentication system requires:
1. A user account in **Supabase Auth** (handles login)
2. A matching user record in your **Prisma database** with ADMIN role

## Solution Steps

### Step 1: Check if User Exists in Supabase Auth

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Authentication → Users**
3. Look for `jameshorton2486@gmail.com`

### Step 2A: If User EXISTS in Supabase Auth

1. Copy the **User ID (UUID)** from Supabase (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
2. Open PowerShell in your project directory
3. Run:
   ```powershell
   $env:SUPABASE_USER_ID="<paste-uuid-here>"
   npx tsx scripts/create-admin-user.ts
   ```

### Step 2B: If User DOES NOT exist in Supabase Auth

1. In Supabase Dashboard → **Authentication → Users**
2. Click **Add user** → **Create new user**
3. Enter:
   - **Email**: `jameshorton2486@gmail.com`
   - **Password**: (choose a secure password)
   - **Auto Confirm User**: ✅ Check this box
4. Click **Create user**
5. Copy the generated **User ID (UUID)**
6. Run:
   ```powershell
   $env:SUPABASE_USER_ID="<paste-uuid-here>"
   npx tsx scripts/create-admin-user.ts
   ```

### Step 3: Verify Database Connection

If you get a database connection error, check your `.env.local` file:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
```

Get these from Supabase Dashboard → **Settings → API**

### Step 4: Test Login

1. Make sure your dev server is running: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Enter:
   - **Email**: `jameshorton2486@gmail.com`
   - **Password**: (the password you set in Supabase)
4. Click **Sign In**

## Alternative: Promote Existing User to Admin

If the user already exists in the database but doesn't have admin role:

```powershell
npx tsx scripts/promote-to-admin.ts jameshorton2486@gmail.com
```

## Troubleshooting

### "Invalid credentials" error
- Verify the password you're using matches what you set in Supabase Auth
- Check that Auto Confirm User was enabled when creating the account
- Try resetting the password in Supabase Dashboard

### Database connection error
- Verify DATABASE_URL in .env.local
- Check that your IP is allowed in Supabase (Settings → Database → Connection Pooling)
- Test connection: `npx tsx test-supabase-connection.js`

### "User already exists" error
- The Prisma user record already exists
- Run the promote script instead: `npx tsx scripts/promote-to-admin.ts jameshorton2486@gmail.com`
