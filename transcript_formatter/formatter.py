"""
formatter.py — UFM-compliant text formatting rules engine.

FIXES vs. original:
  - WRAP_WIDTH changed from 72 → 65  (UFM §2.5: 6.5" × 10 CPI = 65 chars)
  - CONTINUATION_INDENT changed from 5 spaces → "" (empty)
    UFM §2.10: continuation lines return to LEFT MARGIN, not indented 5 spaces
  - Q/A label detection now handles period, colon, or dash after Q/A
  - Added REPORTER_LABEL normalization (THE COURT REPORTER → THE REPORTER)
  - Added em dash / en dash → double hyphen normalization
  - Added time format normalization (2:12 PM → 2:12 p.m.)
  - Added deterministic normalization for Okay./Mm-hmm, section headers,
    sentence spacing, simple percent/money, and as-read parentheticals
"""

import json
import re
import textwrap
from pathlib import Path
from typing import Iterable


WRAP_WIDTH = 65                             # FIX: was 72, must be 65 (UFM §2.5)
CONTINUATION_INDENT = ""                   # FIX: was " " * 5, must be "" (UFM §2.10)
QA_INDENT = ""                             # Q./A. start at left margin; tabs position them
QA_WIDTH = 56                              # 65 - 9 (tab + label + tab occupies ~9 chars)
APP_DIR = Path(__file__).resolve().parent
CUSTOM_FORMATTER_RULES_PATH = APP_DIR / "custom_formatter_rules.json"


# ── Text normalization ────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    cleaned = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r'([.?]["\')\]]*) {2,}', r"\1<<DOUBLE_SPACE>>", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r" *\n *", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = cleaned.replace("<<DOUBLE_SPACE>>", "  ")
    return cleaned.strip()


def normalize_dashes(text: str) -> str:
    """LEGACY — string path only. Block path uses spec_engine/corrections.py."""
    text = text.replace("\u2014", " -- ")  # em dash —
    text = text.replace("\u2013", " -- ")  # en dash –
    text = re.sub(r"\s*---\s*", " -- ", text)
    return text


def normalize_spaced_dashes(text: str) -> str:
    """Normalize attached double hyphens to spaced double hyphens."""
    return re.sub(r"(?<=\w)--(?=\w)", " -- ", text)


def normalize_time_format(text: str) -> str:
    """LEGACY — string path only. Block path uses spec_engine/corrections.py."""
    def _fix(m: re.Match) -> str:
        hour = str(int(m.group(1)))
        period = m.group(3).lower().replace(" ", "")
        if "." not in period:
            period = period[0] + "." + period[1] + "."
        return f"{hour}:{m.group(2)} {period}"

    return re.compile(
        r"\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|AM|PM|am|pm)\b\.?",
        re.IGNORECASE,
    ).sub(_fix, text)


def normalize_reporter_label(text: str) -> str:
    """LEGACY — string path only. Block path uses spec_engine/corrections.py."""
    return re.sub(r"\bTHE COURT REPORTER\s*:", "THE REPORTER:", text)


def normalize_universal_corrections(text: str) -> str:
    """LEGACY — string path only. Block path uses spec_engine/corrections.py."""
    text = re.sub(r"(?<!\w)[Kk]\.(?=\s|$)", "Okay.", text)
    text = re.sub(r"\b(?:Mhmm|Mmhm)\b", "Mm-hmm", text)
    return text


def normalize_highway_references(text: str) -> str:
    """Normalize common Texas highway references to hyphenated form."""
    replacements = (
        (r"\bI\s+10\b", "I-10"),
        (r"\bI\s+20\b", "I-20"),
        (r"\bI\s+35\b", "I-35"),
        (r"\bI\s+37\b", "I-37"),
        (r"\bI\s+45\b", "I-45"),
        (r"\bI\s+410\b", "I-410"),
    )
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def normalize_uh_huh_hyphenation(text: str) -> str:
    """
    Normalize spoken affirmation/negation sounds to their hyphenated forms.
    """
    def _uh_huh(match: re.Match) -> str:
        return "Uh-huh" if match.group(0)[:1].isupper() else "uh-huh"

    def _uh_uh(match: re.Match) -> str:
        return "Uh-uh" if match.group(0)[:1].isupper() else "uh-uh"

    def _mm_hmm(match: re.Match) -> str:
        return "Mm-hmm" if match.group(0)[:1].isupper() else "mm-hmm"

    text = re.sub(r"\b[Uu]h[\W_]+huh\b", _uh_huh, text)
    text = re.sub(r"\b[Uu]h[\W_]+uh\b", _uh_uh, text)
    text = re.sub(r"\b[Mm]m[\W_]+hmm\b", _mm_hmm, text)
    return text


