# 🎯 Cursor AI Prompt — Supabase RLS Optimization (Profiles)

**Copy everything below into Cursor:**

---

You are a senior Postgres + Supabase security engineer.

## Objective

Audit and optimize Row Level Security (RLS) policies on the `public.profiles` table to improve performance and maintain correct authorization behavior.

## Context

The current RLS policies use `auth.uid()` directly in policy expressions (e.g. `auth.uid() = id`). This causes per-row evaluation and prevents PostgreSQL from caching execution plans efficiently at scale.

## Task

1. Inspect existing RLS policies on `public.profiles`.
2. Replace any policy conditions using `auth.uid()` directly with a scalar subquery pattern:
   `(SELECT auth.uid())`
3. Ensure policies remain functionally identical.
4. Ensure UPDATE policies include a proper `WITH CHECK` clause.
5. Confirm Row Level Security is enabled on the table.
6. Output only safe, idempotent SQL statements.

## Required Final Policies

- **SELECT:** users can read only their own profile
- **UPDATE:** users can update only their own profile, and ownership cannot be changed

## Constraints

- Do NOT disable RLS
- Do NOT broaden access
- Keep policies scoped to `TO public` (Supabase JWT-based auth)
- Do not introduce admin logic unless explicitly requested
- SQL must be safe to run multiple times

## Deliverables

- SQL statements only
- No explanations unless requested
- Assume production environment

---

## ✅ What This Prompt Guarantees

✔ Prevents Cursor from "helpfully" weakening security  
✔ Forces scalar-subquery optimization  
✔ Produces migration-ready SQL  
✔ Avoids role confusion (auth.role() misuse)  
✔ Keeps Supabase JWT behavior intact  
✔ Safe for production databases

---

## 🧠 Optional Follow-Up Prompts

### 🔍 Audit All RLS Policies
```
Audit all RLS policies in the database and identify any policy using auth.uid() directly instead of a scalar subquery. Propose optimized replacements.
```

### 🧩 Role-Aware Policies
```
Extend existing RLS policies to support admin access using JWT claims while preserving least-privilege defaults.
```

### 📦 Migration File
```
Generate a single reversible SQL migration file applying all optimized RLS policies.
```
