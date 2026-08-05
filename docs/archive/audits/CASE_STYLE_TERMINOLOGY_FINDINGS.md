## Case Style Terminology Findings

Audit date: 2026-06-08

### Question

Are `caption.case_name` and `caption.case_style` genuinely distinct downstream fields, or are they a duplicate representation of the same case-caption concept?

### Findings

- `caption.case_style` is the primary downstream caption field.
  - UFM caption output reads it first in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:491).
  - UFM source/confirmation mapping binds `ufmCaption` to `caption.case_style` in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:124).
  - extraction writes `fields.case_style` into `caption.case_style` in [src/lib/parsing/applyExtraction.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:91).
  - live Deepgram derivation reads `record.caption.case_style` in [src/lib/keytermDerivation.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/keytermDerivation.ts:192) and [src/lib/keytermDerivation.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/keytermDerivation.ts:244).

- `caption.case_name` is not a first-class UFM field today.
  - there is no direct `ufm*` mapping for `caption.case_name` in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:123).
  - the UFM builder uses it only as a fallback for deponent/caption text when `case_style` is absent in [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:208) and [src/lib/ufm/buildUfmMetadata.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/ufm/buildUfmMetadata.ts:491).
  - extraction backfills `caption.case_name` from `fields.case_style` only when `caption.case_name` is empty in [src/lib/parsing/applyExtraction.ts](/C:/Users/james/Projects/Depo-Pro/src/lib/parsing/applyExtraction.ts:93).
  - the live app banner uses `record.caption.case_name.value` for the case header in [src/components/IntakeScreen/IntakeScreen.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/IntakeScreen.tsx:231).
  - the Extracted Fields table currently shows it as its own row in [src/components/ExtractedFieldsTable/fieldProjection.ts](/C:/Users/james/Projects/Depo-Pro/src/components/ExtractedFieldsTable/fieldProjection.ts:155).

### Conclusion

`caption.case_style` is the real UFM-facing case-style field.

`caption.case_name` behaves like a legacy/fallback companion, not a separate first-class UFM concept. It still has live consumers, so it is not fully orphaned, but it does not appear to represent a distinct Texas UFM field from `case_style`.

### Recommendation

- Keep both fields in place for now.
- Do not collapse or rename paths in this UI task.
- Treat the duplicate semantics as a follow-up data-model review after beta freeze work, because collapsing it would affect extraction, UFM fallback behavior, the Intake banner, and review/provenance surfaces.
