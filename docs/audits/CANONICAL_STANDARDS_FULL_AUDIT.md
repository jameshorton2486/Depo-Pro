# Canonical Standards Full Implementation Audit

Date: 2026-06-26  
Branch: feature/stage3-workspace-core  
Test baseline: 334 tests passing  
Authority: `CANONICAL_EDITORIAL_POLICY.md` > `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` > `DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` > `DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` > `abbreviation_registry.json`  
Certified ground truth: Etminan transcript, Miah Bardot CSR 12129

## Executive Summary
The live SaaS implementation has most of the display-safe canonical rules in place: DP-010 spacing is active through the CFE, DP-011 geometry values are aligned with the current geometry profile, Q/A splitting and objection handling are active in `qaFixer`, and speaker-protection plus honorific witness/attorney labels are active in `workspacePresentation` [src/lib/format/cfe.ts:201-216] [src/lib/format/geometryProfile.ts:3-17] [src/lib/transcript/qaFixer.ts:62-151] [src/lib/transcript/workspacePresentation.ts:121-127,304-347]. The biggest remaining gaps are export hygiene and advanced transcript-shape details: inline `[SCOPIST: FLAG]` markers are still included in delivery text, `(BY MR. ___)` re-entry formatting is not implemented, and the “registry as single source” rule is only partial outside the CFE [src/lib/format/serialize.ts:3-15] [src/lib/transcript/workspacePresentation.ts:95,521,564] [src/lib/transcript/paragraphDisplayImprovements.ts:8-23]. Audio sync is preserved because all active canonical corrections run in the display layer before render and do not mutate canonical word or utterance storage [src/lib/format/cfe.ts:545-632] [src/lib/transcript/qaFixer.ts:17-28,139-151] [src/lib/transcript/workspacePresentation.ts:479-568].

## Section 1: DP-010 Spacing Rules

### 1.1 Two spaces after sentence-ending `.`
Status: IMPLEMENTED  
Evidence: DP-010 defines sentence-ending punctuation as a two-space boundary and makes the registry the only exclusion list [Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md:21-28,67-69]. Runtime derives `sentenceBoundaries` from the registry and applies `"  "` when `isSentenceBoundary(...)` returns true [src/lib/format/cfe.ts:201-216,363-390]. Tests cover sentence-spacing versus honorific-spacing behavior [src/lib/format/cfe.test.ts:156-181].

### 1.2 Two spaces after sentence-ending `?` and `!`
Status: IMPLEMENTED  
Evidence: The registry declares `.` `?` and `!` as `two_space_boundaries` [Canonical Standards Folder/abbreviation_registry.json:6-10]. `sentenceBoundaries` is built from that data and consumed by `isSentenceBoundary` / `buildTrailingSpace` [src/lib/format/cfe.ts:207,363-390]. Quoted-question tests cover the `?` path [src/lib/format/cfe.test.ts:225-235].

### 1.3 Two spaces after closing quote when sentence ends inside quote
Status: IMPLEMENTED  
Evidence: DP-010 explicitly requires the two spaces to follow the closing quote [Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md:36,61,78]. Runtime handles this with `closesSentenceWithQuote` and `buildTrailingSpace` [src/lib/format/cfe.ts:240-245,381-390]. The quoted-question regression test exercises the sentence-end-inside-quote case [src/lib/format/cfe.test.ts:225-235].

### 1.4 Two spaces after speaker-label colon
Status: IMPLEMENTED  
Evidence: DP-010 and DP-011 both require two spaces after the speaker-label colon [Canonical Standards Folder/abbreviation_registry.json:8-10] [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:55]. `COLON_GAP` is defined as `"  "` and used by colloquy rendering [src/editor/stageS/colloquy.ts:1,10-15] [src/lib/transcript/workspacePresentation.ts:564]. Raw serialized formatted lines also use two spaces for `speaker_label` lines [src/lib/format/serialize.ts:9-15].

### 1.5 One space after all registry abbreviations
Status: IMPLEMENTED  
Evidence: `abbreviationRegistry.ts` imports the canonical JSON registry [src/lib/format/abbreviationRegistry.ts:1-4]. `buildSpacingRules` creates `oneSpaceTokens`, `oneSpacePatterns`, and `contextSensitiveTokens` exclusively from that registry, and `isRegistryToken` consults those rules for abbreviation spacing [src/lib/format/cfe.ts:201-216,345-360]. CFE tests pin `Mr.` to one space, not two [src/lib/format/cfe.test.ts:171-181].

