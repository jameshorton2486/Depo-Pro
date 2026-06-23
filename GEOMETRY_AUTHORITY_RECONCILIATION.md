# Geometry Authority Reconciliation — DP-011 vs the legacy specs

**Status:** decision note (docs-only). Resolves the geometry-authority collision exposed when the three previously-missing specs are compared against the now-locked DP-011.
**Trigger:** STANDARDS_CONSISTENCY_AUDIT ran PARTIAL because DP-011 and three geometry specs were outside the corpus. Reading those specs shows they are a **competing geometry authority**, not confirmations.
**Rule:** UFM + certified *Etminan* govern (DP-011). Where a legacy spec conflicts, the legacy spec is corrected to DP-011 or marked superseded — never the reverse.

---

## 1. Headline finding

The three sources the audit flagged as missing —
`TRANSCRIPT_GEOMETRY_STANDARD.md`, `DEPO_PRO_FORMATTER_SPEC.md`, `DEPO_PRO_FORMATTER_RULE_ENGINE.md` —
encode geometry that **conflicts with DP-011 and with each other.** Adding them to the corpus unreconciled would *increase* inconsistency. **Reconcile first, then complete the corpus, then re-run the audit.**

`TRANSCRIPT_GEOMETRY_STANDARD.md` is the most dangerous because it **self-declares its tab model canonical** ("the tab model in §5 is canonical; any other tab values are superseded") while asserting the wave8 **360/900** Q./A. tabs — which the certified *Etminan* measurement (**720/1440**) refutes.

---

## 2. Root cause of the 360/900-vs-720/1440 "conflict": a units error

`TRANSCRIPT_GEOMETRY_STANDARD.md` §5 is internally inconsistent:

| Tab | Its "space" column | Its inch/twip column | Correct at 10-pitch |
|-----|--------------------|----------------------|----------------------|
| Tab 1 | **5th space** | 0.25″ / 360 | 5 × 0.1″ = **0.5″ / 720** |
| Tab 2 | **10th space** | 0.625″ / 900 | 10 × 0.1″ = **1.0″ / 1440** |
| Tab 3 | 15th space | 1.0″ / 1440 | 15 × 0.1″ = **1.5″ / 2160** |

The **character-space counts (5th/10th/15th) equal DP-011** (0.5/1.0/1.5). The **inch/twip column reproduces wave8's 360/900** and does **not** match its own space counts. The certified DOCX (tab stops measured at 720/1440/2160) confirms the space-count reading. **Conclusion: 360/900 is a propagated units bug; DP-011's 720/1440/2160 is correct.** wave8 `profile.py` inherited the same bug and is corrected the same way.

---

## 3. Full conflict ledger and resolution

| # | Parameter | DP-011 (LOCKED) | Legacy spec value | Resolution |
|---|-----------|-----------------|-------------------|------------|
| G1 | Q./A. designation tab | 0.5″ / 720 | 0.25″/360 (TGS twip col); 0.5″ (FORMATTER spaces) | **DP-011.** TGS twip col = units bug; certified-confirmed. |
| G2 | Q/A text tab | 1.0″ / 1440 | 0.625″/900 (TGS); 1.0″ (FORMATTER) | **DP-011.** Same units bug. |
| G3 | Speaker-label tab | 1.5″ / 2160 | 1.0″/1440 (TGS) | **DP-011 / DP-012 §7**, certified-confirmed (speaker label measured at Tab 3 = 2160). TGS corrected. |
| G4 | Parenthetical tab | 2.0″ / 2880 | 1.5″/2160 (TGS); center (DOCX) | **OPEN — already DP-011 §E2 residual.** Confirm on certified PDF; provisionally 2.0″/2880 per DP-012 §7. |
| G5 | Line spacing | 28pt exact / 560 | 480 / Word-double (~24pt) (RULE_ENGINE) | **DP-011 (28pt)** per UFM 25-line rule. RULE_ENGINE corrected. (Still verify exact 25-line render — DP-011 §E1.) |
| G6 | Left margin | 1.25″ / 1800 | 1.0″ (TX base) / 1.75″ (Fed) / 1.25″ (CA) | **DP-011 (1.25″)** for the Texas/beta geometry. |
| G7 | Right margin | 0.75″ / 1080 | 0.375″ (FORMATTER) | **DP-011 (0.75″)** — preserves the 6.5″ box; 0.375″ does not. |
| G8 | Continuation | return to 0.0″ | Zone 2 = 1.0″ (FORMATTER_SPEC); TGS §117 keeps a Tab-4 indent | **DP-011 (Return-To-Margin, 0.0″).** Both legacy exceptions are the retired hanging-indent behavior; corrected. |
| G9 | Format box | 6.5″ | 6.5″ (TGS) ✓; ~6.4–7.1″ (FORMATTER margins) | TGS agrees; FORMATTER margin sets that don't yield 6.5″ are corrected. |
| G10 | Font / pitch / lines | Courier New 12pt, 10-pitch, 25 | same across specs ✓ | **No conflict.** |

