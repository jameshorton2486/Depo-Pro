# GOLD-STANDARD GAP ANALYSIS — app export vs certified transcript

**Source.** Same deposition (Heath Thomas, 2026-04-30), two versions: the app's DOCX export and the
court reporter's certified transcript. Every difference between them is a transformation the app must
perform. This is a **reusable target spec**, not a one-off correction of this transcript.

**The headline.** The gap is **six distinct jobs**, only one of which is the geometry/formatting work
already underway. Most of the gap is *upstream* — understanding who spoke and what they said — not
where text sits on the page. Even with perfect geometry, the app's output does not approach the
certified document until the upstream engines exist. **Do not attempt to close this gap by editing
this one transcript to match; that fakes an output instead of building a capability.**

---

## The six transformation layers (in dependency order)

### 1. Speaker resolution — HIGHEST LEVERAGE
The biggest reason the app output looks wrong.

| App output | Certified | Transformation |
|---|---|---|
| `THE REPORTER:` on attorney + witness speech | distinct `MR. NUNEZ:`, `MS. ZHAN:`, `MR. THOMAS:`, `THE REPORTER:` | correct speaker attribution |
| `Mia Bardado` / `Mia` | `Miah Bardot` | known-entity name correction |
| `BY CUKJATI:` / `Lucia Zahn` | `MS. ZHAN:` / `Lucia Zhan` | attorney identity + honorific |
| bare `6:` / `7:` (unmapped indices) | mapped or rendered as proper speakers | map every raw speaker index |

Engine: **speaker-resolution overlay** (partly built — Steps 1–3 landed earlier; this is the
finish-and-correct work). Without it nothing else reads correctly, because Q/A and normalization
operate on correctly-attributed lines.

### 2. Q/A reconstruction
| App | Certified |
|---|---|
| `Q.  Yes, ma'am.` (answer tagged Q) | `A.` |
| `Q.  Not exactly.` (answer) | `A.` |
| `Q.  I'm ready.` / `A.  I'm prepared.` (reversed) | correct roles |
| objections folded into the Q stream | `MS. ZHAN:  Objection. Vague and ambiguous.` colloquy |
Engine: **Q/A reconstruction** (future; not built).

### 3. Paragraph / utterance consolidation
| App | Certified |
|---|---|
| `A. 12135` / `A. Stoney Glen,` / `A. San Antonio, Texas` / `A. 78247.` | one merged answer |
| dozen short `A.` fragments (job-duties) | one coherent paragraph |
Engine: **paragraph builder** (consolidate fragmented utterances into answers).

### 4. Morson's text normalization
| App | Certified | Rule |
|---|---|---|
| `mister Nunez` | `Mr. Nunez` | abbreviations |
| `Fifty seven, May seventh nineteen sixty eight` | `57.  May 7th, 1968.` | numbers/dates → figures |
| `01:31PM` | `1:31 p.m.` | time format |
| `c v 00598DashOLG` | `25-CV-00598-OLG` | cause number + spoken-"dash" artifact |
| `U. S. A.` | `U.S.A.` | abbreviation spacing |
| `Delia Garza, PLLC … defendants` | `Delia Garza, plaintiff, versus Home Depot … defendants` | caption normalization |
Engine: **punctuation/correction (Morson's)** (greenfield in `src/` per the conformance audit).

### 5. Procedural reconstruction
| App | Certified |
|---|---|
| `THE REPORTER: The time is 01:34PM, / and we are off the record.` | `(Recess from 1:34 p.m. to 1:35 p.m.)` |
| swearing-in chatter | `HEATH THOMAS, / having been first duly sworn, testified as follows:` |
| (none) | `(Deposition concluded at 3:52 p.m.)` |
Engine: **procedural reconstruction** (future; detection→generation of recess/oath/closing blocks).

### 6. Assembly + geometry (structure + how it looks)
- Certified has `PROCEEDINGS`, the sworn-witness block, `EXAMINATION` / `BY MR. NUNEZ:` structure,
  and (caption / appearances / certificate pages as applicable). App starts cold. → **assembly engine**.
- Geometry (tabs, label positions, double-spacing) → already in progress. **This is the last and
  smallest layer**; it's correct that it's nearly done, but it is not what closes this gap.

---

## What this means for "how do we modify the app"

1. **No single change does it.** The certified document is the output of six capabilities. Geometry
   (done) is one; the other five are upstream and mostly unbuilt.
2. **Sequence is forced by dependency.** Speaker resolution first (everything reads off correct
   attribution) → Q/A reconstruction + paragraph consolidation → Morson's normalization →
   procedural reconstruction → assembly. Geometry sits under all of them and is already handled.
3. **Highest immediate value: speaker resolution (layer 1).** It's the most-built of the unbuilt
   engines and the biggest visible-quality jump. It is the right next target.
4. **Build reusable engines, never transcript-specific fixes.** Each rule above must generalize to
   any deposition. The two documents are the *acceptance fixture*: when the engines run on this
   deposition's raw data, the output should approach the certified version.

---

## FLAG — the certified transcript contradicts the locked dash decision
The certified reporter renders interruptions/self-corrections as a **spaced em dash ` — `**
(`Home De — Depot`, `the —`, `mov —`), NOT the double hyphen `--` just locked into the specs as the
"Texas UFM" rule. This is real certified output from your own reporter. It does not need action now,
but it is direct evidence that the dash decision should be revisited against what Miah actually
produces — the same "check it against a real transcript" principle that resolved the tab model.
Recorded here so it is not lost.

---

## Recommended next step
Treat these two documents as the **acceptance fixture** for the pipeline. The immediate build is
**speaker resolution (layer 1)** — finish/correct the overlay so attribution, names, and honorifics
match the certified version on this deposition's data. That is a scoped, audit-first task on an
engine that already partly exists, and it produces the largest visible improvement. The other layers
follow in dependency order.