### 1.6 `No.` context-sensitive rule
Status: IMPLEMENTED  
Evidence: DP-010 defines `No.` as one-space only in number context and two-space when spoken as a sentence-ending `No.` [Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md:46,59]. The registry marks `No.` as context-sensitive [Canonical Standards Folder/abbreviation_registry.json:28-31]. Runtime resolves this through `usesNumberAbbreviationRule` and `isRegistryToken` [src/lib/format/cfe.ts:329-360]. Tests cover both `No. 12129` and `No.  No.` and confirm the behavior is derived from registry metadata [src/lib/format/cfe.test.ts:184-221].

### 1.7 Registry as single source (no per-module hardcoding)
Status: PARTIAL  
Evidence: Policy says no module should maintain a competing abbreviation list [Canonical Standards Folder/CANONICAL_EDITORIAL_POLICY.md:103-104]. The CFE complies by consuming `abbreviationRegistry` [src/lib/format/abbreviationRegistry.ts:1-4] [src/lib/format/cfe.ts:201-216]. But hardcoded honorific handling remains outside the registry-backed spacing engine: `workspacePresentation.ts` strips `(MR|MS|MRS|DR)` directly [src/lib/transcript/workspacePresentation.ts:111-114], `colloquy.ts` normalizes those honorifics with a regex [src/editor/stageS/colloquy.ts:4], and `paragraphDisplayImprovements.ts` hardcodes `doctor` / `mister` replacements [src/lib/transcript/paragraphDisplayImprovements.ts:8-11]. `serialize.ts` and `transcriptDownloads.ts` do not introduce separate abbreviation lists [src/lib/format/serialize.ts:1-15] [src/lib/transcriptDownloads.ts:1-20].

## Section 2: DP-011 Geometry

### 2.1 Left margin 1.25″
Status: CONFIRMED  
Locked value: `1.25`  
Current value: `1.25`  
Evidence: DP-011 locks the left margin at `1.25″` [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,43,95]. `geometryProfile.ts` sets `leftMarginInches: 1.25` [src/lib/format/geometryProfile.ts:8].

### 2.2 Right margin 0.75″
Status: CONFIRMED  
Locked value: `0.75`  
Current value: `0.75`  
Evidence: DP-011 derives `0.75″` from the 6.5″ format box [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,107]. `geometryProfile.ts` sets `rightMarginInches: 0.75` [src/lib/format/geometryProfile.ts:9].

### 2.3 Tab stops 720 / 1440 / 2160 / 2880 + center 4680 twips
Status: CONFIRMED  
Evidence:
- `qaLabelInches = 0.5` [src/lib/format/geometryProfile.ts:12]
- `qaTextInches = 1.0` [src/lib/format/geometryProfile.ts:13]
- `speakerInches = 1.5` [src/lib/format/geometryProfile.ts:14]
- `parentheticalInches = 2.0` [src/lib/format/geometryProfile.ts:15]
- `centerInches = 3.25` [src/lib/format/geometryProfile.ts:16]  
These match DP-011’s canonical geometry table [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:43-48,107]. Regression pins explicitly lock Tab3 and Tab4 attrs in editor content [src/lib/buildEditorContent.test.ts:245-255].

### 2.4 Line spacing 28pt exact
Status: CONFIRMED  
Locked value: `28`  
Current value: `28`  
Evidence: DP-011 locks line spacing to `28pt exact` [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:65-67,127-128]. `geometryProfile.ts` sets `lineSpacingPoints: 28` [src/lib/format/geometryProfile.ts:10]. There is no direct regression test for `lineSpacingPoints` in `buildEditorContent.test.ts`, so the value is code-confirmed but not separately pinned there [src/lib/buildEditorContent.test.ts:245-255].

### 2.5 Lines per page: 25
Status: CONFIRMED  
Locked value: `25`  
Current value: `25`  
Evidence: DP-011 and the superseded geometry standard both require 25 lines per page [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,65-67] [Canonical Standards Folder/TRANSCRIPT_GEOMETRY_STANDARD.md:38,69,144]. `geometryProfile.ts` sets `linesPerPage: 25` [src/lib/format/geometryProfile.ts:4].

