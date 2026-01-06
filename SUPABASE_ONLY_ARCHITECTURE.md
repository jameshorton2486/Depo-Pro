# ✅ Supabase-Only Architecture - Correct Implementation

## 🎯 Core Principle: NO User Table

**CRITICAL:** Depo-Pro uses Supabase Auth `user_metadata` for user profiles, **NOT** a separate `users` table.

## ✅ What We're Using (Correct)

### User Data Storage
- **Location:** `auth.users.user_metadata` in Supabase Auth
- **Fields:**
  - `role` - User's role (ADMIN, REPORTER, etc.)
  - `firstName` - User's first name
  - `lastName` - User's last name
  - `agencyName` - Optional agency name
  - `phone` - Optional phone number

### How It Works
1. User signs up → Supabase Auth creates user in `auth.users`
2. Admin sets role → Updates `user_metadata.role` via Dashboard or API
3. Middleware reads role → `user.user_metadata?.role`
4. No database queries needed ✅

## ❌ What We're NOT Using (Wrong)

### Do NOT Create:
- ❌ `public.users` table
- ❌ `public.profiles` table (unless you need RLS/firm filtering)
- ❌ Any table that mirrors Prisma's User model

### Do NOT Insert:
- ❌ Manual user records via SQL
- ❌ `supabase.from('users').insert()`
- ❌ Any code that creates User table rows

## 🔧 Setting User Roles

### Option A: Supabase Dashboard (Recommended)
1. Go to **Authentication → Users**
2. Click your user email
3. Click **Edit Metadata** (or **Raw User Meta Data**)
4. Add/Update:
   ```json
   {
     "role": "ADMIN"
   }
   ```
5. Click **Save**

### Option B: API (Admin Only)
```typescript
// POST /api/profile with admin token
{
  "role": "ADMIN",
  "targetUserId": "user-uuid-here"
}
```

## 📋 Current Implementation Status

### ✅ Correctly Using user_metadata
- ✅ `middleware.ts` - Reads `user.user_metadata?.role`
- ✅ `lib/auth/profile-guard.ts` - Uses `user_metadata` only
- ✅ `app/api/profile/route.ts` - Updates `user_metadata` via Admin API
- ✅ `lib/auth/get-user-with-profile.ts` - Gets profile from `user_metadata`

### ⚠️ Files That Need Review
- `lib/database/queries.ts` - Has deprecated functions that reference `users` table
  - These are marked `@deprecated` and should not be used
  - Use `getUserProfile` from `@/lib/auth/profile-guard` instead

## 🚨 Important Notes

### Firm Data
- **Current:** Firm ID is NOT stored in `user_metadata`
- **If Needed:** Add `firmId` to `user_metadata` or create `profiles` table
- **For Now:** Jobs can be created without `firm_id` (nullable)

### Query Limitations
- Cannot filter users by `firm_id` using `user_metadata` alone
- Cannot join `auth.users` with other tables directly
- If you need these features, create a `profiles` table (Option B from user's message)

## ✅ Verification

After setting role in Supabase Dashboard:

1. **Log out completely**
2. **Log back in**
3. **Check middleware:** Should read role from `user_metadata`
4. **Visit `/admin`:** Should work if role is ADMIN
5. **Check cookies:** Should see `sb-*-auth-token` cookies

## 🎯 Result

Your architecture is now:
- ✅ **Supabase Auth only** (no duplicate User table)
- ✅ **Single source of truth** (`user_metadata.role`)
- ✅ **No sync issues** (one system, not two)
- ✅ **Edge-compatible** (no database queries for auth)

**This is the correct, professional architecture!** 🚀