def normalize_duplicate_words(text: str) -> str:
    """LEGACY — string path only. Block path uses spec_engine/corrections.py."""
    return re.sub(r"\b([A-Za-z]{4,})\s+\1\b", r"\1", text, flags=re.IGNORECASE)


def normalize_doctor_artifact(text: str) -> str:
    """Normalize 'Doctor. Smith' artifacts to 'Dr. Smith'."""
    return re.sub(r"\bDoctor\.\s+([A-Z][a-zA-Z'-]+)\b", r"Dr. \1", text)


def normalize_as_read_parenthetical(text: str) -> str:
    """Normalize document-reading parentheticals to the legal-house style."""
    text = re.sub(r"\((?:reading|read into the record)\)", "(as read)", text, flags=re.IGNORECASE)
    text = re.sub(r"\[(?:reading|read into the record)\]", "(as read)", text, flags=re.IGNORECASE)
    return text


def normalize_section_headers(text: str) -> str:
    """Normalize examination headers to the required hyphenated forms."""
    replacements = {
        "DIRECT EXAMINATION": "DIRECT EXAMINATION",
        "CROSS EXAMINATION": "CROSS-EXAMINATION",
        "CROSS-EXAMINATION": "CROSS-EXAMINATION",
        "REDIRECT EXAMINATION": "REDIRECT EXAMINATION",
        "RECROSS EXAMINATION": "RECROSS-EXAMINATION",
        "RECROSS-EXAMINATION": "RECROSS-EXAMINATION",
    }
    normalized_lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        upper = stripped.upper()
        if upper in replacements:
            normalized_lines.append(replacements[upper])
        else:
            normalized_lines.append(line)
    return "\n".join(normalized_lines)


def normalize_percent_and_money(text: str) -> str:
    """
    Normalize numeric shorthand to spoken form.

    WARNING: Alters the verbatim record. Only call via format_transcript()
    with clean_verbatim=True. Do NOT include in standard transcript runs.
      '50%' -> '50 percent'
      '$1,000.00' -> '$1,000'
    """
    text = re.sub(r"\b(\d+(?:\.\d+)?)\s*%", r"\1 percent", text)
    text = re.sub(r"\$(\d{1,3}(?:,\d{3})*|\d+)\.00\b", r"$\1", text)
    return text


_ABBREV_NO_SPLIT = re.compile(
    r'\b(?:Dr|Mr|Mrs|Ms|Jr|Sr|St|Lt|Sgt|Cpl|Pvt|Prof|Rev|Gen|Col|Maj|Capt'
    r'|vs|etc|No|Vol|Fig|approx|est|dept|govt|Inc|Corp|Ltd|LLC|PLLC'
    r'|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.$',
    re.IGNORECASE,
)

_SENTENCE_SPLIT_RE = re.compile(r'(?<=[.?!])\s+(?=[A-Z(\["\'])')


def split_at_sentence_boundaries(text: str) -> str:
    """
    Split a speaker block into separate paragraphs at sentence boundaries.

    WARNING: Restructures the witness's answer and alters verbatim layout.
    Only call via format_transcript() with clean_verbatim=True. A long
    answer with multiple sentences is NOT the same as several short answers.
    Per Morson's English Guide and UFM: long answers must become separate paragraphs.
    Guards: abbreviations (Dr., Mr., Inc.) and ellipsis (. . .) are never split.
    Morson's Rule 270: spaced periods as ellipsis are preserved verbatim.
    """
    if not text.strip():
        return text
    protected = text.replace('. . .', '\x00ELLIPSIS\x00')
    parts = _SENTENCE_SPLIT_RE.split(protected)
    result_parts: list[str] = []
    buffer = ""
    for part in parts:
        if buffer and _ABBREV_NO_SPLIT.search(buffer.rstrip()):
            buffer = (buffer + " " + part).strip()
            continue
        if buffer:
            result_parts.append(buffer)
        buffer = part
    if buffer:
        result_parts.append(buffer)
    return "\n".join(
        p.replace('\x00ELLIPSIS\x00', '. . .').strip()
        for p in result_parts if p.strip()
    )


