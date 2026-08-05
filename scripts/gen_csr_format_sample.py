#!/usr/bin/env python3
"""Generate outputs/csr_format_sample.docx per DEPO-PRO RATIFIED_DECISIONS.md.

Every format value is sourced from a ratified decision and cited inline:
  F1 colloquy label at 1.5" (three left tabs at 0.5/1.0/1.5)
  F2 two spaces after the speaker-label colon
  F3 two spaces after every sentence
  F4 one space after an abbreviation
  F5 colloquy body on the label line; continuation wraps flush left (0")
  F6 stutters render with a spaced double hyphen: I -- I (ADR-0011)
  F7 objection spacing follows F3: "Objection.  Form." (two spaces)
  F9 no generic labels; real names or role titles (THE REPORTER, etc.)
  F17 inline resumption by-line: Q. (BY MR. NAME) after a colloquy interruption
NOT applied: F8 line numbering (Certification only) -> disclosed in cover note.
"""
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_TAB_ALIGNMENT, WD_LINE_SPACING, WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn

SECT = "§"   # section symbol for the caption column
EMD = "--"   # spaced double hyphen (F6 stutters/false starts, ADR-0011)

doc = Document()

# ---- Page: US Letter, standard 1.5" left margin (F1 references this margin) ----
s = doc.sections[0]
s.page_width, s.page_height = Inches(8.5), Inches(11)
s.left_margin = Inches(1.5)
s.right_margin = Inches(0.5)
s.top_margin = Inches(1.0)
s.bottom_margin = Inches(1.0)

# ---- Normal: Courier New 12 (transcript standard) ----
normal = doc.styles["Normal"]
normal.font.name = "Courier New"
normal.font.size = Pt(12)
rpr = normal.element.get_or_add_rPr()
rf = rpr.get_or_add_rFonts()
for a in ("w:ascii", "w:hAnsi", "w:cs"):
    rf.set(qn(a), "Courier New")
normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
normal.paragraph_format.space_after = Pt(0)

TABS = (Inches(0.5), Inches(1.0), Inches(1.5))  # F1


def add_f1_tabs(p):
    for pos in TABS:
        p.paragraph_format.tab_stops.add_tab_stop(pos, WD_TAB_ALIGNMENT.LEFT)


def body(double=True):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = (
        WD_LINE_SPACING.DOUBLE if double else WD_LINE_SPACING.SINGLE
    )
    return p


def colloquy(label, text):
    # F1 three tabs -> label at 1.5"; F2 two spaces after colon; F5 wrap flush left (0")
    p = body(double=True)
    add_f1_tabs(p)
    p.add_run("\t\t\t" + label + "  " + text)
    return p


def qa(tag, text):
    # Q/A layout is not governed by F1-F10; use a clean hanging indent at 0.5".
    p = body(double=True)
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.5)
    p.paragraph_format.tab_stops.add_tab_stop(Inches(0.5), WD_TAB_ALIGNMENT.LEFT)
    p.add_run(tag + "\t" + text)
    return p


def paren(text):
    return body(double=True).add_run("(" + text + ")")


