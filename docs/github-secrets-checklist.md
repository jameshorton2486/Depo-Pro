# GitHub Secrets Checklist
# Verify at: https://github.com/jameshorton2486/depo-pro/settings/secrets/actions

## Required Secrets (must exist)
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] DEEPGRAM_API_KEY
- [ ] ANTHROPIC_API_KEY

## Deprecated Secrets (must NOT exist — delete if present)
- [x] DATABASE_URL — deleted 2026-03-07
- [x] DIRECT_URL — deleted 2026-03-07
- [x] NEXTAUTH_SECRET — not present
- [x] NEXTAUTH_URL — not present

## CI-Only Secrets (already present)
- [x] TEST_USER_A (email for scopist test account)
- [x] TEST_USER_B (email for reporter test account)
- [x] ORG_TEST_USER_A
- [x] ORG_TEST_USER_B
