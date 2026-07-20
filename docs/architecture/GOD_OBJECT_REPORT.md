# God Object Report

| Module | Current responsibilities | Assessment | Recommended boundary |
|---|---|---|---|
| `transcribe-callback/index.ts` | callback authentication, raw artifact storage, error routing, multi-file finalization, ingest coordination, boundary/pre-workspace invocation, snapshots, pruning, AI trigger | Large but appropriate orchestration edge function | Keep it orchestration-only. Continue moving semantic rules into imported modules. |
| `transcriptParagraphs.ts` | paragraph production, Q/A/SP/PN/HEADER typing, proceedings text, examination transitions, structural parentheticals, by-lines, display serialization, Q/A repair invocation | High-risk broad semantic owner | Keep it active for now; split only along proven stable contracts: proceedings/examination event production, dialogue classification, and paragraph rendering. |
| `speakerResolutionEngine.ts` | deterministic speaker matching, role inference, display names, overrides, confidence/evidence, display-document construction | Broad but cohesive identity domain | Preserve as speaker-semantic owner; consume `entityRegistry` rather than add another identity module. |
| `correctionOrchestrator.ts` | detects deterministic matches, low confidence, money, speaker issues, retranscription candidates, and queue curation | Broad review/report owner | Make it the sole review-queue assembler or reduce it to evidence collection once a persisted queue owner exists. |
| `cfe.ts` | line construction, punctuation, deterministic correction application, flags, grouping, geometry interaction | Broad formatting compiler | Establish CFE as current formatting owner; extract only after tests establish a stable intermediate representation. |

This report is not a refactoring directive. It identifies high-change modules whose owner boundaries must be protected before new behavior is added.
## Scope evidence

The audit identifies responsibility breadth, not a line-count threshold. Source files
change during normal implementation, so this report intentionally does not preserve
stale line counts. Reproduce the current measurements with the commands in
[Audit Method and Evidence](AUDIT_METHOD_AND_EVIDENCE.md) before using size as a
refactoring signal.

`transcriptParagraphs.ts` combines at least eight concerns: speaker-label use,
paragraph typing, Q/A production, proceedings metadata text, examination transitions,
structural parentheticals, source/provenance collection, and display serialization.
`speakerResolutionEngine.ts` remains cohesive to speaker identity, role, and evidence.
`transcribe-callback/index.ts` is an orchestration boundary for persistence and error
routing rather than a competing semantic-inference owner.

The clearest later-stage-work smell is `transcriptParagraphs.ts` generating proceedings metadata text from `CaseRecord` during paragraph construction. This is active behavior, not an assertion that it is wrong; it should be the first boundary examined if proceedings production is extracted.
