# DEPO-PRO W22-2 Traceability Matrix

This matrix links the canonical structured transcript contract to the implementation prompts and the current repository owners expected to satisfy each responsibility.

Canonical authority:

- `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`

If a prompt, file, or implementation detail conflicts with the contract, the contract wins.

---

## Traceability Matrix

| Contract Area | Contract Section | Implementation Phase | Current Primary Files |
| --- | --- | --- | --- |
| Canonical design principles | `Canonical Design Principles` | W22-2A | `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`, `docs/audits/W22-2A_IMPLEMENTATION_PROMPT.md` |
| Contract identity and versioning | `Contract Object`, `Versioning` | W22-2A | `src/lib/transcript/structuredTranscriptPackage.ts` |
| Resolved speaker identity | `Contract Object`, `Semantic Requirements`, `Ownership` | W22-2B | `src/lib/transcript/speakerResolutionEngine.ts` |
| Resolved speaker roles | `Contract Object`, `Semantic Requirements`, `Ownership` | W22-2B | `src/lib/transcript/speakerResolutionEngine.ts` |
| Structured paragraph and line assembly | `Contract Object`, `Semantic Requirements`, `Ownership` | W22-2B | `src/lib/transcript/transcriptParagraphs.ts` |
| Pre-workspace orchestration | `Ownership`, `Lifecycle` | W22-2B | `src/lib/transcript/preWorkspaceStructure.ts` |
| Contract builder assembly | `Contract Object`, `Ownership`, `Lifecycle` | W22-2B | `src/lib/transcript/structuredTranscriptPackage.ts` |
| Provenance requirements | `Contract Object`, `Provenance`, `Invariants` | W22-2A / W22-2B | `src/lib/transcript/structuredTranscriptPackage.ts`, `src/lib/transcript/transcriptParagraphs.ts` |
| Confidence and review metadata | `Contract Object` | W22-2A / W22-2B | `src/lib/transcript/structuredTranscriptPackage.ts` |
| Consumer read-only rule | `Consumer Rules`, `Invariants` | W22-2C | `src/lib/buildEditorContent.ts`, `src/lib/transcriptDownloads.ts`, workspace/export consumers |
| Workspace contract consumption | `Consumer Rules` | W22-2C | `src/lib/buildEditorContent.ts`, `src/components/TranscriptEditor/TranscriptEditor.tsx` |
| Export contract consumption | `Consumer Rules` | W22-2C | `src/lib/transcriptDownloads.ts`, export-related components and serializers |
| Legacy semantic reconstruction removal | `Migration Rules`, `Invariants` | W22-2D | `src/lib/transcript/qaFixer.ts`, `src/lib/transcript/deterministicSpeakerMap.ts`, `src/lib/transcript/workspacePresentation.ts` |
| Contract-level regression protection | `Testing Requirements` | W22-2A / W22-2B / W22-2C / W22-2D | contract, producer, and consumer test files under `src/lib/transcript/` and `src/components/` |

---

## Notes

- File ownership here reflects the current repository structure and should be updated only when semantic ownership genuinely moves.
- This matrix does not grant authority to any file by itself; authority derives from the canonical contract.
- During migration, compatibility shims may remain temporarily, but they must not become alternate semantic owners.