### 2.6 Return-to-margin continuation
Status: IMPLEMENTED  
Evidence: DP-011 locks continuation to return-to-margin rather than hanging indent [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:52,127]. CFE emits `continuation_mode: "return_to_margin"` [src/lib/format/cfe.ts:630]. Regression test pins that value [src/lib/format/cfe.test.ts:517-525].

### 2.7 wave8 `profile.py` tab conflict
Status: OUT OF SCOPE FOR THIS AUDIT  
Evidence: DP-011 explicitly calls out the wave8 tab-stop reconciliation as work for `wave8/backend/geometry/profile.py`, which is the desktop path, not this SaaS codebase [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:107].

### 2.8 Characters per line: 56–63 max
Status: CONFIRMED  
Allowed range: `56–63`  
Current value: `58`  
Evidence: `geometryProfile.ts` sets `charsPerLine: 58` [src/lib/format/geometryProfile.ts:5], which falls within the specified range.

## Section 3: DP-012 Punctuation, Flags, Paragraph Geometry

### 3.1 Quote before interrupting dash: no comma
Status: IMPLEMENTED  
Evidence: `normalizeInterruptingDash` strips a comma when the next token is `--` [src/lib/format/cfe.ts:410-417]. Regression coverage exists [src/lib/format/cfe.test.ts:238-251].

### 3.2 Question mark outside closing quote when sentence is the question
Status: IMPLEMENTED  
Evidence: `normalizeQuotedQuestionMark` rewrites `?` before a closing quote when followed by a new sentence [src/lib/format/cfe.ts:420-425]. The quoted-question regression expects the question mark outside the closing quote [src/lib/format/cfe.test.ts:225-235].

### 3.3 No comma introducing or ending dashed material
Status: PARTIAL  
Evidence: `normalizeInterruptingDash` removes the comma immediately before `--` [src/lib/format/cfe.ts:410-417]. That covers the “ending dashed material” case. There is no separate function or test covering the fuller DP-012 example `from, um, -- as`, so the rule is only partially enforced in the current codebase [src/lib/format/cfe.test.ts:238-251].

### 3.4 Date ordinals preserved, not auto-applied
Status: PRESERVED (correct)  
Evidence: DP-012 treats date-ordinal normalization as suggestion-only rather than auto-apply [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:106-107]. Current `cfe.ts` contains no ordinal stripper; its date normalization only handles slash dates [src/lib/format/cfe.ts:481-496,517-535]. Regression tests explicitly assert `17th` is preserved [src/lib/format/cfe.test.ts:253-263].

### 3.5 Age figures deterministic
Status: IMPLEMENTED  
Evidence: `shouldNormalizeNumberWord` and `normalizeNumberWord` normalize number words only in age/year contexts [src/lib/format/cfe.ts:453-479]. Tests cover multiple age/date normalization cases [src/lib/format/cfe.test.ts:267-291].

### 3.6 Direct-address titles lowercase
Status: REMOVED (correct)  
Evidence: DP-012 explicitly rejects auto-capitalizing direct-address `doctor` [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:106-107]. Current `cfe.ts` has no `DIRECT_ADDRESS_TITLES` map or capitalization helper [src/lib/format/cfe.ts:1-632]. Lowercase behavior is pinned in the regression suite [src/lib/format/cfe.test.ts:379-393].

### 3.7 Inline garble flag format
Status: IMPLEMENTED (without likely clause)  
Evidence: DP-012’s canonical example includes `likely "..."` in the flag [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:137-150]. Runtime `buildInlineFlag` emits `[SCOPIST: FLAG N: "token" — verify from audio]` without the likely clause [src/lib/format/cfe.ts:512-513]. Tests confirm additive, verbatim-preserving flags are present [src/lib/format/cfe.test.ts:406-422].

### 3.8 Clean delivery strips inline flag spans
Status: INCLUDED (gap)  
Evidence: `serializeWord` appends each `inline_flag` directly to the serialized output [src/lib/format/serialize.ts:3-7]. `buildFormattedTranscriptText` uses that serializer for raw transcript downloads [src/lib/transcriptDownloads.ts:13-19]. Structured workspace text also preserves inline flags because `serializeLineText` appends them during paragraph assembly [src/lib/transcript/workspacePresentation.ts:80-82]. There is no stripping pass in `transcriptDownloads.ts` [src/lib/transcriptDownloads.ts:1-20].

