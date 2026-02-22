# Beta Onboarding Checklist

## F.1 Beta User Accounts (Supabase Dashboard)

Create auth users:
1. `reporter1@[domain]` (`REPORTER`)
2. `reporter2@[domain]` (`REPORTER`)
3. `scopist1@[domain]` (`SCOPIST`)
4. `scopist2@[domain]` (`SCOPIST`)
5. `attorney1@[domain]` (`ATTORNEY`)

Create beta firm:
```sql
INSERT INTO firms (id, name, slug, plan_tier, is_active)
VALUES (gen_random_uuid(), 'Beta Testing Firm', 'beta-testing', 'BETA', true);
```

Assign each auth user to profile record (use `full_name`, not deprecated `first_name/last_name`):
```sql
INSERT INTO profiles (id, email, role, firm_id, full_name, is_active)
VALUES
  ('<auth-user-id>', 'reporter1@domain', 'REPORTER', '<firm-id>', 'Beta Reporter 1', true),
  ('<auth-user-id>', 'reporter2@domain', 'REPORTER', '<firm-id>', 'Beta Reporter 2', true),
  ('<auth-user-id>', 'scopist1@domain', 'SCOPIST', '<firm-id>', 'Beta Scopist 1', true),
  ('<auth-user-id>', 'scopist2@domain', 'SCOPIST', '<firm-id>', 'Beta Scopist 2', true),
  ('<auth-user-id>', 'attorney1@domain', 'ATTORNEY', '<firm-id>', 'Beta Attorney 1', true);
```

Login verification:
1. Sign in as each user
2. Confirm role-appropriate dashboard
3. Confirm expected sidebar/navigation visibility

## F.3 Bug Reporting Channel

Recommended:
1. Configure `beta-feedback@depo-pro.com` (or `bugs@depo-pro.com`)
2. Add a structured template requiring:
   - user email
   - timestamp
   - repro steps
   - expected vs actual result
   - browser/device
   - screenshot link

## F.5 Sample Audio Package

Prepare and share 3-5 samples:
1. short (~5 min)
2. medium (~30 min)
3. long (~2 hr)
4. medical terminology
5. noisy/background audio
