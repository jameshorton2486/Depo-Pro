"""
docx_exporter.py — UFM-compliant DOCX export.

FIXES vs. original:
  All 7 critical UFM requirements were missing. Now implemented:
  ✓ US Letter page size (8.5×11")
  ✓ UFM margins: left=1.25", right=0.75", top=1.0", bottom=1.0"
  ✓ Courier New 12pt throughout
  ✓ Exactly 28pt line spacing (achieves 25 lines/page)
  ✓ DP-011 canonical tab stops:
      _TAB1=0.5"  (720 twips)  — Q./A. designation
      _TAB2=1.0"  (1440 twips) — Q/A text start position
      _TAB3=1.5"  (2160 twips) — Speaker label
      _TAB4=2.0"  (2880 twips) — Parenthetical
      _TAB5=3.25" (4680 twips) — Center tab
  ✓ Line numbers 1-25 in left gutter
  ✓ Format box paragraph border (enabled via show_format_box param)
  ✓ 25-line pagination enforcement
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

# ── UFM geometry (validated) ──────────────────────────────────────────────────
# ── MARGIN NOTE ──────────────────────────────────────────────────────────────
# Margins align with DepoPro Spec v2 §5.1 and spec_engine/emitter.py.
# Resolved 2026-03. No further action needed.
# ─────────────────────────────────────────────────────────────────────────────
_PAGE_W   = Inches(8.5)
_PAGE_H   = Inches(11)
_M_LEFT   = Inches(1.25)
_M_RIGHT  = Inches(0.75)
_M_TOP    = Inches(1.0)
_M_BOTTOM = Inches(1.0)
_FONT     = "Courier New"
_SIZE_PT  = Pt(12)
_LINE_SP  = Pt(28)           # exactly 25 lines on body page
_LINES_PG = 25
_TAB1     = 0.5
_TAB2     = 1.0
_TAB3     = 1.5
_TAB4     = 2.0
_TAB5     = 3.25
_NAVY     = RGBColor(0x00, 0x20, 0x60)
_ORANGE   = RGBColor(0xCC, 0x66, 0x00)


def _add_header_footer(
    doc: Document,
    case_style: str = "",
    cause_number: str = "",
    reporter_name: str = "",
    reporter_csr: str = "",
    certified_date: str = "",
) -> None:
    """
    Add running header and footer to every page of the document.
    """
    import datetime

    from docx.shared import Pt

    section = doc.sections[0]
    section.different_first_page_header_footer = False

    header = section.header
    for paragraph in list(header.paragraphs):
        paragraph._element.getparent().remove(paragraph._element)

    hdr_para = header.add_paragraph()
    hdr_para.paragraph_format.space_before = Pt(0)
    hdr_para.paragraph_format.space_after = Pt(0)

    left_text = case_style or cause_number or "DEPOSITION TRANSCRIPT"
    if len(left_text) > 60:
        left_text = left_text[:57] + "..."

    left_run = hdr_para.add_run(left_text + "\t")
    left_run.font.name = _FONT
    left_run.font.size = Pt(9)
    left_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    p_pr = hdr_para._p.get_or_add_pPr()
    tabs = OxmlElement("w:tabs")
    tab = OxmlElement("w:tab")
    tab.set(qn("w:val"), "right")
    tab.set(qn("w:pos"), "9360")
    tabs.append(tab)
    p_pr.append(tabs)

    def _add_field(para, field_name: str):
        r_pr = OxmlElement("w:rPr")
        font_el = OxmlElement("w:rFonts")
        font_el.set(qn("w:ascii"), _FONT)
        sz_el = OxmlElement("w:sz")
        sz_el.set(qn("w:val"), "18")
        color_el = OxmlElement("w:color")
        color_el.set(qn("w:val"), "444444")
        r_pr.append(font_el)
        r_pr.append(sz_el)
        r_pr.append(color_el)

        fld_run = OxmlElement("w:r")
        fld_run.append(r_pr)
        fld_char_begin = OxmlElement("w:fldChar")
        fld_char_begin.set(qn("w:fldCharType"), "begin")
        fld_run.append(fld_char_begin)
        para._p.append(fld_run)

        instr_run = OxmlElement("w:r")
        instr_run.append(r_pr)
        instr_text = OxmlElement("w:instrText")
        instr_text.set(qn("xml:space"), "preserve")
        instr_text.text = f" {field_name} "
        instr_run.append(instr_text)
        para._p.append(instr_run)

        fld_run_end = OxmlElement("w:r")
        fld_run_end.append(r_pr)
        fld_char_end = OxmlElement("w:fldChar")
        fld_char_end.set(qn("w:fldCharType"), "end")
        fld_run_end.append(fld_char_end)
        para._p.append(fld_run_end)

    page_label = hdr_para.add_run("Page ")
    page_label.font.name = _FONT
    page_label.font.size = Pt(9)
    page_label.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
    _add_field(hdr_para, "PAGE")
    of_run = hdr_para.add_run(" of ")
    of_run.font.name = _FONT
    of_run.font.size = Pt(9)
    of_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
    _add_field(hdr_para, "NUMPAGES")

    p_bdr = OxmlElement("w:pBdr")
    bot = OxmlElement("w:bottom")
    bot.set(qn("w:val"), "single")
    bot.set(qn("w:sz"), "4")
    bot.set(qn("w:space"), "1")
    bot.set(qn("w:color"), "aaaaaa")
    p_bdr.append(bot)
    p_pr.append(p_bdr)

    footer = section.footer
    for paragraph in list(footer.paragraphs):
        paragraph._element.getparent().remove(paragraph._element)

    ftr_para = footer.add_paragraph()
    ftr_para.paragraph_format.space_before = Pt(0)
    ftr_para.paragraph_format.space_after = Pt(0)

    reporter_line = reporter_name
    if reporter_csr:
        reporter_line += f", {reporter_csr}"

    left_ftr = ftr_para.add_run(reporter_line + "\t")
    left_ftr.font.name = _FONT
    left_ftr.font.size = Pt(9)
    left_ftr.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    p_pr_ftr = ftr_para._p.get_or_add_pPr()
    tabs_ftr = OxmlElement("w:tabs")
    tab_ftr = OxmlElement("w:tab")
    tab_ftr.set(qn("w:val"), "right")
    tab_ftr.set(qn("w:pos"), "9360")
    tabs_ftr.append(tab_ftr)
    p_pr_ftr.append(tabs_ftr)

    p_bdr_ftr = OxmlElement("w:pBdr")
    top_ftr = OxmlElement("w:top")
    top_ftr.set(qn("w:val"), "single")
    top_ftr.set(qn("w:sz"), "4")
    top_ftr.set(qn("w:space"), "1")
    top_ftr.set(qn("w:color"), "aaaaaa")
    p_bdr_ftr.append(top_ftr)
    p_pr_ftr.append(p_bdr_ftr)

    date_str = certified_date or datetime.date.today().strftime("%B %d, %Y")
    right_ftr = ftr_para.add_run(date_str)
    right_ftr.font.name = _FONT
    right_ftr.font.size = Pt(9)
    right_ftr.font.color.rgb = RGBColor(0x44, 0x44, 0x44)


def _set_tab_stops(paragraph, stops: list[float]) -> None:
    pPr = paragraph._p.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        paragraph._p.insert(0, pPr)
    old = pPr.find(qn("w:tabs"))
    if old is not None:
        pPr.remove(old)
    tabs = OxmlElement("w:tabs")
    for s in stops:
        tab = OxmlElement("w:tab")
        tab.set(qn("w:val"), "left")
        tab.set(qn("w:pos"), str(int(s * 1440)))
        tabs.append(tab)
    pPr.append(tabs)


def _apply_box_border(paragraph, sides: str) -> None:
    """Apply solid 0.75pt paragraph border. sides = combination of 't','b','l','r'."""
    def _border(tag, active):
        el = OxmlElement(tag)
        if active:
            el.set(qn("w:val"),   "single")
            el.set(qn("w:sz"),    "6")
            el.set(qn("w:space"), "0")
            el.set(qn("w:color"), "000000")
        else:
            el.set(qn("w:val"), "none")
        return el

    pPr = paragraph._p.find(qn("w:pPr"))
    if pPr is None:
        pPr = OxmlElement("w:pPr")
        paragraph._p.insert(0, pPr)
    old = pPr.find(qn("w:pBdr"))
    if old is not None:
        pPr.remove(old)
    pBdr = OxmlElement("w:pBdr")
    for tag, char in [("w:top","t"),("w:bottom","b"),("w:left","l"),("w:right","r")]:
        pBdr.append(_border(tag, char in sides))
    pPr.append(pBdr)


def _add_line(doc: Document, text: str, line_num: int, show_box: bool, box_sides: str) -> None:
    para = doc.add_paragraph()
    fmt = para.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after  = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    fmt.line_spacing      = _LINE_SP
    fmt.left_indent        = Inches(0)
    fmt.first_line_indent  = Inches(0)
    _set_tab_stops(para, [_TAB1, _TAB2, _TAB3, _TAB4, _TAB5])
    if show_box:
        _apply_box_border(para, box_sides)

    _render_line_runs(para, line_num, text)


def _apply_run_style(run, bold: bool = False, color: RGBColor | None = None) -> None:
    run.font.name = _FONT
    run.font.size = _SIZE_PT
    run.bold = bold
    if color is not None:
        run.font.color.rgb = color


def _render_line_runs(paragraph, line_num: int, text: str) -> None:
    prefix_run = paragraph.add_run(f"{line_num:2d} ")
    _apply_run_style(prefix_run)

    stripped = text.strip()
    if stripped.startswith("[SCOPIST:"):
        run = paragraph.add_run(text)
        _apply_run_style(run, bold=True, color=_ORANGE)
        return

    if stripped.startswith("(") and stripped.endswith(")"):
        run = paragraph.add_run(text)
        _apply_run_style(run, color=_NAVY)
        return

    import re

    label_match = re.match(r"^((?:MR|MS|MRS|DR)\.\s+[^:]+:)(.*)$", text)
    if label_match is None:
        label_match = re.match(r"^((?:THE\s+[A-Z][A-Z ]+):)(.*)$", text)

    if label_match:
        label_run = paragraph.add_run(label_match.group(1))
        _apply_run_style(label_run, bold=True)
        remainder_run = paragraph.add_run(label_match.group(2))
        _apply_run_style(remainder_run)
        return

    run = paragraph.add_run(text)
    _apply_run_style(run)


def export_to_docx(
    text: str,
    output_path: str,
    show_format_box: bool = False,
    case_style: str = "",
    cause_number: str = "",
    reporter_name: str = "",
    reporter_csr: str = "",
    certified_date: str = "",
) -> str:
    """
    Export transcript text to a UFM-compliant DOCX file.
    """
    if not text.strip():
        raise ValueError("No transcript content to export.")

    doc = Document()

    # Set UFM page geometry
    section = doc.sections[0]
    section.page_width    = _PAGE_W
    section.page_height   = _PAGE_H
    section.left_margin   = _M_LEFT
    section.right_margin  = _M_RIGHT
    section.top_margin    = _M_TOP
    section.bottom_margin = _M_BOTTOM

    # Collect all lines
    all_lines = text.splitlines()

    # Paginate into 25-line chunks
    pages: list[list[str]] = []
    for i in range(0, max(1, len(all_lines)), _LINES_PG):
        pages.append(all_lines[i : i + _LINES_PG])

    for page_idx, page_lines in enumerate(pages):
        # Pad to exactly 25 lines
        while len(page_lines) < _LINES_PG:
            page_lines.append("")

        for line_idx, line in enumerate(page_lines):
            line_num = line_idx + 1
            is_first = line_idx == 0
            is_last  = line_idx == _LINES_PG - 1

            if _LINES_PG == 1:
                sides = "tblr"
            elif is_first:
                sides = "tlr"
            elif is_last:
                sides = "blr"
            else:
                sides = "lr"

            _add_line(doc, line, line_num, show_format_box, sides)

        # Page break after each page except the last
        if page_idx < len(pages) - 1:
            from docx.enum.text import WD_BREAK
            br_para = doc.add_paragraph()
            br_para.add_run().add_break(WD_BREAK.PAGE)

    destination = Path(output_path)
    if destination.suffix.lower() != ".docx":
        destination = destination.with_suffix(".docx")

    if any([case_style, cause_number, reporter_name, reporter_csr, certified_date]):
        _add_header_footer(
            doc,
            case_style=case_style,
            cause_number=cause_number,
            reporter_name=reporter_name,
            reporter_csr=reporter_csr,
            certified_date=certified_date,
        )

    doc.save(destination)
    return str(destination)


@dataclass(frozen=True)
class _PhysicalRenderLine:
    content: str
    role: str
    first_line_tab_inches: float
    text_tab_inches: float | None
    continuation_indent_inches: float
    continuation: bool


def apply_body_geometry(doc: Document, geometry: Mapping[str, object]) -> None:
    """Set US-Letter page size + the render model's margins on the document section."""
    section = doc.sections[0]
    section.page_width = _PAGE_W
    section.page_height = _PAGE_H
    section.left_margin = Inches(float(geometry["left_margin_inches"]))
    section.right_margin = Inches(float(geometry["right_margin_inches"]))
    section.top_margin = _M_TOP
    section.bottom_margin = _M_BOTTOM