def normalize_okay_all_right_transition(text: str) -> str:
    """Normalize standalone Okay/All right transitional commas to periods."""
    text = re.sub(r"(?m)^(\s*Okay),(?=\s*$)", r"\1.", text)
    text = re.sub(r"(?m)^(\s*All right),(?=\s*$)", r"\1.", text)
    return text


def normalize_mid_sentence_okay(text: str) -> str:
    """Normalize mid-sentence 'Okay,' / 'All right,' transitions before capitals."""
    return re.sub(
        r"\b(Okay|All right),\s+(?=[A-Z])",
        r"\1.  ",
        text,
    )


def normalize_sentence_spacing(text: str) -> str:
    """
    Apply exactly two spaces after sentence-ending punctuation per Morson's §1.2.

    Guards:
      - abbreviations like Dr., Mr., Mrs., Ms., Jr., No., a.m., p.m.
      - spaced ellipsis '. . .'
    """
    _ELLIPSIS_TOK = '\x00ELLIPSIS\x00'
    working = text.replace('. . .', _ELLIPSIS_TOK)

    _ABBR_RE = re.compile(
        r'\b(?:Dr|Mr|Mrs|Ms|Jr|Sr|St|Lt|Sgt|Cpl|Pvt|Prof|Rev|Gen|Col|Maj|Capt'
        r'|vs|etc|No|Vol|approx|est|dept|Inc|Corp|Ltd|LLC|PLLC'
        r'|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec'
        r'|a\.m|p\.m)\.',
        re.IGNORECASE,
    )
    abbr_tokens: list[tuple[str, str]] = []

    def _tok_abbr(m: re.Match) -> str:
        tok = f'\x01A{len(abbr_tokens)}\x01'
        abbr_tokens.append((tok, m.group(0)))
        return tok

    working = _ABBR_RE.sub(_tok_abbr, working)

    working = re.sub(
        r'(?<!\.)(([.?!])(?:["\')\]]*)?)[ \t]+(?=[A-Z(\["\'])',
        lambda m: f'{m.group(1)}  ',
        working,
    )
    working = re.sub(r'([.!?])[ \t]{3,}([A-Z])', r'\1  \2', working)

    for tok, original in abbr_tokens:
        working = working.replace(tok, original)
    return working.replace(_ELLIPSIS_TOK, '. . .')


def split_inline_qa_transitions(text: str) -> str:
    """
    Re-split Q. and A. labels that were collapsed inline by normalize_sentence_spacing
    or that arrived inline from a loaded TXT/AI pass.
    Must run AFTER all normalization passes and BEFORE apply_qa_format.
    """
    return re.sub(
        r'([?!.]["\'\)\]]*)\s{1,3}(?=(?:Q|A)\.[ \t])',
        r'\1\n\n',
        text,
    )


def load_custom_formatter_rules() -> list[dict]:
    """Load user-trained regex formatter rules from disk."""
    if not CUSTOM_FORMATTER_RULES_PATH.exists():
        CUSTOM_FORMATTER_RULES_PATH.write_text("[]", encoding="utf-8")
        return []
    try:
        raw = CUSTOM_FORMATTER_RULES_PATH.read_text(encoding="utf-8").strip() or "[]"
        data = json.loads(raw)
    except Exception:
        return []
    return [rule for rule in data if isinstance(rule, dict)]


def apply_custom_formatter_rules(text: str) -> str:
    """Apply user-trained regex substitution rules after the built-in formatter pass."""
    formatted = text
    flag_map = {"IGNORECASE": re.IGNORECASE, "MULTILINE": re.MULTILINE, "DOTALL": re.DOTALL}
    for rule in load_custom_formatter_rules():
        pattern = str(rule.get("pattern", "")).strip()
        replacement = str(rule.get("replacement", ""))
        if not pattern:
            continue
        flags = 0
        for name in rule.get("flags", []):
            flags |= flag_map.get(str(name), 0)
        try:
            formatted = re.sub(pattern, replacement, formatted, flags=flags)
        except re.error:
            continue
    return formatted


# ── Q/A formatting ────────────────────────────────────────────────────────────

def detect_existing_label(segment: str) -> tuple[str, str] | None:
    """Detect Q. or A. label at start of segment. Returns (label, content) or None."""
    m = re.match(r"^\s*([QqAa])[\.\:\-]\s*(.+?)\s*$", segment, re.DOTALL)
    if not m:
        return None
    label = "Q." if m.group(1).upper() == "Q" else "A."
    return label, m.group(2)


