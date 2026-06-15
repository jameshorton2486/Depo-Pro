# Codex Task — STEP 6: write-protect raw speaker columns post-ingest (final hardening)

**Mode: IMPLEMENTATION. One commit. Audit-first. BETA_FREEZE — schema/DB-policy exception
authorized for THIS task (the immutability guard only).**

**Forward-looking prompt:** assumes Steps 1–5 landed — NO code path writes raw speaker
identity anymore (mapping, normalization, and reassignment all go through the overlay; all
readers consume the resolver). Task 0 re-verifies this is TRUE before adding the lock. If any
code path still writes raw speaker columns, STOP and report — you cannot safely lock a column
that something still writes.

Step 6 (final) of `SPEAKER_RESOLUTION_ARCHITECTURE_DECISION`. This enforces the principle
that has been the point of the whole arc: **raw Deepgram speaker data is immutable after
ingest.** Until now that's been upheld by discipline (no code writes it); this step makes it
*enforced* — so a future change can't silently reintroduce a raw-write regression.

Raw speaker columns to protect (re-confirm in Task 0):
- `transcript_speakers`: the Deepgram-origin fields (`speaker_id`, `speaker_index`, original
  label, and the `assigned_name`/`role`/`speaker_label`/`display_name` columns that Steps 3–4
  stopped writing)
- `transcript_utterances`: `speaker_id`, `speaker_index`, `speaker_label`
- `transcript_words`: `speaker_id`, `speaker_index`

---

## Task 0 — Audit first (read-only; report before coding). The precondition is everything.

1. **PROVE no code writes raw speaker columns anymore.** Search the entire codebase (app +
   Edge Functions) for ANY write (`update`, `upsert`, `insert`-with-these-columns post-ingest)
   to the raw speaker columns above. The ONLY permitted writer is the ingest path
   (`transcriptRepository.ts:362–407` region). Every reassignment/normalization/mapping write
   must already go to the overlay. **If you find ANY remaining raw speaker write outside
   ingest, STOP and report — Step 6 cannot proceed until it's migrated.** List what you find.
2. **The ingest writer.** Confirm exactly which code path legitimately writes these columns at
   ingest, so the lock permits ingest but blocks everything after.
3. **Enforcement mechanism options.** Evaluate how to enforce immutability and recommend:
   - **(a) DB-level** — a trigger on `transcript_speakers`/`utterances`/`words` that raises on
     UPDATE of the protected columns (allowing the ingest INSERT, blocking later UPDATEs);
     and/or RLS that forbids UPDATE. Strongest — enforced regardless of which client writes.
   - **(b) App-level** — a guard/lint/test that fails if these columns appear in a non-ingest
     write. Weaker (only catches code that goes through the guard).
   Recommend, weighted toward the owner's legal-defensibility priority. DB-level is likely
   correct, but report how existing triggers/RLS are structured so the lock matches conventions
   and does not break the ingest INSERT.
4. **Ingest compatibility.** Confirm the chosen lock does NOT block the legitimate ingest write
   (INSERT) — only post-ingest mutation. If ingest does any UPDATE of these columns (e.g. a
   two-phase write), the lock must accommodate it. Report ingest's exact write pattern.

**Stop and report Task 0 — especially #1.** If anything still writes raw speaker columns, this
step does not start.

---

## Task 1 — Implement the lock (only if Task 0 #1 is clean)

- Add the recommended enforcement (likely a DB trigger/policy migration) that permits the
  ingest write and blocks all post-ingest mutation of the protected raw speaker columns.
- Additive/non-destructive: it adds a guard; it does not alter data or existing behavior of
  any compliant path (all of which now use the overlay).
- Match existing migration + trigger + RLS conventions (per Task 0).

## Task 2 — Tests
- A test proving a post-ingest UPDATE to a protected raw speaker column is rejected.
- A test proving the ingest write still succeeds (lock doesn't break ingestion).
- Existing overlay write/read tests still pass (compliant paths unaffected).

---

## Verification gate (report all)
- `git rev-parse HEAD` before/after (parent = certified Step 5 commit). Both.
- `git status --porcelain` clean.
- `npm run typecheck` tail.
- `npm test` before/after counts.
- Files changed (expected: one migration, maybe a test; name anything else).
- One-paragraph note: Task 0 #1 confirmed NO non-ingest raw speaker writes remain; the lock
  permits ingest and blocks post-ingest mutation; mechanism used (DB trigger/RLS); ingest
  verified still working; compliant overlay paths unaffected. **This completes the
  raw-immutability principle: raw speaker data is now enforced-immutable, not just
  by-convention.**

## Commit
```
feat(schema): enforce raw speaker-column immutability post-ingest (final hardening)

Step 6 (final) of the speaker-resolution overlay architecture. Adds a DB-level
guard that permits the ingest write but blocks any post-ingest mutation of raw
speaker columns on transcript_speakers/utterances/words. With Steps 3-5 having
moved all human speaker decisions to the overlay, no compliant path is affected;
this makes raw immutability enforced rather than convention. Provenance locked.
```

## Do NOT
- Do NOT proceed if Task 0 finds any remaining non-ingest raw speaker write — report instead.
- Do NOT block or alter the legitimate ingest write.
- Do NOT migrate/alter existing data.
- Do NOT loosen the overlay or resolver.
- One concern, one commit. Full verification block.

---

## After Step 6 — the arc is complete

With Step 6 landed, the speaker-resolution architecture is done: raw is enforced-immutable,
all human resolution is overlay, the resolver is the single read authority, Stage S consumes
resolved participants. The deferred **Stage S visual diff** (Thomas/Baier/Etminan in Word vs
hand-built references) is now both unblocked and meaningful — run on a transcript that maps
correctly through an architecture that preserves provenance. Then: default-flip
`VITE_USE_STAGE_S_EXPORT` (after Miah confirms recess/resumed wording), and the roadmap's
later phases (correction, exhibits, templates) build on the clean participant authority.
```
