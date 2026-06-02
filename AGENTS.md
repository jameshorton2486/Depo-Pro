# AGENTS.md — House Rules for Bolt / AI Agents

These rules are **locked**. Any agent working on this project must re-read this file
**and `docs/architecture/MASTER_ARCHITECTURE.md`** before touching code. When any rule here conflicts with
`docs/architecture/MASTER_ARCHITECTURE.md`, the master architecture document governs.
The full architecture document set lives in `docs/architecture/`.
Violations must be reverted before a prompt is considered complete.

---

## Stack

- **Runtime**: Vite + React 18 + TypeScript. No Next.js, no SSR.
- **Styling**: Tailwind CSS only. No external component libraries, no UI theme packages.
- **Editor core**: TipTap v2 on ProseMirror.
- **Audio**: wavesurfer.js v7.
- **Real-time collaboration**: Yjs is **deferred**. Do not add it unless explicitly instructed.
- **Audit trail v1**: Plain append-only client-side change log. No Yjs or CRDT in v1.

---

## Architecture

1. **Embedded widget — not a website.** The app mounts into a single DOM node identified
   by `config.mountSelector`. No hard-coded routes. No `<BrowserRouter>`.
2. **Single network module.** All `fetch()` calls live in `src/api/client.ts`. No other
   file may call `fetch()` directly.
3. **Mocks in dev.** In `import.meta.env.DEV`, MSW intercepts all API calls and serves
   data from `src/mocks/fixtures.ts`. Swap to real backend by changing `apiBaseUrl` only.
4. **Singleton entry point.** `src/main.tsx` exports `mountEditor(config)` and auto-mounts
   from `window.DEPO_EDITOR_CONFIG` in dev/standalone mode.

---

## Data integrity

- **`raw_text` is immutable.** Never write to `Word.raw_text`. Edits change `text` only.
- **Word IDs are stable.** Edits, merges, and splits must preserve or deterministically
  derive IDs. Never regenerate the entire document's IDs.
- **No client-side persistence.** Do not use `localStorage` or `sessionStorage` for
  transcript data. The server is the source of truth; component state holds the working copy.

---

## Performance

- **Audio current-time must not live in React state.** Use a `ref` + direct DOM class
  toggling (`word-playing`) via `requestAnimationFrame`. Binary-search over word timestamps.
- **Virtualize the utterance list.** Use `@tanstack/react-virtual`. Do not render all
  utterances' DOM at once. Target: smooth typing and scrolling at 30,000+ words.

---

## Code quality

- **No `any`.** TypeScript strict mode is on.
- **Keep components small and typed.**
- **Default: no comments.** Add one only when the WHY is non-obvious.
- **No half-finished implementations.** Do not leave `// TODO` stubs in delivered code.

---

## UI tone

Clean, modern, legal-professional. Resembles Microsoft Word / Case CATalyst:

- Serif body font (Libre Baskerville) for transcript text.
- Monospace (JetBrains Mono) for line numbers and timestamps.
- Sans-serif (Inter) for UI chrome.
- Restrained color palette: slate neutrals, blue accents, no purple/indigo.
- No cartoonish elements, no emoji in UI, no rounded-bubble chat aesthetic.

---

## Contract

The API contract types in `src/api/types.ts` are **frozen**. Never rename or reshape them.
If a feature seems to need a new field, add it to a separate local type and leave the
contract types untouched. Log all deviations in `CONTRACT_NOTES.md`.