Net: G1–G3, G5–G8 resolve **in favor of DP-011** (certified + UFM). G4 stays the existing open residual. G9–G10 already agree.

---

## 4. The architectural fork (owner decision, separate from the rows above)

`DEPO_PRO_FORMATTER_SPEC.md` / `RULE_ENGINE.md` assume **jurisdiction-parameterized geometry** — a `jurisdiction_configs` table with per-state TX / CA / Federal margins and tab sets. DP-011 locks **one** geometry.

- For **BETA_FREEZE + Texas-only** (current scope), the single DP-011 geometry governs. The jurisdiction-config system is **post-beta**, and it also implies **new DB tables** (`jurisdiction_configs`, `transcript_paragraphs`, `speaker_assignments`) that the freeze prohibits.
- **Recommendation:** reconcile the **Texas profile** defaults in these specs to DP-011 now (so the seed data is correct if/when the table is built), and mark the multi-jurisdiction system explicitly **post-freeze**. Do not let its conflicting TX defaults (1.0″ left, 0.375″ right, 480 double, Zone-2 1.0″ continuation) stand as live values.

---

## 5. Disposition of each legacy spec

Add a status banner to the top of each (docs-only):

- **`TRANSCRIPT_GEOMETRY_STANDARD.md`** → *"Geometry SUPERSEDED by DP-011. The §5 tab inch/twip values (360/900) are a units error; correct Tab 1/2/3 to 720/1440/2160, speaker to 1.5″, parenthetical pending §E2. Non-tab prose (line-number positioning, format-box definition) retained where consistent with DP-011."*
- **`DEPO_PRO_FORMATTER_SPEC.md`** → *"Geometry SUPERSEDED by DP-011 (margins, continuation, 2-space-after-Q). DB-schema proposals are POST-FREEZE and out of scope for beta."*
- **`DEPO_PRO_FORMATTER_RULE_ENGINE.md`** → *"Geometry SUPERSEDED by DP-011 (line spacing 480→28pt exact; TX margins; continuation). Jurisdiction-config architecture is POST-FREEZE."*

---

## 6. DP-012 numbering collision — resolution

Two documents claim "DP-012": the approved **Punctuation / Garble-Flags** standard, and the **Option-A unified-engine migration report**. The DP-### series is for **formatting standards only**; a migration/architecture document does not belong in it.

- **Keep:** `DP-012` = *Quotation Punctuation, Date Reconciliation & Inline Garble Flags*.
- **Renumber:** the migration report → **`WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`** (architecture record, not a DP standard). If you prefer a generic series, `ADR-0001_UNIFIED_EXPORT_ENGINE.md`.
- **Action:** rename the file, change its internal "Decision ID: DP-012" to "Wave 21 / ADR-0001," and add a one-line note: *"Renamed from DP-012 (number reserved for the Punctuation standard)."*

---

## 7. Corrected sequence (replaces the naive add-and-re-run)

1. Apply §3 resolutions and §5 status banners to the three legacy specs (docs-only).
2. Apply §6 renumbering to the migration report.
3. Gather DP-011 + the corrected legacy specs into the Canonical Standards Folder (complete the corpus). Decide whether the certified PDF can be added (closes DP-011 §E residuals).
4. **Then** re-run STANDARDS_CONSISTENCY_AUDIT. Expected: geometry conflicts → 0 (G4 may remain as a documented residual, not a conflict), numbering collisions → 0, corpus verdict → COMPLETE (or PARTIAL only on the certified PDF if still absent).
5. Freeze: build `CANONICAL_STANDARDS_INDEX.md` with the numbering registry.
