# DP-011 — Canonical Geometry Authority

| Field | Value |
|-------|-------|
| **Decision ID** | DP-011 |
| **Title** | Canonical Geometry Authority (page, format box, margins, tab system, line spacing, continuation) |
| **Status** | **APPROVED** — geometry locked to **UFM standards**, corroborated by measurement of the certified *Etminan* transcript. Two residuals documented (§E). |
| **Authority** | **Texas UFM (format-box geometry)** + Certified Transcript Ground Truth — *Etminan* (Cause No. C-5722-24-L; Miah Bardot, CSR 12129) for content, spacing, and tab confirmation |
| **Relates to** | DP-009 / DP-010 (punctuation spacing) · DP-012 §7/§9 (tab architecture, by-line) |
| **Scope (single authority for)** | Workspace · Copy Transcript · DOCX · PDF · Stage S · AI Structuring Layer · the unified Geometry/Format Engine (Wave 21) |

---

## Authority hierarchy (resolves every conflict in this record)

> **Texas UFM (format-box geometry) = governing standard. Certified transcript governs content, punctuation spacing, and tab confirmation. Where a working-copy artifact diverges from the UFM, the UFM wins.**

Directive standing instruction: **always use UFM standards.** The UFM mandates a **6.5″ format box, 25 lines/page, 10-pitch type**. These are hard requirements and drive the margin and spacing math below. The certified *Etminan* record is authoritative for testimony content and for DP-009/DP-010 punctuation spacing, and it *confirms* the font, the left margin, and the core tab positions — but the supplied **DOCX is a pre-format-box Word working copy** whose right margin and line-spacing settings are **not** UFM-compliant and are therefore **not adopted** (see §D).

---

## SECTION A — LOCKED geometry

### A1. Page, format box, font, line count
- Page: **US Letter 8.5″ × 11″** (12240 × 15840 twips).
- **Format box: 6.5″ wide** (9360 twips) — UFM hard minimum.
- Body font: **Courier New 12pt**, **10-pitch (10 cpi)**. *(Confirmed: Etminan DOCX docDefaults `Courier New`, `sz=24`.)*
- **Lines per page: 25** — UFM hard rule.

