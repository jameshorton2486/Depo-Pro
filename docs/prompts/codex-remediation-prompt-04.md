# PROMPT 4 — Clear the ESLint errors blocking `npm run lint`

**Context.** `npx eslint .` reports 5 errors: four unused mock args in `src/api/workspaceService.audio.test.ts`, plus a useless regex escape in `src/lib/transcriptDownloads.ts`.

**Task.**
1. In `src/lib/transcriptDownloads.ts`, change `/\"/g` to `/"/g` and add or extend a test proving the HTML escaping output is unchanged.
2. For the mock in `src/api/workspaceService.audio.test.ts`, either configure `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: "^_"` in `eslint.config.js`, or remove the unused params from the mock signatures. Prefer the config change unless there is a reason not to.

**Acceptance / verification.**
1. `npx eslint .` must report zero errors.
2. Run `npm run typecheck`, `npm run lint`, `npm test`, and report the commit hash.
