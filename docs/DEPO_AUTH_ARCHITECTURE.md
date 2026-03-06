# Depo-Pro Authentication Architecture

## Stack

* Next.js App Router
* Supabase Auth
* Supabase RLS
* Deepgram Transcription
* TypeScript strict mode

## Authentication Flow

User → Protected Route
↓
middleware.ts checks Supabase cookie
↓
If session exists → load page
If no session → redirect to /login

Login flow:

/login → Supabase signIn
↓
Supabase redirect → /auth/callback
↓
exchangeCodeForSession
↓
session cookie created
↓
redirect /dashboard

## Required Files

middleware.ts
lib/supabase/middleware.ts
lib/supabase/server.ts
lib/auth/session.ts
lib/middleware/withRouteProtection.ts

## Security Rules

* Supabase SSR authentication only
* No NextAuth
* Service role key never exposed to browser
* All database queries must include organization_id
* TypeScript strict mode required

## Route Protection

All protected routes must use either:

middleware.ts
or
withRouteProtection()