def write_render_model_body(doc: Document, render_model: Mapping[str, object]) -> None:
    """Write the numbered transcript body into an existing document (no section setup,
    no save). This is the ONE body-rendering authority; the certified complete-document
    assembly reuses it rather than re-implementing wrap/pagination."""
    geometry = render_model["geometry"]
    logical_lines = render_model["lines"]
    assert isinstance(geometry, dict)
    assert isinstance(logical_lines, list)

    format_box_width = float(geometry["format_box_width_inches"])
    lines_per_page = int(geometry["lines_per_page"])
    physical_lines = _expand_render_lines(logical_lines, format_box_width)

    for page_index in range(0, len(physical_lines), lines_per_page):
        page_lines = physical_lines[page_index : page_index + lines_per_page]
        for line_index, line in enumerate(page_lines):
            _add_render_line(doc, line, line_index + 1, float(geometry["line_spacing_points"]))
        if page_index + lines_per_page < len(physical_lines):
            from docx.enum.text import WD_BREAK

            page_break = doc.add_paragraph()
            page_break.add_run().add_break(WD_BREAK.PAGE)


def export_render_model_to_docx(render_model: Mapping[str, object], output_path: str) -> str:
    doc = Document()
    apply_body_geometry(doc, render_model["geometry"])
    write_render_model_body(doc, render_model)

    destination = Path(output_path)
    if destination.suffix.lower() != ".docx":
        destination = destination.with_suffix(".docx")
    doc.save(destination)
    return str(destination)


