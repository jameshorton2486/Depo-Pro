# Bugs Found

## 1. Flagged-word PATCH authorization gap
- File path: `app/api/jobs/[id]/flagged-words/route.ts`
- Function name: `PATCHHandler`
- Description: The route authorizes any user with role `SCOPIST` to mutate flagged-word edits, even when they are not the job owner, not an admin, and not in the same firm. The new integration test demonstrates an unrelated scopist receiving `200` instead of `403`.
- Expected: A scopist should only be allowed to edit jobs they are assigned to or otherwise explicitly authorized for.
- Actual: The handler accepts any `SCOPIST` role and proceeds with the edit path.
