# PROMPT 8 — Remove real deposition PII from the repo

**Context.** `etminan_response.json` and `scripts/fixtures/garza-home-depot.txt` contain real identifying deposition data and should not remain in source control.

**Task.**
1. Remove both files from the working tree. If either is needed as a fixture, replace it with a synthetic equivalent that preserves structure but uses fabricated names, case numbers, and emails.
2. Add `.gitignore` patterns to prevent re-adding raw response dumps and real fixtures, and add a short note to `AGENTS.md` prohibiting real client transcript data in the repo.
3. Add a `docs/operations/GITHUB_CLEANUP_PLAN.md` entry documenting the required history rewrite before the repo is shared.

**Acceptance / verification.**
1. Confirm the removed filenames no longer appear in tracked files.
2. Ensure affected tests or scripts still pass against synthetic fixtures.
3. Run `npm test` and report the commit hash.
