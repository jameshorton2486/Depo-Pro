# TRANSCRIPT SOURCE OF TRUTH AUDIT

## Scope

- Transcript: `tr_1781559088619_7rch7i`
- Case: `case_20260615_m4rj6r`
- Job: `9b17a0c5-6da7-4daf-bb4a-7c66d62cf141`
- Mode: Read-only audit
- Goal: prove how the workspace render path differs from the export path for the same transcript ID

## Executive Summary

- The workspace and export paths read the **same transcript family of rows** for this transcript:
  - `transcript_speakers`
  - `transcript_utterances`
  - `transcript_words`
- They do **not** use the same representation after load.
- The first structural split is:
  - Workspace: `EditorDocument -> buildEditorContent(...) -> buildWorkspaceParagraphs(...)`
  - Export: `snapshot rows -> buildStageSDocxParagraphSpecs(...) -> renderStageS(...)`
- The first text-source split is:
  - Workspace text comes from word-level `working_text ?? raw_text`
  - Export text comes from persisted `transcript_utterances.text` when a snapshot is present

## Question 1

### Do both paths read the same transcript rows?

Yes, at the storage layer.

- Workspace loads snapshot rows through:
  - [loadTranscriptSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/transcriptRepository.ts:312)
  - [buildEditorDocumentFromSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:124)
- Export screen loads ordered snapshots through:
  - [loadOrderedTranscriptSnapshotsForCase](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/transcriptRepository.ts:303)
  - [buildEditorDocumentFromSnapshot](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/ExportScreen.tsx:350)

For `tr_1781559088619_7rch7i`, the audited persisted counts are:

- speakers: 8
- utterances: 2119
- words: 13944
- overlay rows: 8
- transcript row metadata:
  - transcripts.utterance_count: 2119
  - transcripts.word_count: 13944
  - transcripts.speaker_count: 8

## Question 2

### Does workspace use `working_text` while export uses `text`?

Yes.

- Workspace document words are built from:
  - [workspaceService.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/api/workspaceService.ts:151)
  - `text: word.working_text ?? word.raw_text`
- Export Stage S utterances are built from snapshot utterance rows:
  - [exportDocx.ts](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:81)
  - `text: utterance.text`

Measured on this transcript:

- utterance row text mismatches vs joined workspace word text: 0

First 10 mismatches:
- none

## Question 3

### For speaker transformations such as `THE REPORTER:` or `MR. THOMAS:`, which path contains the transformation?

Both paths perform transformations, but they do it **differently**.

- Workspace speaker/paragraph rendering:
  - [buildEditorContent](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/buildEditorContent.ts:14)
  - [buildWorkspaceParagraphs](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/workspaceParagraphs.ts:32)
  - [buildTranscriptSpeakerIdentityMap](/abs/path/C:/Users/james/Projects/Depo-Pro/src/lib/transcript/speakerIdentity.ts:31)
- Export speaker/paragraph rendering:
  - [buildStageSDocxParagraphSpecs](/abs/path/C:/Users/james/Projects/Depo-Pro/src/components/ExportScreen/exportDocx.ts:55)
  - [renderStageS](/abs/path/C:/Users/james/Projects/Depo-Pro/src/editor/stageS/renderer.ts:33)

This means identity and formatting are currently duplicated:

- Workspace labels are derived from workspace identity + paragraph classification
- Export labels are derived from Stage S participant mapping + Stage S line rendering

## Question 4

### Count differences

Workspace semantic line count: 2134
Export semantic line count: 2119
Persisted utterance row count: 2119

Workspace kinds:
  - Q: 1074
  - A: 809
  - COLLOQUY: 236
  - by_line: 14
  - examination: 1

Export kinds:
  - colloquy: 2119

Workspace top labels:
  - NUNEZ: 1042
  - THOMAS: 809
  - THE REPORTER: 154
  - SPEAKER 5: 71
  - CUKJATI: 32
  - SPEAKER 7: 7
  - SPEAKER 6: 4

