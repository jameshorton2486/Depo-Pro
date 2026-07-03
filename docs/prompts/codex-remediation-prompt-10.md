# PROMPT 10 — Debt sweep

**Context.** Remaining lower-priority issues include duplicate required-field logic, a missing Python dependency, existing ESLint warnings, and an oversized main bundle warning.

**Task.**
1. Consolidate required-field readiness semantics into `src/lib/ufm/requiredFields.ts`, remove the duplicate source of truth, delete the TODO, and add a locking test.
2. Add the missing `docxtpl` dependency to `transcript_formatter/requirements.txt` and verify the Python suite passes in a clean environment.
3. Resolve the `react-refresh` and `react-hooks/exhaustive-deps` warnings with a consistent approach.
4. Reduce the main bundle size with chunking or a documented waiver if the split is not worth it.

**Acceptance / verification.**
1. Reduce the lint warning count and state before and after.
2. Confirm the Python tests pass cleanly.
3. Remove the build-size warning or document the waiver.
4. Report the commit hash for each separately landed sub-fix if you split them.