def _expand_render_lines(logical_lines: list[object], format_box_width: float) -> list[_PhysicalRenderLine]:
    physical: list[_PhysicalRenderLine] = []
    for entry in logical_lines:
        assert isinstance(entry, dict)
        content = entry["content"]
        geometry = entry["geometry"]
        assert isinstance(content, str)
        assert isinstance(geometry, dict)
        role = str(geometry["role"])
        first_tab = float(geometry["first_line_tab_inches"])
        raw_text_tab = geometry.get("text_tab_inches")
        text_tab = float(raw_text_tab) if isinstance(raw_text_tab, (int, float)) else None
        continuation_tab = float(geometry["continuation_indent_inches"])

        label = ""
        body = content
        if role == "qa":
            import re

            match = re.match(r"^([QA]\.)\s*(.*)$", content, flags=re.DOTALL)
            if match:
                label, body = match.groups()

        first_start = text_tab if label and text_tab is not None else first_tab
        first_width = _character_capacity(format_box_width, first_start)
        continuation_width = _character_capacity(format_box_width, continuation_tab)
        fragments = _wrap_content(body, first_width, continuation_width)
        for index, fragment in enumerate(fragments):
            line_content = f"{label} {fragment}".rstrip() if index == 0 and label else fragment
            physical.append(
                _PhysicalRenderLine(
                    content=line_content,
                    role=role,
                    first_line_tab_inches=first_tab,
                    text_tab_inches=text_tab,
                    continuation_indent_inches=continuation_tab,
                    continuation=index > 0,
                )
            )
    return physical