### 3.9 Three-tab paragraph rule
Status: PARTIAL  
Evidence: DP-012 defines Tab1/Tab2 for Q/A, Tab3 for new testimony paragraphs and speaker labels, Tab4 for parentheticals, with wraps returning to the left margin [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:162-188]. `geometryProfile.ts` encodes those tab values [src/lib/format/geometryProfile.ts:11-17], and `buildEditorContent.test.ts` pins Tab3 and Tab4 [src/lib/buildEditorContent.test.ts:245-255]. This remains partial because the current regression lock does not explicitly assert the full Q/A tab pair from the DP-012 rule text.

### 3.10 Resumption by-line `(BY MR. ___)` no colon
Status: NOT IMPLEMENTED  
Evidence: DP-012 ratifies `(BY MR. ___)` with no colon after `BY` [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:192-201]. Current workspace code emits `BY ${label}:` via `buildByLine` and never renders the parenthetical re-entry form [src/lib/transcript/workspacePresentation.ts:95,403,521]. There is no `cfe.test.ts` assertion for `(BY MR. ___)` [src/lib/format/cfe.test.ts:1-544].

### 3.11 Parenthetical canonical wording
Status: NOT ENFORCED  
Evidence: DP-012 locks full canonical parenthetical wording such as `(Exhibit No. 7 was marked for identification.)` [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:172]. Workspace code only detects whether text “looks like” a parenthetical and preserves it as such; it does not rewrite or enforce canonical parenthetical wording [src/lib/transcript/workspacePresentation.ts:99-109,389-413]. This remains manual in beta.

## Section 4: Q/A Structure and Speaker Labels

### 4.1 Short answer splitting
Status: IMPLEMENTED  
Evidence: `SHORT_ANSWER_PATTERN` and `splitShortAnswerParagraph` split `Yes.` / `No.` / `Correct.` / `I did.` / `I do.` / `I have.` / `I don't.` out of `Q.` blocks [src/lib/transcript/qaFixer.ts:3,82-120]. Tests cover both `Q/A` and `Q/A/Q` cases [src/lib/transcript/qaFixer.test.ts:15-33].

### 4.2 Objection splitting
Status: IMPLEMENTED  
Evidence: `splitEmbeddedObjections` and `splitQParagraph` split embedded objections into standalone `COLLOQUY` paragraphs [src/lib/transcript/qaFixer.ts:62-79,122-137]. Regression coverage exists [src/lib/transcript/qaFixer.test.ts:36-47].

### 4.3 Consecutive paragraph remerge
Status: IMPLEMENTED  
Evidence: `remergeConsecutive` is present and `applyQaFixer` returns `remergeConsecutive(result)` at the end [src/lib/transcript/qaFixer.ts:43-60,139-151].

### 4.4 Attorney display label `MR. SURNAME`
Status: IMPLEMENTED  
Evidence: `formatAttorneyDisplayLabel` emits `MR.` / `MS.` plus surname [src/lib/transcript/workspacePresentation.ts:121-127]. Attorney speaker assignment calls that function when setting `view.label` [src/lib/transcript/workspacePresentation.ts:335-340]. Regression coverage expects `MR. BENTLEY` [src/lib/transcript/workspacePresentation.test.ts:57-63,100-104].

### 4.5 Reporter/videographer protection from attorney override
Status: IMPLEMENTED  
Evidence: `patternAssignedIds` is created after pattern scoring and consulted before attorney scoring [src/lib/transcript/workspacePresentation.ts:304-321]. Tests verify reporter and videographer labels are not overridden by attorney names in the aggregate text [src/lib/transcript/workspacePresentation.test.ts:76-97].

### 4.6 Physician witness label `DR. SURNAME`
Status: IMPLEMENTED  
Evidence: `isPhysicianWitness`, `extractSurname`, and `formatWitnessDisplayLabel` detect `M.D.` / `Ph.D.` / `Dr.` / `EXPERT` and assign `DR. SURNAME` [src/lib/transcript/workspacePresentation.ts:144-174]. Witness assignment uses that formatter in both the initial witness inference and the single-witness record path [src/lib/transcript/workspacePresentation.ts:295-299,344-350]. Tests expect `DR. ETMINAN` and `THE WITNESS` for the non-physician case [src/lib/transcript/workspacePresentation.test.ts:57-63,106-114].