def center(text, bold=False, spaced=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("  ".join(text) if spaced else text)
    r.bold = bold
    return p


def blank():
    doc.add_paragraph()


# ---- Caption block with the section-symbol column (3-col borderless table) ----
cap_rows = [
    ("JANE A. GARZA,", "IN THE DISTRICT COURT"),
    ("", ""),
    ("     Plaintiff,", ""),
    ("", ""),
    ("VS.", "BEXAR COUNTY, TEXAS"),
    ("", ""),
    ("EXAMPLE RETAIL, LLC,", ""),
    ("", ""),
    ("     Defendant.", "285TH JUDICIAL DISTRICT"),
]
tbl = doc.add_table(rows=len(cap_rows), cols=3)
tbl.alignment = WD_ALIGN_PARAGRAPH.CENTER
tbl.autofit = False
widths = (Inches(3.0), Inches(0.4), Inches(3.1))
for i, (left, right) in enumerate(cap_rows):
    cells = tbl.rows[i].cells
    cells[0].text = left
    cells[1].text = SECT
    cells[2].text = right
    for c, w in zip(cells, widths):
        c.width = w
        for para in c.paragraphs:
            para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

blank()
center("ORAL DEPOSITION OF")
center("DR. ALAN R. PEREZ")   # F4: "Dr." one space
center("APRIL 30, 2026")
blank()

# ---- Appearances ----
center("APPEARANCES", bold=True)
blank()
for line, dbl in [
    ("FOR THE PLAINTIFF:", False),
    ("     Mr. James T. Calderon", False),          # F4 "Mr." one space
    ("     BROTHERS, ALVARADO, PIAZZA & COZORT, P.C.", False),
    ("     123 Main Street, Suite 400", False),
    ("     San Antonio, Texas 78205", False),
    ("", False),
    ("FOR THE DEFENDANT:", False),
    ("     Ms. Priya N. Rao", False),
    ("     HALVORSEN & REYES, LLP", False),
    ("     900 Commerce Street", False),
    ("     San Antonio, Texas 78205", False),
    ("", False),
    ("ALSO PRESENT:", False),
    ("     Mr. Devin Ortiz, Videographer", False),
]:
    p = body(double=dbl)
    p.add_run(line)

doc.add_page_break()

# ---- Proceedings ----
center("P R O C E E D I N G S", bold=True)
blank()

# Colloquy 1 - THE VIDEOGRAPHER on the record (F9 role title)
colloquy(
    "THE VIDEOGRAPHER:",
    "This is the start of media unit one in the oral deposition of "
    "Dr. Alan R. Perez.  Today is April 30, 2026, and the time is 9:02 a.m.  "
    "Will the reporter please swear the witness.",
)
paren("The witness was sworn.")
p = body(); p.add_run("DR. ALAN R. PEREZ,")
p = body(); p.add_run("having been first duly sworn, testified as follows:")
blank()
center("EXAMINATION", bold=True)
p = body(); p.add_run("BY MR. CALDERON:")

# ---- 8 Q/A exchanges (verbatim fillers/stutters/repetitions preserved, A9) ----
qa("Q.", "Please state your full name for the record.")
qa("A.", "Dr. Alan R. Perez.")                                   # F4 "Dr."

qa("Q.", "And, Dr. Perez, where do you work?")
qa("A.", "I work at the U.S. Medical Center downtown.")          # F4 "U.S."

qa("Q.", "What time did you arrive on the morning of the incident?")
qa("A.", "Um, it was around 8:15 a.m., I think.")                # filler + F4 "a.m."

qa("Q.", "Did you review the report before today?")
qa("A.", "Yeah, I " + EMD + " I read it twice last night.")     # filler + F6 stutter "I -- I"

# Objection sits between a question and its answer (clean ADR-0014 demo):
# Q -> objection (F7) -> ruling -> witness answer renders as A., not THE WITNESS:
qa("Q.", "And when did you first receive the report?")
colloquy("MR. RAO:", "Objection.  Form.")                         # F7/F3: "Objection.  Form." two spaces
colloquy("MR. CALDERON:", "You can answer.")
qa("A.", "I don't recall the exact date.")                        # ADR-0014: answer to the pending Q -> A.

# F17 inline resumption by-line after the colloquy interruption (one space after MR., no colon)
qa("Q.", "(BY MR. CALDERON)  Tell me what happened next.")        # F17 resumption + F6 false start below
qa("A.", "We were " + EMD + " the meeting was moved to the second floor.")   # false start (F6 spaced --)

qa("Q.", "Had you met the plaintiff before that day?")
qa("A.", "I had had one prior meeting with her, uh, back in March.")   # legit repetition "had had" + filler

# Colloquy 5 - THE REPORTER interjection (F9 role title; corpus form, no "(continuing)")
colloquy("THE REPORTER:", "Counsel, could you please spell that surname for the record?")

# F17 resumption by-line after the reporter interjection
qa("Q.", "(BY MR. CALDERON)  What did you tell Mr. Calderon that morning?")   # F17 resumption + F4 "Mr."
qa("A.", "I told him that that report was accurate.")             # legit repetition "that that"

# Colloquy 6 - reporter interjection that wraps 3+ lines (F5 flush-left wrap)
colloquy(
    "THE REPORTER:",
    "I am sorry, Counsel, but I need everyone to speak one at a time.  "
    "When two people talk over each other, I cannot take down a clean "
    "record, and the transcript will show only a crosstalk notation "
    "instead of the actual testimony that the witness gave.",
)

qa("Q.", "Is there anything you would like to add?")
qa("A.", "No, that's all I recall.")

# Colloquy 7 - THE VIDEOGRAPHER off the record (F9 role title)
colloquy("THE VIDEOGRAPHER:", "We are going off the record.  The time is 10:42 a.m.")
paren("Whereupon, a recess was taken at 10:42 a.m.")              # ADR-0013: recess parenthetical; time from the videographer above

# ---- Known limitations (kept out of the testimony body) ----
doc.add_page_break()
center("KNOWN LIMITATIONS OF THIS SAMPLE", bold=True)
blank()


def note_head(text):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.add_run(text).bold = True


def note_body(text):
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.space_after = Pt(10)
    p.add_run(text)


note_head("1.  Stutter vs. legitimate repetition (scheduled for repair).")
note_body(
    'The verbatim baseline (A9) preserves legitimate repetitions such as '
    '"had had" in the answer above.  The current stutter engine, however, would '
    'wrongly render it as "had -- had" -- a spaced double-hyphen stutter (F6, '
    "ADR-0011) that was never spoken.  This sample shows the CORRECT output; the "
    "defect is disclosed here so it is not mistaken for the ratified format."
)
note_head("2.  No line numbering, by design.")
note_body(
    "F8 places the 25-per-page line numbers at Certification only; they do not "
    "appear in the Transcript Workspace or in this pre-certification sample.  "
    "Their absence here is intentional, not a formatting defect."
)

import os
os.makedirs("outputs", exist_ok=True)
doc.save("outputs/csr_format_sample.docx")
print("wrote outputs/csr_format_sample.docx")
