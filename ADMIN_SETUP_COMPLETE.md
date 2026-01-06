# ✅ Admin User Setup - Complete Solution

## Status: Ready to Use

Your Supabase setup is **already correct**:
- ✅ `@supabase/ssr` is installed (v0.8.0)
- ✅ Canonical clients are configured
- ✅ Middleware uses proper cookie handling
- ✅ Security is enforced (no role escalation)

## Quick Fix: Promote Your User to Admin

### Step 1: List Users
```bash
npm run list-users
```

This shows all users in your database with their current roles.

### Step 2: Promote to Admin
```bash
EMAIL=your-email@example.com npm run promote-to-admin
```

Replace `your-email@example.com` with your actual email.

### Step 3: Log Out and Log Back In
The middleware checks the database role on each request. You need to refresh your session.

---

## Why You Can't Set Admin During Registration

**This is by design for security:**
- Users cannot promote themselves (prevents escalation)
- Role is stored in **database**, not `user_metadata`
- Middleware always checks database role (authoritative source)
- Only existing admins can change roles via `/api/profile`

---

## Alternative: Create Admin via Database Script

If you prefer to create a new admin user:

1. **Register the user** via `/register` (creates Supabase Auth user)
2. **Get Supabase User ID** from Supabase Dashboard → Authentication → Users
3. **Run the script:**
   ```bash
   SUPABASE_USER_ID=<uuid> npm run tsx scripts/create-admin-user.ts
   ```

---

## Verification

After promoting, verify it worked:

```bash
# Check users and roles
npm run list-users

# Test Supabase connection
npm run test-auth
```

---

## Troubleshooting

**"User not found"**
- User must exist in Supabase Auth first
- Check email spelling (case-insensitive)

**"Still not admin after login"**
- Log out completely and log back in
- Clear browser cookies
- Verify in database: `npm run list-users`

**"Database connection error"**
- Check `.env.local` has `DATABASE_URL`
- Verify connection: `npm run db:studio`

---

## Files Created/Fixed

- ✅ `scripts/promote-to-admin.ts` - Promote existing users
- ✅ `scripts/list-users.ts` - List all users
- ✅ `scripts/test-supabase-auth.ts` - Test Supabase setup
- ✅ `lib/auth/profile-guard.ts` - Fixed to prevent role escalation
- ✅ `package.json` - Added npm scripts

---

## Your Supabase Setup is Correct

You already have:
- ✅ `@supabase/ssr` installed
- ✅ Proper cookie-based session handling
- ✅ Edge-compatible middleware
- ✅ Secure role management

The only thing needed is to **promote your user** using the script above.
