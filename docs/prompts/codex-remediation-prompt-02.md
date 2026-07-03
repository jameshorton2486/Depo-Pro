# PROMPT 2 — Wire up the component test runner so `.test.tsx` files actually execute

**Context.** `vitest.config.ts` sets `environment: "node"` and `include: ["src/**/*.test.ts"]`. That excludes all `.test.tsx` files. Several component tests call `createRoot`, `document`, or `root.render`, which need a DOM. `jsdom` or `happy-dom` and `@testing-library/react` are not in `package.json`. The passing test count therefore excludes component tests entirely.

**Task.**
1. Add the minimum dev dependencies required to run the component tests. Prefer `jsdom`, `@testing-library/react`, and `@testing-library/dom`.
2. Update `vitest.config.ts` to include both `src/**/*.test.ts` and `src/**/*.test.tsx`. Either run the whole suite in `jsdom` or keep `node` global and mark DOM tests with `@vitest-environment jsdom`. State which approach you chose and why.
3. Run the full suite. Fix any component tests that were silently broken while excluded. If a test no longer matches intended behavior, fix the test and note the reason.

**Acceptance / verification.**
1. `npm test` must report a higher file and test count that now includes the component tests. Paste before and after counts.
2. Deliberately break one component, show a relevant `.test.tsx` test now fails, then revert the break.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, and report the commit hash.