### A2. Margins (all four locked)
- **Left: 1.25″** (1800 twips). *(Confirmed: Etminan DOCX `w:left="1800"`.)*
- **Right: 0.75″** (1080 twips). **UFM-derived:** 8.5″ − 1.25″ left − 6.5″ box = 0.75″. *(Overrides the DOCX's `w:right="1440"`/1.0″ — see §D.)*
- **Top: 1.0″** (1440 twips). **Bottom: 1.0″** (1440 twips). *(Confirmed: DOCX `w:top/w:bottom="1440"`.)*
- Text area = 12240 − 1800 − 1080 = **9360 twips = 6.5″** ✓ (UFM compliant).

### A3. Tab system — LOCKED at 720 / 1440 / 2160 / 2880 + center @ 4680
| Element | Lands at | twips | Authority |
|---------|----------|-------|-----------|
| `Q.` / `A.` designation | 0.5″ | 720 | DP-009/010/012; DOCX-confirmed |
| Q/A text | 1.0″ | 1440 | DP-009/010/012; DOCX-confirmed |
| Speaker label / new-paragraph first line | 1.5″ | 2160 | DP-012 §7; DOCX-confirmed |
| Parenthetical (full canonical wording) | 2.0″ | 2880 | DP-012 §7 (UFM §2.11/§9.2/§16.5) |
| Centered furniture (caption, section headers) | center | 4680 | UFM; DOCX-confirmed (4680 = 9360 ÷ 2 = center of the 6.5″ box) |

- **wave8 `profile.py:61` `(360,900,1440,2160,2880)` is OVERRULED** (Q./A. at 0.25″/0.625″ contradicts three records; also vestigial — `engine.py:135` converts, no writer applies).
- **The Etminan DOCX omits the 2880 stop** and lets 4 tabs carry parentheticals to the center tab (4680). Per UFM/DP-012 §7, parentheticals belong at **2.0″/2880**; the DOCX behavior is a working-copy deviation and is not adopted.
- **Corroboration of the 6.5″ box:** the DOCX's center tab sits at **4680 = exactly half of a 9360-twip (6.5″) box**, proving a 6.5″-box intent even though its right-margin setting (1.0″) contradicts it. This independently supports the 0.75″/6.5″ lock.

### A4. Continuation — LOCKED: Return-To-Margin
Wrapped lines return to the **left margin (0″)** via explicit tab stops + `left_indent = 0` + literal tabs. **Never** a negative `first_line_indent`. The term **"hanging indent" is retired.** A hard paragraph break in long testimony starts at **Tab 3 (1.5″/2160)**; a soft wrap returns to 0″ and is not a new paragraph. *(DP-009/DP-010/DP-012 §7.)*

### A5. Spacing (governed by DP-010; referenced, not redefined)
One space after registry abbreviations/honorifics; two spaces after sentence-ending `.`/`?`/`!`, after a sentence-ender inside a closing quote (spaces follow the quote), and after a speaker-label colon. `abbreviation_registry.json` is the sole source. **DP-011 governs placement; DP-010 governs spacing.**

---

## SECTION B — RESOLVED (was measurement-pending; locked to UFM)

### B1. Right margin → **0.75″ (1080 twips); format box 6.5″ (9360 twips). LOCKED.**
- Candidates: 1.0″ (Depo-Pro tech note / DOCX setting) · **0.75″ (UFM 6.5″ box + 1.25″ left)** · 0.5″ (python-docx workaround).
- UFM arithmetic: 8.5″ − 6.5″ box = 2.0″ total margin; with 1.25″ left, right = **0.75″**. The DOCX's 1.0″ gives only 6.25″ → **UFM non-compliant**, not adopted.

### B2. Line spacing → **28pt exact (560 twips). LOCKED.**
- Candidates: 24pt / Word auto-double (DOCX `line=480 auto`) · **28pt exact (UFM/python-docx)**.
- UFM arithmetic: UFM mandates exactly 25 lines/page. Word auto-double (~24pt) fits ~27 lines → **violates** the 25-line rule. **28pt exact** is the UFM/python-docx implementation lock. *(See §E1: the exact value to print precisely 25 lines depends on the body-area height; 28pt is the standard lock and the tuning knob.)*

### B3. Characters per line → **56–63 (max 63). LOCKED.**
- 10-pitch × 6.5″ box = 65 cells; minus a one-character buffer at each marginal line (65 − 2) = **63 max**; working range **56–63**.

---

## SECTION C — Re-check against DP-009 / DP-010 / DP-012
- Tabs 0.5/1.0/1.5 match DP-009/010/012; 2.0″ parenthetical matches DP-012 §7. **No conflict.**
- Continuation (§A4) matches all three records. **No conflict.**
- Spacing boundary clean: placement (DP-011) vs spacing (DP-010). **No overlap.**
- **⚠ Numbering collision (carry to the standards index):** "DP-012" is the approved **Punctuation/Garble** standard. The **Option-A / unified-engine migration report** was also labeled "DP-012." That report is an **architecture decision, not a formatting standard** — renumber it out of the DP-### series (ADR / Wave 21 record). DP-012 = Punctuation keeps the number.

---

## SECTION D — Measurement vs UFM reconciliation (Etminan DOCX)
The supplied `Dr_Etminan_Transcript.docx` is the certified testimony content, but its geometry is a **Word working copy**, not the UFM format-box render:

| Parameter | DOCX measured | UFM standard | Adopted | Note |
|-----------|---------------|--------------|---------|------|
| Font | Courier New 12pt | Courier New 12pt | ✅ DOCX = UFM | confirm |
| Left margin | 1.25″ (1800) | 1.25″ | ✅ DOCX = UFM | confirm |
| Right margin | **1.0″ (1440)** | **0.75″** | ⚠ **UFM** | DOCX < 6.5″ box; not adopted |
| Format box | 6.25″ | 6.5″ | ⚠ **UFM** | DOCX non-compliant |
| Line spacing | auto-double (`line=480`) | 28pt exact | ⚠ **UFM** | DOCX ~23 lines/page |
| Tab stops | 720/1440/2160 + center@4680 | 720/1440/2160/**2880** + center | ⚠ **UFM** | DOCX missing 2880 |
| Center tab | 4680 (= ½ of 6.5″ box) | 4680 | ✅ DOCX = UFM | corroborates 6.5″ box |

**Conclusion:** the certified PDF (format-box version) is expected to match the UFM locks; the DOCX is a pre-format-box draft. UFM values are locked; the DOCX confirms font, left margin, and core tab positions.

---

## SECTION E — Residuals (do not block the engine; verify on rendered output)
1. **Exact 25-line spacing.** 28pt is locked. At 1.0″ top/bottom (9.0″ = 648pt) the *exact* 25-line value is 648 ÷ 25 = **25.92pt**; 28pt yields ~23 lines in that area. The UFM 25-line rule and 28pt lock can only both hold if the printed body area differs from 9.0″ (e.g., header/footer or box insets reduce it) — **verify lines/page on the rendered certified PDF and treat 28pt (or the measured value) as the tuning knob.**
2. **Parenthetical tab.** Locked at 2.0″/2880 per UFM/DP-012 §7; the DOCX used the center tab. Confirm the certified PDF places parentheticals at 2880 (not centered) before the format engine encodes it.

---

## Directive
1. Treat §A/§B as **locked UFM authority**; cite DP-011 rather than re-deriving geometry.
2. Reconcile `wave8/backend/geometry/profile.py` to: tabs **720/1440/2160/2880 + center@4680**, right margin **0.75″**, line spacing **28pt exact** — these match wave8's existing right-margin/line-spacing constants; only its tab stops need correcting (360/900 → 720/1440).
3. Verify §E residuals against the certified PDF; update if the rendered output dictates.
4. Do not change transcript content. Geometry governs placement and layout only.

---

## Appendix A — Geometry lock table
| Parameter | DOCX | wave8 | UFM | **LOCK** |
|-----------|------|-------|-----|----------|
| Page | 8.5×11 | 8.5×11 | 8.5×11 | **8.5″ × 11″** |
| Font | Courier New 12pt | Courier New 12pt | Courier New 12pt | **Courier New 12pt (10 cpi)** |
| Format box | 6.25″ | 6.5″ | 6.5″ | **6.5″ (9360)** |
| Left margin | 1.25″ | 1.25″ | 1.25″ | **1.25″ (1800)** |
| Right margin | 1.0″ | 0.75″ | 0.75″ | **0.75″ (1080)** |
| Top / Bottom | 1.0″ / 1.0″ | 1.0″ / 1.0″ | 1.0″ / 1.0″ | **1.0″ / 1.0″** |
| Q./A. tab | 0.5″ | 0.25″ | 0.5″ | **0.5″ (720)** |
| Q/A text tab | 1.0″ | 0.625″ | 1.0″ | **1.0″ (1440)** |
| Speaker tab | 1.5″ | — | 1.5″ | **1.5″ (2160)** |
| Parenthetical tab | (center) | 2.0″ | 2.0″ | **2.0″ (2880)** |
| Center tab | 4680 | — | 4680 | **4680 (center of box)** |
| Continuation | return-to-margin | return-to-margin | return-to-margin | **Return-To-Margin, left_indent=0** |
| Line spacing | auto-double | 28pt | 28pt | **28pt exact (560)** |
| Lines/page | ~23 | 25 | 25 | **25** |
| Chars/line | ≤62 | 56–63 | 56–63 | **56–63 (max 63)** |
