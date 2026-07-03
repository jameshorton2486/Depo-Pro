# PROMPT 9 — Implement real DOCX/PDF export or explicitly gate it

**Context.** `src/components/ExportScreen/ExportScreen.tsx` currently renders literal placeholders for DOCX and PDF export, while the Python formatter exists but is not connected to the web export path.

**Task.**
1. Choose one path and state it clearly.
2. Option A: implement a real export path using the existing formatter authority and wire the Export screen to it.
3. Option B: honestly gate the controls for beta with a disabled state and a linked tracking note in `NUMBERING_REGISTRY.md`.

**Acceptance / verification.**
1. For Option A, produce a sample export and verify formatting rules survive.
2. For Option B, show the gated UI state and the tracking entry.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, and report the commit hash.
