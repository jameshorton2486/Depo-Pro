> **STATUS: GEOMETRY SUPERSEDED BY DP-011 (2026-06-22).** Line spacing
> (480/double → 28pt exact), Texas margins, and continuation are superseded —
> use DP-011. The jurisdiction-config architecture is POST-FREEZE; reconcile the
> Texas profile defaults to DP-011 before any future use.
> **Classification:** HISTORICAL / reference-only architecture specification.
> It is retained for provenance and legacy design context, not as active authority.

# Depo-Pro — Transcript Formatter Rule Engine

**Version:** 1.0  
**Date:** March 2026  
**Companion to:** `DEPO_PRO_FORMATTER_SPEC.md`  
**Purpose:** Defines the rule engine layer that makes the formatter jurisdiction-aware and reporter-configurable. This document governs how formatting rules are loaded, merged, and applied — not the formatting rules themselves (those live in the Formatter Spec).

---

## Contents

1. [Core Design Principle: Three Layers](#1-core-design-principle)
2. [Rule Profile Architecture](#2-rule-profile-architecture)
3. [Jurisdiction Rule Files](#3-jurisdiction-rule-files)
4. [Reporter Preference Layer](#4-reporter-preference-layer)
5. [Rule Merge Algorithm](#5-rule-merge-algorithm)
6. [Rule Precedence Enforcement](#6-rule-precedence-enforcement)
7. [TypeScript Interfaces](#7-typescript-interfaces)
8. [Rule Engine Implementation](#8-rule-engine-implementation)
9. [Adding a New Jurisdiction](#9-adding-a-new-jurisdiction)
10. [Section Detection: Hybrid AI + Reporter Confirmation](#10-section-detection-hybrid)
11. [WKT Module Status](#11-wkt-module-status)

---

## 1. Core Design Principle

The formatter operates on three strictly separated layers:

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1 — TRANSCRIPT DATA                                   │
│ transcript_words + transcript_paragraphs rows               │
│ Speaker assignments, section markers, exhibit positions     │
│ This layer is NEVER modified by the formatter               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2 — FORMATTING RULES                                  │
│ Jurisdiction config (jurisdiction_configs table)            │
│ + Reporter preferences (reporter_preferences table)         │
│ + Job-level overrides (jobs.format_settings JSONB)          │
│ Merged into a single ResolvedRuleSet at formatter startup   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3 — OUTPUT RENDERING                                  │
│ DOCX assembler, PDF renderer, ASCII exporter                │
│ Each renderer reads the same structured paragraph output    │
│ Renderer never makes formatting decisions                   │
└─────────────────────────────────────────────────────────────┘
```

**Critical rule: The formatter generates a structured `FormattedTranscript` object. It does not generate DOCX, PDF, or ASCII directly. Renderers convert that object to output format. This means formatting logic and rendering logic are never mixed.**

---

## 2. Rule Profile Architecture

Each jurisdiction has a rule profile. Rule profiles are stored in two places:

1. **`jurisdiction_configs` database table** — Live, queryable, seedable, updateable without code deploys
2. **`src/lib/transcription/formatter/rules/`** — TypeScript rule profile objects that mirror the DB (cached at startup, used as fallback if DB is unavailable)

The database is authoritative. The TypeScript files are the seed source and development reference.

### Rule Profile Directory

```
src/lib/transcription/formatter/rules/
  index.ts          — loadRuleProfile(), getRuleProfile()
  texas.ts          — Primary jurisdiction (full specification)
  california.ts     — CA formatting rules
  florida.ts        — FL formatting rules
  new_york.ts       — NY formatting rules
  new_jersey.ts     — NJ formatting rules
  ohio.ts           — OH formatting rules
  illinois.ts       — IL formatting rules
  georgia.ts        — GA formatting rules
  pennsylvania.ts   — PA formatting rules
  south_carolina.ts — SC formatting rules
  federal.ts        — Federal court proceedings (future)
  default.ts        — Baseline — used for any unrecognized jurisdiction
```

---

## 3. Jurisdiction Rule Files

Each rule file exports a `JurisdictionRuleProfile` object that maps directly to `jurisdiction_configs` table columns, plus extended formatter-specific rules not captured in the DB table.

### Texas — Primary Profile

```typescript
// src/lib/transcription/formatter/rules/texas.ts

import type { JurisdictionRuleProfile } from '../types';

export const texasRuleProfile: JurisdictionRuleProfile = {
  state_code: 'TX',
  state_name: 'Texas',
  certification_body: 'JBCC/UFM',

  // ─── Typography ─────────────────────────────────────────────
  font: 'Courier New',
  font_size_pt: 12,
  line_spacing_twips: 480,          // Double spacing (240 twips = single)

  // ─── Page Layout ────────────────────────────────────────────
  lines_per_page: 25,
  left_margin_inches: 1.0,          // 1" left — writing block starts here
  right_margin_inches: 0.375,
  top_margin_inches: 1.0,
  bottom_margin_inches: 1.0,
  page_width_inches: 8.5,
  page_height_inches: 11,

  // ─── Tab System (positions from left margin, 10cpi Courier New) ──
  // Zone 1: Q./A. labels
  tab1_inches: 0.5,                 // 5 characters at 10cpi
  // Zone 2: Q./A. continuation wrap lines
  tab2_inches: 1.0,                 // 10 characters
  // Zone 3: Everything else (speaker labels, parentheticals)
  tab3_inches: 1.5,                 // 15 characters
  // Zone 0: BY MR. ___: examination bylines — LEFT MARGIN (no tab)
  byline_tab_inches: 0.0,

  // ─── Line Standards ─────────────────────────────────────────
  min_chars_per_line: 56,
  max_chars_per_line: 63,
  characters_per_inch: 10,          // Courier New 12pt @ 10cpi

  // ─── Q/A Formatting ─────────────────────────────────────────
  qa_format: true,
  qa_label_q: 'Q',
  qa_label_a: 'A',
  qa_spaces_after_label: 2,         // Always 2 spaces: "Q  Did you..."
  qa_suffix: '.',                   // Q. not Q (Texas uses period)

  // ─── Colloquy Formatting ────────────────────────────────────
  colloquy_spaces_after_colon: 2,   // "MR. MUNOZ:  Text..."
  speaker_label_case: 'UPPER',      // MR. MUNOZ — all caps
  standardized_labels: {
    reporter:      'THE REPORTER',  // NOT "THE COURT REPORTER"
    witness:       'THE WITNESS',
    videographer:  'THE VIDEOGRAPHER',
    interpreter:   'THE INTERPRETER',
  },

  // ─── Punctuation Rules ──────────────────────────────────────
  interruption_symbol: '--',        // Double hyphen ONLY. Never em dash.
  ellipsis_style: '...',
  sentence_spaces: 2,               // Default 2 spaces after . ! ?

  // ─── Parentheticals ─────────────────────────────────────────
  parenthetical_case: 'sentence',   // (Witness complies.) not (WITNESS COMPLIES.)
  parenthetical_brackets: false,    // ( ) not [ ]
  parenthetical_bold: false,
  parenthetical_italic: false,

  // ─── Time ───────────────────────────────────────────────────
  time_format: '12h_dotted',        // "2:12 p.m." — lowercase with periods
  // NOT: "2:12 PM", "2:12 p.m", "14:12", "2:12pm"

  // ─── Section headers ────────────────────────────────────────
  section_header_case: 'UPPER',     // DIRECT EXAMINATION
  section_header_bold: true,
  section_header_zone: 3,           // Zone 3 position (3 tabs)
  byline_bold: true,                // BY MR. MUNOZ: is bold
  byline_case: 'UPPER',

  // ─── Line numbering ─────────────────────────────────────────
  require_line_numbers: true,
  line_number_position: 'left_margin',
  line_number_format: 'right_align_2_digit',  // " 1" " 2" ... "25"
  line_numbers_every_n: 1,          // Every line (not every 5)

  // ─── Certification ──────────────────────────────────────────
  certification_language: `CERTIFICATE OF COURT REPORTER\n\nSTATE OF TEXAS\nCOUNTY OF ___________\n\nI, [REPORTER NAME], Certified Shorthand Reporter in and for the State of Texas, do hereby certify that the foregoing deposition of [DEPONENT NAME] is a true and correct record of the testimony given by said witness; that I am neither a relative nor employee of any attorney or party to this action; and that I have no financial or other interest in the outcome of this action.\n\nWitness my hand this ______ day of ____________, 20___.\n\n____________________________________\n[REPORTER NAME], CSR\nTexas License No. ____________\nExpiration: ______________`,

  // ─── Compliance ─────────────────────────────────────────────
  require_bookmarks: false,
  require_searchable_pdf: false,
  upper_case_speaker_ids: false,
  notes_retention_years: 5,

  // ─── Format-specific rules ──────────────────────────────────
  closing_sequence: [
    'DEPO_CONCLUDED',     // (Deposition of X concluded at Y p.m.)
    'CLOSING_ASTERISKS',  // * * * * *
    'FURTHER_SAYETH',     // FURTHER DEPONENT SAYETH NOT.
  ],

  // ─── Filler words ───────────────────────────────────────────
  filler_words: ['uh', 'um', 'ah', 'huh', 'hmm'],
  filler_policy: 'verbatim',
  // 'verbatim' = stored AND displayed
  // 'store_hidden' = stored but hidden from display
  // 'omit' = NOT PERMITTED under verbatim mandate
};
```

### California Profile (Illustrating Key Differences)

```typescript
// src/lib/transcription/formatter/rules/california.ts
// Only shows fields that DIFFER from Texas

export const californiaRuleProfile: Partial<JurisdictionRuleProfile> & {
  state_code: 'CA'
} = {
  state_code: 'CA',
  state_name: 'California',
  certification_body: 'CSR/CRC',

  // CA uses wider margins
  left_margin_inches: 1.25,
  min_chars_per_line: 56,
  max_chars_per_line: 63,

  // CA requires searchable PDF with bookmarks for appellate submissions
  require_bookmarks: true,
  require_searchable_pdf: true,

  // CA line numbering on every 5th line (not every line)
  // line_numbers_every_n: 5,  -- confirm with CA CSR before enabling

  // CA tab structure: slight variation
  tab1_inches: 1.0,    // 8 characters
  tab2_inches: 1.0,
  tab3_inches: 1.5,

  // CA certification language (different from TX)
  certification_language: `CERTIFICATE\n\nI, [REPORTER NAME], a Certified Shorthand Reporter for the State of California...\n[CA-SPECIFIC CERTIFICATION LANGUAGE]`,
};
```

---

## 4. Reporter Preference Layer

Reporter preferences are loaded from the `reporter_preferences` table and merged with the active jurisdiction profile. Preferences can only override style-class rules — never legal-class rules.

### Style-Class Rules (Reporter-Overrideable)

| Rule | Default | Reporter Can Change To |
|---|---|---|
| `spaces_after_sentence` | 2 | 1 |
| `ellipsis_style` | `...` | `…` |
| `show_fillers` | `false` | `true` |
| `verbose_parentheticals` | `false` | `true` |
| `auto_insert_byline` | `true` | `false` |
| `auto_insert_reentry` | `true` | `false` |
| `auto_close_deposition` | `true` | `false` |

### Legal-Class Rules (Immutable — Reporter Cannot Override)

| Rule | Value | Why Immutable |
|---|---|---|
| `lines_per_page` | 25 (TX) | Certification requirement — affects page citation |
| `interruption_symbol` | `--` | ASCII mandate — em dash breaks CAT/litigation tools |
| `qa_format` | `true` | UFM requirement |
| `require_line_numbers` | `true` | UFM requirement |
| `font` | `Courier New` | UFM mandate |
| `font_size_pt` | 12 | UFM mandate |
| `parenthetical_brackets` | `false` | UFM — never square brackets |
| `time_format` | `12h_dotted` | UFM — "2:12 p.m." |
| `standardized_labels.reporter` | `THE REPORTER` | UFM — not "THE COURT REPORTER" |

---

## 5. Rule Merge Algorithm

```typescript
// src/lib/transcription/formatter/rules/index.ts

export async function buildResolvedRuleSet(
  transcriptionId: string,
  reporterId: string
): Promise<ResolvedRuleSet> {

  // Step 1: Load jurisdiction config from DB
  const transcription = await getTranscriptionWithJob(transcriptionId);
  const stateCode = transcription.jurisdiction?.state_code ?? 'TX';

  const jurisdictionRow = await supabase
    .from('jurisdiction_configs')
    .select('*')
    .eq('state_code', stateCode)
    .single();

  // Step 2: Load jurisdiction TypeScript profile as baseline
  // (DB row takes precedence over TypeScript file)
  const tsProfile = getRuleProfileByState(stateCode);

  // Step 3: Load reporter preferences
  const reporterPrefs = await supabase
    .from('reporter_preferences')
    .select('*')
    .eq('profile_id', reporterId)
    .maybeSingle();

  // Step 4: Load job-level overrides
  const jobOverrides = transcription.job?.format_settings ?? {};

  // Step 5: Merge — precedence: Job > Reporter > Jurisdiction DB > Jurisdiction TS
  const resolved: ResolvedRuleSet = {
    // Base: TypeScript profile
    ...tsProfile,

    // Override with DB row (authoritative for multi-state compliance)
    ...dbRowToRuleProfile(jurisdictionRow.data),

    // Apply reporter preferences for STYLE-CLASS rules only
    ...(reporterPrefs.data
      ? applyReporterPreferences(reporterPrefs.data, jurisdictionRow.data)
      : {}),

    // Apply job-level overrides (must pass immutability check)
    ...applyJobOverrides(jobOverrides, jurisdictionRow.data),

    // Metadata
    _resolved_at: new Date().toISOString(),
    _state_code: stateCode,
    _reporter_id: reporterId,
  };

  // Step 6: Validate — ensure no legal-class rules were overridden
  assertLegalRulesIntact(resolved, jurisdictionRow.data);

  return resolved;
}

function applyReporterPreferences(
  prefs: ReporterPreferencesRow,
  jurisdiction: JurisdictionConfigRow
): Partial<ResolvedRuleSet> {
  const overrides: Partial<ResolvedRuleSet> = {};

  // Only style-class rules are applied from preferences
  const STYLE_CLASS_RULES = [
    'spaces_after_sentence',
    'ellipsis_style',
    'show_fillers',
    'verbose_parentheticals',
    'auto_insert_byline',
    'auto_insert_reentry',
    'auto_close_deposition',
  ] as const;

  for (const rule of STYLE_CLASS_RULES) {
    if (prefs[rule] !== undefined && prefs[rule] !== null) {
      overrides[rule] = prefs[rule];
    }
  }

  return overrides;
}

function assertLegalRulesIntact(
  resolved: ResolvedRuleSet,
  jurisdiction: JurisdictionConfigRow
): void {
  // Immutable rules — these must match jurisdiction config exactly
  const LEGAL_RULES = [
    'lines_per_page',
    'font',
    'font_size_pt',
    'require_line_numbers',
    'interruption_symbol',
    'parenthetical_brackets',
  ] as const;

  for (const rule of LEGAL_RULES) {
    if (resolved[rule] !== (jurisdiction as any)[rule]) {
      throw new FormatterRuleViolation(
        `Immutable rule '${rule}' was modified. ` +
        `Expected: ${(jurisdiction as any)[rule]}, Got: ${resolved[rule]}. ` +
        `Reporter preferences cannot override legal formatting requirements.`
      );
    }
  }
}
```

---

## 6. Rule Precedence Enforcement

```
Priority 1 (Highest) — Job-Level Overrides
  Source: jobs.format_settings JSONB
  Applies to: STYLE-CLASS rules only
  Example: "Use 'MR. JOSE GARZA' instead of 'MR. GARZA' for this unusual proceeding"
  Cannot override: Any legal-class rule

Priority 2 — Reporter Preferences
  Source: reporter_preferences table
  Applies to: STYLE-CLASS rules only
  Example: "Always use 1 space after sentence, not 2"
  Cannot override: Any legal-class rule

Priority 3 — Jurisdiction DB Row
  Source: jurisdiction_configs table
  Applies to: ALL rules (both style and legal class)
  Authoritative for: Legal-class rules
  Updated by: Depo-Pro admin when jurisdiction rules change

Priority 4 (Lowest) — TypeScript Rule Profile
  Source: src/lib/transcription/formatter/rules/[state].ts
  Used as: Fallback when DB row is missing fields
  Updated by: Code deployment
```

---

## 7. TypeScript Interfaces

```typescript
// src/lib/transcription/formatter/types/rules.ts

export interface JurisdictionRuleProfile {
  // Identification
  state_code: string;
  state_name: string;
  certification_body: string;

  // Typography
  font: string;
  font_size_pt: number;
  line_spacing_twips: number;

  // Page layout
  lines_per_page: number;
  left_margin_inches: number;
  right_margin_inches: number;
  top_margin_inches: number;
  bottom_margin_inches: number;
  page_width_inches: number;
  page_height_inches: number;

  // Tab system
  tab1_inches: number;
  tab2_inches: number;
  tab3_inches: number;
  byline_tab_inches: number;

  // Line standards
  min_chars_per_line: number;
  max_chars_per_line: number;
  characters_per_inch: number;

  // Q/A
  qa_format: boolean;
  qa_label_q: string;
  qa_label_a: string;
  qa_spaces_after_label: number;
  qa_suffix: string;

  // Colloquy
  colloquy_spaces_after_colon: number;
  speaker_label_case: 'UPPER' | 'Title';
  standardized_labels: {
    reporter: string;
    witness: string;
    videographer: string;
    interpreter: string;
  };

  // Punctuation
  interruption_symbol: '--' | string;   // ONLY '--' is legally valid
  ellipsis_style: '...' | '…';
  sentence_spaces: 1 | 2;

  // Parentheticals
  parenthetical_case: 'sentence' | 'UPPER';
  parenthetical_brackets: false;        // Never true — always round brackets
  parenthetical_bold: boolean;
  parenthetical_italic: boolean;

  // Time
  time_format: '12h_dotted' | '12h_nodot' | '24h';

  // Section headers
  section_header_case: 'UPPER';
  section_header_bold: boolean;
  section_header_zone: 1 | 2 | 3;
  byline_bold: boolean;
  byline_case: 'UPPER' | 'Title';

  // Line numbering
  require_line_numbers: true;
  line_number_position: 'left_margin';
  line_number_format: string;
  line_numbers_every_n: number;

  // Certification
  certification_language: string;

  // Compliance
  require_bookmarks: boolean;
  require_searchable_pdf: boolean;
  upper_case_speaker_ids: boolean;
  notes_retention_years: number;

  // Closing sequence
  closing_sequence: ParagraphType[];

  // Filler words
  filler_words: string[];
  filler_policy: 'verbatim' | 'store_hidden';
}

// Reporter preferences that can override style-class rules only
export interface ReporterPreferencesOverride {
  spaces_after_sentence?: 1 | 2;
  ellipsis_style?: '...' | '…';
  show_fillers?: boolean;
  verbose_parentheticals?: boolean;
  auto_insert_byline?: boolean;
  auto_insert_reentry?: boolean;
  auto_close_deposition?: boolean;
}

// Final merged rule set used by all formatter components
export type ResolvedRuleSet = JurisdictionRuleProfile &
  ReporterPreferencesOverride & {
    _resolved_at: string;
    _state_code: string;
    _reporter_id: string;
  };
```

---

## 8. Rule Engine Implementation

```typescript
// src/lib/transcription/formatter/rules/index.ts

const RULE_PROFILES: Record<string, JurisdictionRuleProfile> = {
  TX: texasRuleProfile,
  CA: californiaRuleProfile,
  FL: floridaRuleProfile,
  NY: newYorkRuleProfile,
  NJ: newJerseyRuleProfile,
  OH: ohioRuleProfile,
  IL: illinoisRuleProfile,
  GA: georgiaRuleProfile,
  PA: pennsylvaniaRuleProfile,
  SC: southCarolinaRuleProfile,
};

export function getRuleProfileByState(stateCode: string): JurisdictionRuleProfile {
  const profile = RULE_PROFILES[stateCode.toUpperCase()];
  if (!profile) {
    console.warn(
      `No rule profile found for state "${stateCode}". Using Texas as default.`
    );
    return texasRuleProfile;
  }
  return profile;
}

// Cache resolved rule sets for the duration of a format job
// Prevents multiple DB round trips when formatting individual paragraphs
const ruleSetCache = new Map<string, ResolvedRuleSet>();

export async function getRuleSet(
  transcriptionId: string,
  reporterId: string
): Promise<ResolvedRuleSet> {
  const cacheKey = `${transcriptionId}:${reporterId}`;

  if (ruleSetCache.has(cacheKey)) {
    return ruleSetCache.get(cacheKey)!;
  }

  const resolved = await buildResolvedRuleSet(transcriptionId, reporterId);
  ruleSetCache.set(cacheKey, resolved);

  // TTL: expire after 5 minutes to pick up reporter preference changes
  setTimeout(() => ruleSetCache.delete(cacheKey), 5 * 60 * 1000);

  return resolved;
}
```

---

## 9. Adding a New Jurisdiction

When a new state needs to be supported, the process is:

**Step 1 — Research**
- Obtain the state's court reporter rules (certification board website)
- Document: lines/page, margins, tab stops, certification language, any unique requirements

**Step 2 — TypeScript Profile**
```typescript
// src/lib/transcription/formatter/rules/[state].ts
import { texasRuleProfile } from './texas';
import type { JurisdictionRuleProfile } from '../types';

// Start from Texas as baseline, override only differences
export const [state]RuleProfile: JurisdictionRuleProfile = {
  ...texasRuleProfile,   // Inherit all Texas defaults
  state_code: '[XX]',
  state_name: '[State Name]',
  // Override only fields that differ:
  // left_margin_inches: X.X,
  // certification_language: '[State-specific cert text]',
  // ... etc
};
```

**Step 3 — Register**
```typescript
// Add to RULE_PROFILES map in rules/index.ts
'[XX]': [state]RuleProfile,
```

**Step 4 — Database Seed**
```sql
INSERT INTO jurisdiction_configs (state_code, state_name, ...)
VALUES ('[XX]', '[State Name]', ...);
```

**Step 5 — Test**
- Run the Olivarez test transcript against the new profile
- Verify output against the state's sample transcripts
- Confirm certification language matches state board requirements

---

## 10. Section Detection: Hybrid AI + Reporter Confirmation

The section detection engine (Section 6 of `DEPO_PRO_FORMATTER_SPEC.md`) uses automatic pattern detection. The rule engine governs how section detection is handled when automatic detection fails or is uncertain.

### Detection Confidence Levels

```typescript
type DetectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL';

interface SectionDetectionResult {
  section_type: DepositionSection;
  start_word_idx: number;
  confidence: DetectionConfidence;
  detection_signals: string[];    // Which patterns matched
  requires_confirmation: boolean; // True if MEDIUM or LOW confidence
}
```

### UI Behavior by Confidence Level

| Confidence | UI Behavior | Reporter Action Required |
|---|---|---|
| HIGH (>0.90) | Section applied automatically, shown in sidebar | Optional — can override |
| MEDIUM (0.70–0.90) | Section suggested with highlight | Confirm or edit before export |
| LOW (<0.70) | Section flagged as uncertain, yellow highlight | Must confirm before export |
| MANUAL | Section marker inserted by reporter in editor | No AI involvement |

### Hybrid Flow

```
1. Auto-detection runs on raw transcript_words
   → Produces SectionDetectionResult[] with confidence scores

2. HIGH confidence sections → written to transcript_sections automatically
   (source = 'AUTO_DETECTED')

3. MEDIUM/LOW confidence sections → displayed in Section Review sidebar
   → Reporter sees: "System detected DIRECT EXAMINATION starting at line 47"
   → Options: [Confirm] [Move to Different Position] [Mark as Different Section]
   → On confirm: written to transcript_sections (source = 'REPORTER_CONFIRMED')

4. Reporter can manually insert sections at any point
   → Creates transcript_sections row (source = 'REPORTER_MANUAL')
   → Overrides any auto-detected section at that position

5. Formatter reads transcript_sections — not transcript_words directly
   → If a section has no entry in transcript_sections, quality gate raises warning
   → Export is not blocked by missing sections but reporter is warned
```

### Why Not Fully Automatic Section Detection?

Full automatic detection has a documented failure mode: if the system fails to detect that testimony went "off the record," the formatter will apply Q/A formatting to off-record colloquy. This has legal implications — off-record material formatted as Q/A testimony misrepresents the record.

The hybrid model gives reporters final control over section boundaries while eliminating the manual burden for the 85–90% of cases where detection is high-confidence.

---

## 11. WKT Module Status

The Word Knowledge Test (WKT) module exists in the current codebase as a fully built separate feature: flashcards, mock exams, practice sessions. It has no overlap with the formatter, database schema, or transcript workflow.

**Decision: Separate Product**

WKT should be moved to its own repository. Timeline:

1. **Now:** Leave WKT code in place — do not touch it during formatter development
2. **Post-formatter launch:** Extract WKT to `voice-writer-training` repository
3. **Long term:** Deploy as a standalone product or as an optional module

Keeping WKT in the Depo-Pro repo during formatter development is low risk because there is zero code overlap. It will not interfere with any formatter work.

---

*Depo-Pro Transcript Formatter Rule Engine v1.0 · March 2026*  
*Companion to: DEPO_PRO_FORMATTER_SPEC.md · DEPO_PRO_DATABASE_SCHEMA.md*
