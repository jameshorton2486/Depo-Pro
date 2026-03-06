# Depo-Pro AI Agent Rules

Architecture reference:
docs/DEPO_AUTH_ARCHITECTURE.md

Stack:
Next.js
Supabase Auth
Deepgram
TypeScript

Rules:

1. Supabase SSR authentication only
2. Root middleware.ts must manage session refresh
3. No NextAuth or alternate auth frameworks
4. All database queries must include organization_id
5. SUPABASE_SERVICE_ROLE_KEY must never appear in client code
6. TypeScript strict mode required

Before modifying authentication code, read:

docs/DEPO_AUTH_ARCHITECTURE.md