Export top labels:
  - SPEAKER 1: 981
  - SPEAKER 2: 809
  - SPEAKER 0: 154
  - SPEAKER 5: 71
  - SPEAKER 4: 61
  - SPEAKER 3: 32
  - SPEAKER 7: 7
  - SPEAKER 6: 4

First divergence index: 0

Workspace at divergence:
- COLLOQUY|THE REPORTER|Good afternoon, mister Nunez.

Export at divergence:
- colloquy|SPEAKER 0|Good afternoon, mister Nunez.


First 20 workspace semantic lines:
1. COLLOQUY|THE REPORTER|Good afternoon, mister Nunez.
2. examination||EXAMINATION
3. by_line||BY NUNEZ:
4. Q|NUNEZ|Good afternoon. How are you?
5. COLLOQUY|THE REPORTER|I'm good. How are you? Doing well.
6. COLLOQUY|THE REPORTER|Good.
7. COLLOQUY|THE REPORTER|Good afternoon.
8. COLLOQUY|THE REPORTER|Good afternoon.
9. Q|NUNEZ|Good afternoon.
10. COLLOQUY|THE REPORTER|Hello?
11. COLLOQUY|THE REPORTER|Can you hear me okay?
12. A|THOMAS|Yes, ma'am.
13. COLLOQUY|THE REPORTER|Okay. I can hear you great. Are you mister Thomas?
14. Q|NUNEZ|Yes, ma'am.
15. COLLOQUY|THE REPORTER|Okay.
16. COLLOQUY|THE REPORTER|Mister Thomas, I'm Mia, the court reporter.
17. COLLOQUY|THE REPORTER|Could you tell me the address that you're at today, sir?
18. A|THOMAS|12135
19. A|THOMAS|Stoney Glen,
20. A|THOMAS|San Antonio, Texas

First 20 export semantic lines:
1. colloquy|SPEAKER 0|Good afternoon, mister Nunez.
2. colloquy|SPEAKER 1|Good afternoon. How are you?
3. colloquy|SPEAKER 0|I'm good. How are you? Doing well.
4. colloquy|SPEAKER 0|Good.
5. colloquy|SPEAKER 0|Good afternoon.
6. colloquy|SPEAKER 0|Good afternoon.
7. colloquy|SPEAKER 1|Good afternoon.
8. colloquy|SPEAKER 0|Hello?
9. colloquy|SPEAKER 0|Can you hear me okay?
10. colloquy|SPEAKER 2|Yes, ma'am.
11. colloquy|SPEAKER 0|Okay. I can hear you great. Are you mister Thomas?
12. colloquy|SPEAKER 1|Yes, ma'am.
13. colloquy|SPEAKER 0|Okay.
14. colloquy|SPEAKER 0|Mister Thomas, I'm Mia, the court reporter.
15. colloquy|SPEAKER 0|Could you tell me the address that you're at today, sir?
16. colloquy|SPEAKER 2|12135
17. colloquy|SPEAKER 2|Stoney Glen,
18. colloquy|SPEAKER 2|San Antonio, Texas
19. colloquy|SPEAKER 2|78247.
20. colloquy|SPEAKER 0|Thank you.

## Findings

### Proven Facts

- The same transcript ID is being loaded from the same persisted transcript tables.
- The workspace and export paths do not share one paragraph engine.
- The workspace path is word-driven after load.
- The export Stage S path is utterance-row-driven after load.
- This transcript currently has 0 utterance-level text mismatches between `transcript_utterances.text` and the workspace word-joined text.

### Implication

The mismatch between screenshots and the exported DOCX is explained by architecture, not by the presence of two different transcript IDs. The system currently has **one transcript record with two downstream formatting engines**.

## Recommendation

Do not build more transcript-format engines on top of this split.

Choose one canonical transcript representation for:

- workspace
- DOCX export
- future PDF export
- certification view
- Q/A reconstruction
- transcript geometry

Single next architectural task:

- **Unify workspace and export on one transcript paragraph model**

Only after that should the next engine be built, likely:

- Q/A Reconstruction Engine
