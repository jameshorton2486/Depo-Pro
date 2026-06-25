# P4 — Copy Transcript Audit

Date: 2026-06-25
Branch: `feature/stage3-workspace-core`
Auditor: Codex

## Entry point

No transcript-copy entry point exists in the current Stage 3 / Stage 7 UI.

Codebase search results:

### Clipboard API usage

- [src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx](C:/Users/james/projects/depo-pro/src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:12)
  - `navigator.clipboard.writeText(text)`
- [src/components/IntakeScreen/UfmPayloadPreview.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:38)
  - `navigator.clipboard.writeText(text)`

These are unrelated preview-copy helpers for:
- Deepgram request preview
- UFM payload preview

### Copy-flavored UI labels

- [src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx](C:/Users/james/projects/depo-pro/src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:8)
  - `CopyButton`
- [src/components/IntakeScreen/UfmPayloadPreview.tsx](C:/Users/james/projects/depo-pro/src/components/IntakeScreen/UfmPayloadPreview.tsx:34)
  - `CopyButton`

No `Copy Transcript`, `copyTranscript`, `handleCopy`, `onCopy`, or `CopyButton` hits were found in:
- Workspace
- Export screen
- Transcript editor

### Export screen read

- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:1)

This screen exposes only:
- `Export TXT`
- `Export Package`

There is no copy-to-clipboard action in this file.

### `serializeFormattedDocument` usage

- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:55)
- [src/lib/format/serialize.ts](C:/Users/james/projects/depo-pro/src/lib/format/serialize.ts:22)
- test-only references in [src/lib/format/cfe.test.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.test.ts:9)

The only production use of `serializeFormattedDocument` is the Export screen TXT/package export path.

## Failure mode

`E — Button not present`

Evidence:

1. There is no transcript-copy button or handler in the Export screen.
2. There is no transcript-copy button or handler in the workspace-related UI.
3. The only clipboard handlers in the app are for Deepgram/UFM preview text, not transcript output.

This means the reported failure is most likely a missing feature rather than a broken existing handler.

Secondary interpretation:

- If the user expectation was “copy transcript text from Export,” the current UI does not provide that action at all.
- If there was a historical button or mock-only control outside the checked source tree, it is not present in the current branch.

## Serialization path

N/A for the reported copy action, because no transcript-copy handler exists.

Relevant existing export path:

`docState.document`
→ `cfe(document, DEFAULT_GEOMETRY_PROFILE, abbreviationRegistry)`
→ `serializeFormattedDocument(formattedDoc)`
→ `downloadBlob(...)`

This path is used for TXT export, not clipboard copy.

## Certification gate

The Export screen gates both existing export buttons on `certificationReady` and `docState.document`:

- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:112)
- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:139)

`certificationReady` is derived from `localStorage`:

- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:38)
- [src/components/ExportScreen/ExportScreen.tsx](C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:40)

Assessment:

1. Is copy gated on `certificationReady`?
   - No, because no copy action exists in this screen.

2. Does `certificationReady` evaluate before certification is complete?
   - Yes. It returns `false` when no certification record is present in `localStorage`.

3. Is the gate relevant to the copy bug?
   - Not directly. The gate controls TXT/package export only.
   - If a future transcript-copy action is added to Export and intended for pre-certification review, reusing this gate would likely be a product bug.

## Browser reproduce result

To be filled in by James after manual browser test.

Suggested manual checks:

1. Open the workspace with the Etminan job.
2. Navigate through Workspace and Export.
3. Confirm whether any visible `Copy Transcript` control exists.
4. If one exists outside current source expectations, click it with DevTools open and record:
   - console output
   - thrown error
   - whether anything reaches the clipboard

## Recommended fix

The minimal freeze-safe fix is not to repair a broken clipboard handler, because none exists for transcript copy in the current branch. The actual fix is to build a small, explicit transcript-copy feature using the existing TXT export serialization path (`docState.document` → `cfe()` → `serializeFormattedDocument()`), then send the resulting string to `navigator.clipboard.writeText(...)` with a clear fallback/error surface.

That is a feature implementation task, not a patch to an existing broken handler. It needs a separate scoped prompt.

## Freeze-safety assessment

Yes, this can be fixed under BETA_FREEZE.

- No schema change required
- No migration required
- No new dependency required
- Likely one small UI/service implementation using existing serialization logic

Because the current issue is `missing capability`, not `broken persistence`, the next step should be a narrowly scoped implementation prompt rather than a bugfix patch against existing clipboard code.