### 4.7 `PROCEEDINGS` / `EXAMINATION` / `BY_LINE` only when confirmed
Status: IMPLEMENTED  
Evidence: `structureConfirmed` is initialized false and only flips true on `CONFIRM_STRUCTURE` [src/context/DocumentContext.tsx:35,65,92,170-171,242,386]. `StructureReviewBanner` exposes `Review & Confirm` and `Keep Raw Labels` [src/components/StructureReviewBanner/StructureReviewBanner.tsx:27,35]. `buildFormattedTranscriptText` returns raw CFE output unless `structureConfirmed` is passed in [src/lib/transcriptDownloads.ts:10-19]. Tests confirm raw downloads omit `PROCEEDINGS` / `EXAMINATION` while structured downloads include them [src/lib/transcriptDownloads.test.ts:125-127,151-157]. `SECTION_HEADER` / `BY_LINE` are not filtered out once structured output is selected; they are intentionally included in structured exports [src/lib/transcript/workspacePresentation.ts:508-526,552-560] [src/lib/transcriptDownloads.ts:10-19].

## Section 5: Deterministic Garble Corrections

| Correction | Where | Present? | Tested? |
|---|---|---|---|
| `K.` → `Okay.` with two-space boundary | `qaFixer.ts` | Yes — `normalizeParagraphArtifacts` uses `K_PATTERN` [src/lib/transcript/qaFixer.ts:5,8-10] | Yes [src/lib/transcript/qaFixer.test.ts:49-56] |
| Slash dates `09/15/2023` → `September 15, 2023` | `cfe.ts` | Yes [src/lib/format/cfe.ts:481-496,525] | Yes [src/lib/format/cfe.test.ts:267-291] |
| `C572224L` → `C-5722-24-L` | `cfe.ts` garble map | Yes [src/lib/format/cfe.ts:85-94,499-509] | Yes [src/lib/format/cfe.test.ts:295-303] |
| `foramenot` → `foramen` | `cfe.ts` garble map | Yes [src/lib/format/cfe.ts:85-94,499-509] | Yes [src/lib/format/cfe.test.ts:305-315] |
| `curriculum of IT` → `curriculum vitae` | `cfe.ts` garble map | Yes [src/lib/format/cfe.ts:85-94,499-509] | Yes [src/lib/format/cfe.test.ts:331-341] |
| `Four.` → `Form.` after `Objection.` | `qaFixer.ts` | Yes — `normalizeObjectionText` rewrites `Four` to `Form` [src/lib/transcript/qaFixer.ts:12-15] | Yes [src/lib/transcript/qaFixer.test.ts:39-47] |
| `Mr. Ramos` → `Mr. Ramon` | `cfe.ts` context check | Yes — only with honorific context [src/lib/format/cfe.ts:527-531] | Yes [src/lib/format/cfe.test.ts:317-329] |
| `$7.50` → flagged | `cfe.ts` `shouldEmitInlineFlag` | Yes [src/lib/format/cfe.ts:300-325] | Yes [src/lib/format/cfe.test.ts:343-365] |
| `Waddell Signs` in medical library | `medicalTermLibrary.ts` | Yes [src/lib/keyterms/medicalTermLibrary.ts:15-47,88] | Yes [src/lib/keyterms/harvestKeyterms.test.ts:174,238] |
| `metastructures` → `ligamentous structures` | `cfe.ts` garble map | Yes [src/lib/format/cfe.ts:85-94,499-509] | No dedicated test found in `cfe.test.ts` [src/lib/format/cfe.test.ts:1-544] |
| `Waddells.` → `Waddell.` | `cfe.ts` garble map | Yes [src/lib/format/cfe.ts:85-94,499-509] | No dedicated test found in `cfe.test.ts` [src/lib/format/cfe.test.ts:1-544] |

## Section 6: Keyterm Harvesting

### 6.1 Spoken name variants generated
Status: IMPLEMENTED  
Evidence: `generateNameVariants` is present and generates stripped, surname-only, and first-name variants [src/lib/keyterms/harvestKeyterms.ts:128-151]. Witnesses and attorneys both feed those variants into harvesting [src/lib/keyterms/harvestKeyterms.ts:286-314].