def detect_speaker_label(segment: str) -> tuple[str, str] | None:
    """
    Detect speaker labels beyond Q. and A.:
      THE REPORTER:, THE INTERPRETER:, MR. SMITH:, MS. JONES:, etc.
    Returns (label, content) or None.
    """
    m = re.match(
        r"^\s*((?:THE\s+\w+|MR\.|MS\.|MRS\.|DR\.)\s*[\w\s]*?):\s*(.+?)$",
        segment.strip(),
        re.DOTALL,
    )
    if not m:
        return None
    return m.group(1).strip().upper(), m.group(2).strip()


_Q_ROLES = {"EXAMINING ATTORNEY", "OTHER COUNSEL"}
_A_ROLES = {"THE WITNESS"}


def convert_speaker_labels_to_qa(text: str) -> str:
    """
    Convert ROLE: text lines into Q./A. lines for the formatter.
    Reporter/videographer/interpreter/counsel lines stay labeled.
    """
    lines = text.split("\n")
    converted: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            converted.append(line)
            continue
        if re.match(r"^[QqAa][\.\:\-]\s", stripped):
            converted.append(stripped)
            continue
        m = re.match(r"^([A-Z][A-Z\s\.]+?):\s*(.+)$", stripped, re.DOTALL)
        if not m:
            converted.append(line)
            continue
        role = m.group(1).strip().upper()
        content = m.group(2).strip()
        if role in _Q_ROLES:
            converted.append(f"Q. {content}")
        elif role in _A_ROLES:
            converted.append(f"A. {content}")
        else:
            converted.append(stripped)
    return "\n".join(converted)


def _format_qa_block(label: str, content: str) -> str:
    wrapped = textwrap.wrap(
        clean_text(content),
        width=QA_WIDTH,
        break_long_words=False,
        break_on_hyphens=False,
    )
    if not wrapped:
        return f"{label}\t"
    lines = [f"{label}\t{wrapped[0]}"]
    lines.extend(f"\t{line}" for line in wrapped[1:])
    return "\n".join(lines)


def _wrap_visual_only(text: str, width: int) -> list[str]:
    stripped = (text or "").strip()
    if not stripped:
        return [""]
    return textwrap.wrap(
        stripped,
        width=width,
        break_long_words=False,
        break_on_hyphens=False,
    ) or [stripped]


def _format_speaker_visual(text: str, speaker_name: str) -> str:
    prefix = f"{speaker_name}: " if speaker_name and not text.startswith(f"{speaker_name}:") else ""
    full = f"{prefix}{text}".strip()
    if ":" not in full:
        return wrap_text(full, width=WRAP_WIDTH, initial_indent="", subsequent_indent="")
    label, content = full.split(":", 1)
    label = label.strip() + ":"
    content = content.strip()
    subsequent = " " * (len(label) + 2)
    return wrap_text(
        content,
        width=max(10, WRAP_WIDTH - len(label) - 2),
        initial_indent=f"{label}  ",
        subsequent_indent=subsequent,
    )


def format_blocks(blocks: Iterable[object]) -> str:
    """
    VISUAL RENDERER — DO NOT ADD CORRECTION LOGIC HERE.

    This function renders structured Block objects into displayable text.
    It is intentionally correction-free.

    Allowed here:
    - wrapping
    - Q./A. tab prefixes
    - speaker-label alignment
    - paragraph spacing between blocks

    Not allowed here:
    - modifying Block.text
    - classifying blocks
    - applying transcript corrections
    - remapping speakers or labels
    """
    try:
        from spec_engine.models import BlockType
    except Exception:
        BlockType = None  # type: ignore

    rendered: list[str] = []
    for block in blocks:
        text = (getattr(block, "text", "") or "").strip()
        if not text:
            continue
        block_type = getattr(block, "block_type", None)
        speaker_name = (getattr(block, "speaker_name", "") or "").strip()

        if BlockType is not None and block_type == BlockType.QUESTION:
            lines = _wrap_visual_only(text, QA_WIDTH)
            rendered.append("\n".join([f"Q.\t{lines[0]}"] + [f"\t{line}" for line in lines[1:]]))
        elif BlockType is not None and block_type == BlockType.ANSWER:
            lines = _wrap_visual_only(text, QA_WIDTH)
            rendered.append("\n".join([f"A.\t{lines[0]}"] + [f"\t{line}" for line in lines[1:]]))
        elif BlockType is not None and block_type in (BlockType.SPEAKER, BlockType.COLLOQUY):
            rendered.append(_format_speaker_visual(text, speaker_name))
        else:
            rendered.append(wrap_text(text, width=WRAP_WIDTH, initial_indent="", subsequent_indent=""))

    return "\n\n".join(section for section in rendered if section.strip())


