# CSR Format Confirmation — Cover Note

**For:** Miah (Certified Shorthand Reporter), format authority
**Sample:** `outputs/csr_format_sample.docx`
**Purpose:** This document renders the **already-ratified** format so you can confirm it *looks* right on a real page. It is a visual confirmation of decisions already made in `docs/architecture/RATIFIED_DECISIONS.md` — it is **not** asking you to re-decide anything.

Every value in the sample comes from a ratified decision. Nothing here is a new proposal.

---

## What the sample applies

| Rule | What you should see in the sample |
|---|---|
| **F1** | Colloquy speaker label begins **1.5" from the left margin** (three left tab stops at 0.5", 1.0", 1.5"). |
| **F2** | **Two spaces** between the label's colon and the body text. |
| **F3** | **Two spaces** after the end of every sentence. |
| **F4** | **One space** after an abbreviation (`Mr.`, `Dr.`, `U.S.`, `a.m.`). |
| **F5** | Body begins on the label line; continuation lines **wrap flush to the left margin (0")**. |
| **F6** | Stutters render with an em-dash: `I — I`. |
| **F7** | Objections follow F3: `Objection.  Form.` (two spaces). |
| **F9** | No generic labels. Real names, or role titles — the sample shows **THE VIDEOGRAPHER**, **THE WITNESS**, **THE REPORTER**, and **THE COURT REPORTER (continuing)**. |

**Not applied, on purpose:** **F8** line numbering (25 numbered lines per page) is added **at Certification only**. This is a pre-certification sample, so it has **no line numbers**. Their absence is by design — please don't read it as a defect.

---

## Where the colloquy label sits (F1)

```
 paper                left
 edge                 margin
  |                     |
  |<------- 1.5" ------>|·····tab·····|·····tab·····|·····tab·····|
  |                     0"           0.5"          1.0"          1.5"
  |                     |                                        |
  |                     |                          THE WITNESS:  I don't recall…
  |                     |<--------------- 1.5" ----------------->|
  |                                                              |
  |<--------------------- 3.0" from paper edge ----------------->|
```

- The page's **left margin is 1.5"** in from the paper's edge.
- The colloquy line then advances **three left tabs** (0.5" → 1.0" → 1.5"), so the label starts **1.5" past the margin**.
- 1.5" (margin) + 1.5" (three tabs) = **3.0" from the paper's edge**.
- The code constant is **1.5"** (distance from the margin), per F1 — not 3.0".
- The label and its colon never split across lines; if the body wraps, it returns to the **left margin (0")**.

---

## Please confirm (four points)

**1. Colloquy layout (F1–F5).** Does the colloquy speaker-label position, the two-space colon, and the flush-left wrapping match your standard?

> ☐ Yes ☐ Adjust: ______________________________________________

**2. Abbreviations (F4 / A10).** Is the one-space-after-abbreviation handling correct, and **what abbreviations are missing** from the list we should support? (`Mr.`, `Dr.`, `U.S.`, `a.m.` are shown.)

> ☐ Correct ☐ Missing / change: __________________________________

**3. AI corrections + your read-through (A5).** AI corrections apply **automatically** and are **marked in the Workspace**, so you can see exactly what changed during your read-through, with the **original always viewable**. Your full read-through, recorded at the **Certification checklist**, is the human decision that covers the applied set. Silent, unrecorded changes are prohibited. Does that match how you want to work?

> ☐ Yes ☐ Adjust: ______________________________________________

**4. Marking of speaker-label changes (A5).** Speaker-label changes will be marked **more prominently** than word changes — because a misattributed answer is the error a read-through is least likely to catch. Confirm or adjust.

> ☐ Confirm ☐ Adjust: ___________________________________________

---

## Known defects disclosed (so you don't waste time on them)

1. **Stutter vs. legitimate repetition — scheduled for repair.** The verbatim baseline (A9) must preserve legitimate repetitions like **"had had"** exactly. The *current* stutter engine wrongly converts one such repetition into an em-dash stutter (`had — had`) that was never spoken. **The sample shows the CORRECT output**; this defect is called out on the sample's last page so it isn't mistaken for the ratified format. Fix is queued.
2. **No line numbering (F8).** Intentional for a pre-certification sample, as above.

---

## One step only you can do

Please **open the `.docx` in Word, print one page, and put a ruler on it** — confirm the colloquy label sits **3.0" from the paper's edge** (1.5" margin + 1.5" of tabs). I generated and screen-verified the layout, but the physical ruler check against a printed page is yours to make. That is the last item before this goes to you for sign-off.

---

*Format values sourced from `docs/architecture/RATIFIED_DECISIONS.md` (F1–F10, A1–A10). Generated on branch `docs/csr-format-confirmation`. Sample built with a deterministic script; no AI model was called during rendering (A10).*