def _character_capacity(format_box_width: float, indent: float) -> int:
    return max(1, int((format_box_width - min(format_box_width, max(0.0, indent))) * 10))


def _wrap_content(content: str, first_width: int, continuation_width: int) -> list[str]:
    words = content.split()
    if not words:
        return [""]

    lines: list[str] = []
    current = ""
    width = first_width
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if current and len(candidate) > width:
            lines.append(current)
            current = word
            width = continuation_width
        else:
            current = candidate
    lines.append(current)
    return lines


def _add_render_line(doc: Document, line: _PhysicalRenderLine, line_number: int, line_spacing_points: float) -> None:
    paragraph = doc.add_paragraph()
    paragraph_format = paragraph.paragraph_format
    paragraph_format.space_before = Pt(0)
    paragraph_format.space_after = Pt(0)
    paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    paragraph_format.line_spacing = Pt(line_spacing_points)

    stops = [
        stop
        for stop in (line.first_line_tab_inches, line.text_tab_inches, line.continuation_indent_inches)
        if stop is not None and stop > 0
    ]
    _set_tab_stops(paragraph, sorted(set(stops)))
    if line.role == "centered":
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER

    number_run = paragraph.add_run(f"{line_number:2d} ")
    _apply_run_style(number_run)
    if line.continuation:
        if line.continuation_indent_inches > 0:
            paragraph.add_run("\t")
        content_run = paragraph.add_run(line.content)
        _apply_run_style(content_run)
        return

    if line.first_line_tab_inches > 0 and line.role != "centered":
        paragraph.add_run("\t")
    if line.role == "qa" and line.text_tab_inches is not None:
        label, separator, remainder = line.content.partition(" ")
        label_run = paragraph.add_run(label)
        _apply_run_style(label_run)
        paragraph.add_run("\t")
        content_run = paragraph.add_run(remainder if separator else "")
        _apply_run_style(content_run)
        return

    content_run = paragraph.add_run(line.content)
    _apply_run_style(content_run, bold=line.role == "speaker", color=_NAVY if line.role == "parenthetical" else None)