def apply_qa_format(text: str) -> str:
    """
    Format transcript with Q./A. labels.
    Continuation lines return to left margin (CONTINUATION_INDENT = "").
    """
    normalized = clean_text(text)
    if not normalized:
        return ""

    lines = [line.strip() for line in normalized.split("\n") if line.strip()]
    if not any(detect_existing_label(line) or detect_speaker_label(line) for line in lines):
        return wrap_text(normalized)

    formatted_sections: list[str] = []

    for segment in lines:
        detected = detect_existing_label(segment)
        if detected:
            label, content = detected
            wrapped = _format_qa_block(label, content)
            formatted_sections.append(wrapped)
            continue

        speaker_detected = detect_speaker_label(segment)
        if speaker_detected:
            label, content = speaker_detected
            wrapped = wrap_text(content, initial_indent=f"{label}: ", subsequent_indent=CONTINUATION_INDENT)
            formatted_sections.append(wrapped)
        else:
            formatted_sections.append(wrap_text(segment))

    return "\n\n".join(s for s in formatted_sections if s.strip())


def wrap_text(
    text: str,
    width: int = WRAP_WIDTH,
    initial_indent: str = "",
    subsequent_indent: str = CONTINUATION_INDENT,
) -> str:
    stripped = clean_text(text)
    if not stripped:
        return ""

    wrapped_lines: list[str] = []
    for paragraph in stripped.split("\n"):
        if not paragraph.strip():
            continue
        wrapped_lines.append(
            textwrap.fill(
                paragraph.strip(),
                width=width,
                initial_indent=initial_indent,
                subsequent_indent=subsequent_indent,
                break_long_words=False,
                break_on_hyphens=False,
            )
        )

    return "\n".join(wrapped_lines)


# ── Main entry point ──────────────────────────────────────────────────────────

def format_transcript(
    text: str,
    use_qa_format: bool = True,
    clean_verbatim: bool = False,
    skip_corrections_already_applied: bool = False,
) -> str:
    """
    Format a legal transcript through the deterministic rules engine.

    Args:
        text:           Raw transcript text from Deepgram or a loaded file.
        use_qa_format:  Apply Q./A. label formatting. Default True.
        clean_verbatim: If True, also apply optional passes that alter spoken
                        form - percent/money normalization and sentence-boundary
                        paragraph splitting. These are OFF by default because a
                        verbatim legal record must preserve what was actually
                        said. Enable only for 'Clean Verbatim' export mode.
                        All existing callers omit this argument and remain
                        unaffected.
        skip_corrections_already_applied: If True, skip the normalizations that
                        corrections.py already applies in the block pipeline
                        (highway refs, duplicate words, doctor artifact, time format,
                        uh-huh hyphenation). Prevents double-processing when
                        format_transcript() is called after apply_corrections().
                        Default False — existing callers are unaffected.
    """
    formatted = convert_speaker_labels_to_qa(text)
    formatted = clean_text(formatted)
    formatted = normalize_dashes(formatted)
    formatted = normalize_spaced_dashes(formatted)
    formatted = normalize_universal_corrections(formatted)
    if not skip_corrections_already_applied:
        formatted = normalize_highway_references(formatted)
        formatted = normalize_uh_huh_hyphenation(formatted)
        formatted = normalize_duplicate_words(formatted)
        formatted = normalize_doctor_artifact(formatted)
        formatted = normalize_time_format(formatted)
    formatted = normalize_reporter_label(formatted)
    formatted = normalize_as_read_parenthetical(formatted)
    formatted = normalize_section_headers(formatted)
    if clean_verbatim:
        formatted = normalize_percent_and_money(formatted)
    formatted = normalize_okay_all_right_transition(formatted)
    formatted = normalize_mid_sentence_okay(formatted)
    formatted = normalize_sentence_spacing(formatted)
    if clean_verbatim:
        formatted = split_at_sentence_boundaries(formatted)
    formatted = split_inline_qa_transitions(formatted)

    if use_qa_format:
        formatted = apply_qa_format(formatted)
    else:
        formatted = wrap_text(formatted)

    formatted = clean_text(formatted)
    formatted = apply_custom_formatter_rules(formatted)
    return clean_text(formatted)