### 6.2 Organization short-form variants
Status: IMPLEMENTED  
Evidence: `generateOrgVariants` is present [src/lib/keyterms/harvestKeyterms.ts:153-169]. Attorney firms and party organizations both use it [src/lib/keyterms/harvestKeyterms.ts:320-330,353-365].

### 6.3 Medical term library by case context
Status: IMPLEMENTED  
Evidence: `medicalTermLibrary.ts` exports `getMedicalTerms(...)` with a `personal_injury_spine` library containing more than 20 terms [src/lib/keyterms/medicalTermLibrary.ts:1-47,88]. `inferCaseContext` exists and `harvestKeyterms` injects those medical terms based on the inferred case context [src/lib/keyterms/harvestKeyterms.ts:171-191,286,443-450].

### 6.4 Party, videographer, interpreter names harvested
Status: IMPLEMENTED  
Evidence: `harvestKeyterms` includes dedicated loops for parties, interpreters, and videographers [src/lib/keyterms/harvestKeyterms.ts:341-399].

### 6.5 Case/audio integrity guard
Status: IMPLEMENTED  
Evidence: `TranscriptCreationScreen.tsx` imports `validateCaseAudioIntegrity` and computes `audioIntegrity` / `audioIntegrityWarning` before transcription actions [src/components/TranscriptCreationScreen.tsx:12,61-77]. The guard function itself lives in `caseAudioIntegrity.ts` [src/lib/keyterms/caseAudioIntegrity.ts:98-127], and dedicated tests exist [src/lib/keyterms/caseAudioIntegrity.test.ts:131-156].

## Section 7: Timing of Rule Application

| Rule | Applies at | Can run earlier? | Audio sync risk |
|---|---|---|---|
| DP-010 sentence spacing | CFE, before render [src/lib/format/cfe.ts:545-632] | Already earliest | None |
| DP-010 abbreviation one-space | CFE, before render [src/lib/format/cfe.ts:201-216,345-390] | Already earliest | None |
| Slash date normalization | CFE, before render [src/lib/format/cfe.ts:481-496,517-535] | Already earliest | None |
| Garble corrections map | CFE, before render [src/lib/format/cfe.ts:499-535] | Already earliest | None |
| Age figure normalization | CFE, before render [src/lib/format/cfe.ts:453-479,517-535] | Already earliest | None |
| Q/A short answer splitting | `qaFixer`, before render [src/lib/transcript/qaFixer.ts:82-151] | Already earliest | None |
| Objection splitting | `qaFixer`, before render [src/lib/transcript/qaFixer.ts:62-79,122-151] | Already earliest | None |
| Paragraph remerging | `qaFixer`, before render [src/lib/transcript/qaFixer.ts:43-60,139-151] | Already earliest | None |
| `K.` → `Okay.` | `qaFixer`, before render [src/lib/transcript/qaFixer.ts:8-10,139-151] | Already earliest | None |
| Speaker inference / labels | `workspacePresentation`, post-confirm render path [src/lib/transcript/workspacePresentation.ts:179-352] | Could cache on confirm | None |
| `PROCEEDINGS` / `EXAMINATION` markers | `workspacePresentation`, post-confirm render/export path [src/context/DocumentContext.tsx:170-171,386] [src/lib/transcriptDownloads.ts:10-19] | Same | None |
| Date ordinal stripping | Not implemented, by design [src/lib/format/cfe.ts:481-535] [src/lib/format/cfe.test.ts:253-263] | N/A | Canonical drift risk if added canonically |
| Money auto-correction | Not implemented; flagged instead [src/lib/format/cfe.ts:300-325] | N/A | Unsafe if auto-corrected |
| Participant directory | Not implemented in schema | N/A | Post-beta |

Key finding: all implemented display-layer rules already run before the transcript renders. Nothing needs to move earlier; the current architecture is correct for preserving sync while improving display fidelity [src/lib/format/cfe.ts:545-632] [src/lib/transcript/qaFixer.ts:139-151] [src/lib/transcript/workspacePresentation.ts:479-568].

## Section 8: Prioritized Remaining Work

