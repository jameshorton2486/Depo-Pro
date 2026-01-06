# 🔐 Admin User Setup - Quick Start

## The Problem
You cannot set up a user with admin privileges because the system prevents role escalation for security.

## ✅ The Solution (2 Steps)

### Step 1: Find Your User
```bash
npm run list-users
```

This shows all users and their current roles.

### Step 2: Promote to Admin
```bash
EMAIL=your-email@example.com npm run promote-to-admin
```

Replace `your-email@example.com` with your actual email address.

### Step 3: Log Out and Log Back In
The middleware checks the database role on each request. You need to refresh your session.

---

## Alternative: By Supabase User ID

If you know your Supabase User ID (UUID):

```bash
SUPABASE_USER_ID=<your-uuid> npm run promote-to-admin
```

---

## Why This Works

1. ✅ **Security**: Users cannot promote themselves (prevents escalation)
2. ✅ **Database Authority**: Role is stored in database, not user_metadata
3. ✅ **Middleware Protection**: Every request checks database role
4. ✅ **Script Bypass**: Database script directly updates role (admin setup only)

---

## Troubleshooting

**"User not found"**
- User must exist in Supabase Auth first
- Check email spelling (case-insensitive but must match)

**"Still not admin after login"**
- Log out completely and log back in
- Clear browser cookies
- Verify role in database: `npm run list-users`

**"Database connection error"**
- Check `.env.local` has `DATABASE_URL`
- Run `npm run db:studio` to verify connection

---

## Files Created

- `scripts/promote-to-admin.ts` - Promote existing users
- `scripts/list-users.ts` - List all users
- `lib/auth/profile-guard.ts` - Fixed to prevent role escalation