### Priority 1 — Display-layer safe, high visual impact
- Implement `(BY MR. ___)` re-entry markers with no colon in `src/lib/transcript/workspacePresentation.ts` near `buildByLine` / paragraph assembly. Complexity: medium. This is the biggest visible mismatch with the canonical standards and the certified-style Q/A layout [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:192-201] [src/lib/transcript/workspacePresentation.ts:95,403,521].
- Strip `[SCOPIST: FLAG ...]` markers from clean TXT/Word delivery output in `src/lib/transcriptDownloads.ts` while preserving the verbatim token text. Complexity: small. Right now flags are included in delivery text [src/lib/format/serialize.ts:3-15] [src/lib/transcriptDownloads.ts:13-19].
- Enforce or suggest full canonical exhibit parenthetical wording in `workspacePresentation.ts` or a dedicated parenthetical post-processor. Complexity: medium. Current code only detects parenthetical shape, not canonical exhibit language [Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md:172] [src/lib/transcript/workspacePresentation.ts:99-109].

### Priority 2 — Display-layer safe, lower visual impact
- Replace hardcoded honorific regexes in `workspacePresentation.ts`, `colloquy.ts`, and `paragraphDisplayImprovements.ts` with a registry-backed helper so DP-010’s “single source” claim becomes fully true. Complexity: medium [Canonical Standards Folder/CANONICAL_EDITORIAL_POLICY.md:103-104] [src/lib/transcript/workspacePresentation.ts:111-127] [src/editor/stageS/colloquy.ts:1-15] [src/lib/transcript/paragraphDisplayImprovements.ts:8-23].
- Add dedicated tests for `metastructures` and `Waddells.` deterministic corrections. Complexity: small [src/lib/format/cfe.ts:85-94].
- Expand geometry regression coverage to include explicit Tab1/Tab2 verification, not just Tab3/Tab4. Complexity: small [src/lib/format/geometryProfile.ts:11-17] [src/lib/buildEditorContent.test.ts:245-255].

### Priority 3 — Canonical-layer unsafe (do not implement)
- Any attempt to rewrite canonical `word.text`, split stored words, or persist Q/A fixes into `transcript_words` / `transcript_utterances` would jeopardize word-to-timestamp binding. The current approach correctly keeps these corrections in display-layer transforms with preserved `sourceWordIds` and `sourceUtteranceIds` [src/lib/transcript/qaFixer.ts:17-28,122-151].
- Automatic money correction is unsafe. The current flag-only behavior is the right alternative for safety-critical amounts [src/lib/format/cfe.ts:300-325].

### Priority 4 — Post-beta (schema required)
- Participant directory / synthetic speakers / diarization expansion remain post-beta because the current display-layer protection can relabel merged clusters but cannot create new canonical speaker rows or split Deepgram clusters without schema work [src/lib/transcript/workspacePresentation.ts:304-347].

### Priority 5 — Desktop path (`depo_transcribe` repo)
- The wave8 / desktop geometry tab-stop conflict belongs to the separate desktop repo, as DP-011 states explicitly [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:107].

## Appendix: Geometry Lock Table

| Geometry Item | DP-011 Locked Value | Current Value | Evidence |
|---|---|---|---|
| Format box width | `6.5"` | `6.5` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20] [src/lib/format/geometryProfile.ts:7] |
| Left margin | `1.25"` | `1.25` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,43] [src/lib/format/geometryProfile.ts:8] |
| Right margin | `0.75"` | `0.75` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,107] [src/lib/format/geometryProfile.ts:9] |
| Line spacing | `28pt` | `28` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:65-67,127-128] [src/lib/format/geometryProfile.ts:10] |
| Lines per page | `25` | `25` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:20,65-67] [src/lib/format/geometryProfile.ts:4] |
| Tab1 `Q./A.` label | `0.5"` | `0.5` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:43] [src/lib/format/geometryProfile.ts:12] |
| Tab2 `Q./A.` text | `1.0"` | `1.0` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:43] [src/lib/format/geometryProfile.ts:13] |
| Tab3 speaker/new paragraph | `1.5"` | `1.5` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:43] [src/lib/format/geometryProfile.ts:14] |
| Tab4 parenthetical | `2.0"` | `2.0` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:44,48] [src/lib/format/geometryProfile.ts:15] |
| Center tab | `3.25"` | `3.25` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:107] [src/lib/format/geometryProfile.ts:16] |
| Continuation mode | `return_to_margin` | `return_to_margin` | [Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md:52,127] [src/lib/format/cfe.ts:630] |
