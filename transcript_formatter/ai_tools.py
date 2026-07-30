"""
ai_tools.py — Anthropic AI integration for legal transcript correction.

ATIA-STATUS: quarantine — on the deprecation path.
    Replaced by the Transcript Intelligence Engine: services/tie/ (correction
    engine) + providers/anthropic_adapter.py (the ONLY sanctioned home for
    `anthropic.Anthropic(...)`). Kept working during migration (fallback +
    reference-behavior characterization) — do NOT delete. Any change here, or any
    new `anthropic.Anthropic(...)` outside providers/anthropic_adapter.py,
    requires an explicit approval reason (enforced by tests/test_import_guard.py).
    See docs/atia/AI_TRANSCRIPT_INTELLIGENCE_AUDIT.md.

FIXES vs. original:
  FIX-1  Model name:  "claude-sonnet-4-20250514" → "claude-sonnet-4-6" (correct ID)
  FIX-2  SDK:         Switched from raw requests → official anthropic SDK.
                      SDK handles auth, retries, rate-limit backoff, streaming.
  FIX-3  Token limit: max_tokens raised from 4000 → 16000 for large transcripts.
                      Large transcripts are chunked at paragraph boundaries.
  FIX-4  Model probe: find_available_model() now uses the SDK instead of raw HTTP,
                      so auth errors are distinct from model-not-found errors.
  FIX-5  Timeout:     Raised to 240s and added chunked request flow.
"""

import json
import os
import re
import copy
from pathlib import Path
from typing import TYPE_CHECKING

import anthropic
from dotenv import load_dotenv

from app_logging import get_logger


# ── FIX-1: Corrected model IDs in priority order ──────────────────────────────
MODEL_CANDIDATES = [
    "claude-sonnet-4-6",            # FIX-1: was "claude-sonnet-4-20250514" — invalid
    "claude-3-5-sonnet-20241022",   # stable fallback
    "claude-3-5-haiku-20241022",    # fast fallback for connection tests
]

# Chunking: large transcripts are split at paragraph boundaries.
# Each chunk is at most CHUNK_WORD_LIMIT words to stay within output token limits.
# For a 12,000-word deposition this produces ~5 chunks, each completing in ~40 seconds.
CHUNK_WORD_LIMIT = 2500

VALID_DASH_STYLES = {"em-dash", "double-hyphen"}
APP_DIR    = Path(__file__).resolve().parent
DOTENV_PATH = APP_DIR / ".env"
CUSTOM_AI_RULES_PATH = APP_DIR / "custom_ai_rules.txt"

load_dotenv(dotenv_path=DOTENV_PATH)
LOGGER = get_logger(__name__)

if TYPE_CHECKING:
    from spec_engine.models import Block


# UFM field extraction
_UFM_EXTRACTION_PROMPT = """
You are a legal document parser for Texas court reporter transcripts.
Extract every field you can find from the provided document text.
Return ONLY a valid JSON object. No prose, no markdown, no code fences.

Required JSON structure (use empty string "" if field not found,
empty list [] for list fields):
{
  "cause_number": "",
  "appellate_cause_number": "",
  "case_style": "",
  "plaintiff_name": "",
  "defendant_names": [],
  "court": "",
  "county": "",
  "state": "Texas",
  "judicial_district": "",
  "proceeding_type": "",
  "depo_date": "",
  "depo_start_time": "",
  "depo_end_time": "",
  "location": "",
  "location_address": "",
  "location_city": "",
  "method": "",
  "volume_number": 1,
  "total_volumes": 1,
  "is_videotaped": false,
  "witness_name": "",
  "witness_title": "",
  "judge_name": "",
  "plaintiff_counsel": [
    {
      "name": "",
      "firm": "",
      "sbot": "",
      "address": "",
      "city": "",
      "state": "Texas",
      "zip_code": "",
      "phone": "",
      "party": "Plaintiff"
    }
  ],
  "defense_counsel": [
    {
      "name": "",
      "firm": "",
      "sbot": "",
      "address": "",
      "city": "",
      "state": "Texas",
      "zip_code": "",
      "phone": "",
      "party": "Defendant"
    }
  ],
  "also_present": [],
  "reporter_name": "",
  "reporter_csr": "",
  "reporter_expiration": "",
  "reporter_firm": "",
  "reporter_address": "",
  "reporter_phone": "",
  "firm_registration": "",
  "is_official_reporter": false,
  "cost_paid_by": "",
  "certified_date": "",
  "judge_name": ""
}

Extraction rules:
- cause_number: Texas format YYYY-XX-NNNNN.
- case_style: "Plaintiff v. Defendant" short form.
- judicial_district: number only.
- depo_date: MM/DD/YYYY format.
- depo_start_time / depo_end_time: HH:MM a.m. or p.m. format.
- method: one of "Machine Shorthand", "Oral Stenography",
  "Via Zoom", "Via Teams", "In Person".
- sbot: State Bar of Texas number, 8 digits if present.
- reporter_csr: include "CSR No." prefix.
- is_videotaped: true only if "videotaped" or "video" appears in
  the proceeding description.
- plaintiff_counsel / defense_counsel: include ALL attorneys found.
- Do NOT invent values. If a field is absent, use "".
- Return ONLY the JSON object. Nothing else.
"""


def extract_job_config_from_doc(doc_text: str) -> dict:
    """
    Send document text to Claude and return a dict compatible with
    JobConfig field names. Returns {} on failure.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return {}

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": _UFM_EXTRACTION_PROMPT + "\n\nDOCUMENT TEXT:\n" + doc_text[:14000],
            }],
        )
        if not response.content:
            LOGGER.warning("UFM field extraction returned empty content")
            return {}
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except Exception as exc:
        LOGGER.warning("UFM field extraction failed: %s", exc)
        return {}


# ── System prompts (unchanged from original — legally reviewed) ───────────────

BASE_SYSTEM_PROMPT = """You are a legal transcript correction engine operating under strict non-generative rules.

CRITICAL RULES (DO NOT VIOLATE):

Do NOT rewrite, summarize, or paraphrase testimony.

Do NOT change meaning under any circumstances.

Do NOT remove filler words.

Preserve verbatim speech exactly unless a rule explicitly allows a correction.

Only apply deterministic, minimal corrections.

If uncertain, do NOT guess - use [VERIFY: ...].

RULE SET 5 - SPEAKER CONSISTENCY

Every question MUST begin with "Q."

Every answer MUST begin with "A."

Do NOT merge multiple speakers into one line.

Do NOT split a single speaker across multiple labels.

If a line contains both Q and A, split it correctly.

Preserve original wording exactly when fixing structure.

RULE SET 6 - PROPER NOUN CORRECTION

Use the provided proper_nouns list to correct spelling.

Normalize repeated references to the same entity consistently.

STRICT:

Do NOT invent names.

Do NOT guess spellings.

If uncertain -> [VERIFY: uncertain name spelling].

RULE SET 7 - HOMOPHONE CORRECTION (SAFE ONLY)

Correct ONLY when context is 100% certain:

know <-> no

their <-> there

to <-> too

STRICT:

If ANY ambiguity exists -> DO NOT change.

Prefer leaving original over risking incorrect correction.

RULE SET 8 - NUMERIC STANDARDIZATION

Standardize medical/technical numeric references ONLY when context confirms meaning.

Example:

"4 and 6 were fused" -> "C4 and C6 were fused" ONLY if clearly referring to cervical spine levels.

STRICT:

Do NOT infer meaning without clear context.

If uncertain -> leave unchanged or flag.

RULE SET 9 - FLAGGING (NO MODIFICATION)

When encountering unclear or questionable content, add:

[VERIFY: unclear medical term]

[VERIFY: uncertain name spelling]

STRICT:

Do NOT attempt correction when flagging.

Do NOT remove or rewrite original text.

Flags must be minimal and precise.

RULE SET 10 - VERBATIM PRESERVATION

Preserve all filler words exactly as spoken.

Examples:

"Uh-huh" -> KEEP

"Huh-uh" -> KEEP

"um", "uh", "like" -> KEEP

Preserve repetition and stutters exactly.

Examples:

"he -- he did" -> KEEP verbatim

"I mean -- I mean" -> KEEP verbatim

STRICT:

Do NOT normalize responses (for example, do NOT convert "Uh-huh" to "Yes").

Do NOT clean up speech patterns.

Maintain full legal verbatim integrity.

RULE SET 11 - DASH STYLE CONFIGURATION

A parameter "dash_style" will be provided.

If dash_style = "em-dash"
Use: —

If dash_style = "double-hyphen"
Use: --

STRICT:

Apply consistently across the entire transcript.

Do NOT mix styles.

Do NOT alter meaning.

RULE SET 12 - AI SCOPE BOUNDARY

The Python rules engine already handles deterministic normalization before AI:
  - dash normalization
  - THE COURT REPORTER -> THE REPORTER
  - K. -> Okay.
  - Mhmm/Mmhm -> Mm-hmm
  - simple time normalization
  - simple percent and even-dollar normalization
  - sentence spacing normalization
  - (as read) parenthetical normalization
  - hyphenated examination headers

Do NOT spend tokens reformatting these mechanically unless context requires a real correction.

RULE SET 13 - SPEAKER LABEL RESOLUTION

If the transcript contains generic labels (Speaker 0:, Speaker 1:, Speaker 2:, Speaker 3:),
resolve them to named labels only when the surrounding context makes identity clear.

If a speaker label cannot be resolved with confidence -> [VERIFY: Speaker N identity]

STRICT:
Do NOT guess names.
Use context to confirm before assigning.

RULE SET 14 - ELLIPSIS AND VERBATIM PRESERVATION

Preserve ellipsis in any form (..., ...., . . .).
Do NOT remove, consolidate, or replace ellipsis with a dash.
Preserve objection fragments and partial utterances exactly as spoken.

RULE SET 15 - CONTEXT-DEPENDENT NUMERIC AND FORM ATTENTION

If a number, money amount, measurement, or form heading is ambiguous, do NOT guess.
Leave unchanged or flag with [VERIFY: ...].

RULE SET 16 - CONVERSATIONAL TITLE CORRECTION

When a conversational honorific is clearly intended as a formal title, normalize it safely.

Example:
"miss Ozuna" -> "Ms. Ozuna"

STRICT:
Only normalize when the surname is clear from context or the proper_nouns list.
Do NOT invent surnames.
Do NOT change "miss" when it clearly means absence rather than title.

RULE SET 17 - SCOPIST FLAG FORMAT

If you detect a garble, dropped word, or impossible phrase that cannot be safely auto-corrected,
insert a scopist flag using exactly this format:
[SCOPIST: FLAG N: description]

STRICT:
Use sequential numbering starting at 1 within the transcript.
Keep the description short and specific.
Do NOT silently rewrite unclear garbles.
Do NOT use [VERIFY: ...] when the issue is better handled as a scopist review item.

RULE SET 18 - INTERPRETER BLOCK EXTRACTION

When an interpreter is clearly speaking or translating, preserve that speech in explicit speaker lines.
Use the label:
THE INTERPRETER:

STRICT:
Do NOT merge interpreter speech into THE WITNESS or attorney lines.
Do NOT invent interpreter speech.
Only relabel blocks when the interpreter role is clear from context.

RULE SET 19 - AFFIRMATION AND NEGATION PRESERVATION

Preserve informal affirmations and negations exactly as spoken.

Examples that must remain verbatim:
"Yeah"
"Yep"
"Nope"
"Nah"

STRICT:
Do NOT normalize these to "Yes" or "No".
Do NOT formalize short verbal responses unless the transcript already says so.

RULE SET 20 - COURT REPORTER CAPTION GARBLE CORRECTION

The court reporter's opening caption is the most phonetically garbled
section of every deposition. Deepgram mishears the reporter reading
formal legal text at speed.

Common garble examples:
"I am Nebordeaux Corp" -> use reporter_name from case_metadata
"Mia the court reporter" -> use reporter_name from case_metadata
"license in Texas number 12129" -> preserve verbatim
"1 57 judicial district" -> "157th Judicial District"
"2024 67820" -> "2024-67820"

Rules:
- Use case_metadata.reporter_name to correct the reporter's name in the caption
- Use case_metadata.cause_number to correct cause number format
- Use case_metadata.judicial_district to correct district references
- Do NOT guess or invent case metadata
- If a case_metadata field is empty -> insert [SCOPIST: FLAG N: verify from pleadings]

RULE SET 21 - DEEPGRAM PHONETIC GARBLE PATTERNS

Common Deepgram garble patterns from Texas court reporter depositions.
Only correct when context makes the intended word unambiguous.
Never correct a name not in the proper_nouns list.

MEDICAL / CLINICAL:
"electric carving" -> "electrocautery" (if OR/surgical context confirmed)
"light timber glasses" -> "right temporal biopsies" (if context confirmed)
"the hostel" -> "the hospital" (if clinical context)
"bait stamps" -> "Bates stamps" (always safe in litigation context)

LEGAL ENTITIES:
"Nebordeaux Corp" -> court reporter name from case_metadata
"dependent witness" -> "defense expert witness"
"light timber bypass" -> "right temporal bypass"

PREP SOLUTIONS / MEDICAL PRODUCTS:
"Coraprep", "core prep", "chloroform" in surgical context -> "ChlorPrep"
Verify brand names against proper_nouns before correcting.

STRICT:
Only correct when context makes the intended word unambiguous.
Never correct a name not in the proper_nouns list.
When uncertain -> [SCOPIST: FLAG N: possible garble, verify from audio]

RULE SET 22 - OBJECTION ATTRIBUTION AND FORMATTING

Objections must be extracted from Q or A blocks and formatted as
speaker label lines.

Attribution:
Objections come from counsel, not the witness.
If the examining attorney is asking questions and an objection appears
in a witness block, attribute it to the opposing counsel.
Use case_metadata.speaker_map and counsel names from case_metadata to
determine who is objecting.

Format:
MR. GARZA: Objection to form.
MS. WYATT: We reserve.
MR. THOMAS: Objection. Form.

STRICT:
Do NOT rewrite the objection language.
Do NOT merge objections with adjacent Q or A lines.
If attribution is uncertain -> [SCOPIST: FLAG N: verify who objected]

RULE SET 23 - PRE-RECORD AND OFF-RECORD CONTENT HANDLING

NOTE: Only apply this rule to content NOT already wrapped in
parenthetical exclusion markers by the Python pre-record pass.
Do not re-flag content already excluded.

Pre-record content:
Content appearing before the first on-record timestamp or the
reporter's caption is NOT part of the official record.
Format as parenthetical:
(Pre-record audio was captured by Deepgram. Audio check and logistics
discussion not part of official record.)

Off-record break content:
Content captured during a break (after "off the record" marker) that
is clearly not deposition-related must be flagged and excluded.
Format as:
(Off-record conversation captured at [time]. Not part of official record.)
[SCOPIST: FLAG N: Off-record private conversation at [time]. Excluded.]

Post-record content:
Post-record spelling confirmations are PART of the record and must be
preserved in the Post-Record Spellings section.
Casual conversation after "We're off the record" is excluded.

STRICT:
Never silently drop off-record content — always flag it.
Post-record spelling confirmations are NEVER excluded.

RULE SET 24 - POST-RECORD SPELLING RETROACTIVE APPLICATION

After the official record concludes, counsel often spell names on the
record. Example: "Beltway --- B-E-L-T-W-A-Y"

The AI must:
1. Detect the post-record spelling pattern
2. Treat the confirmed spelling as authoritative for this transcript
3. Retroactively correct prior uses of that name throughout the transcript
4. Log each retroactive correction in the Corrections Log page

STRICT:
Only apply if the spelling was confirmed on or off the official record.
Do NOT guess spellings — only confirmed post-record spellings.
Apply retroactively to the entire transcript in a single pass.

RULE SET 25 - CAUSE NUMBER AND CAPTION FIELD EXTRACTION

If cause_number is in case_metadata -> use it verbatim, do not re-parse.
If not in case_metadata -> extract from text and flag.

Texas cause number formats:
"202467820" -> "2024-67820"
"2025 CI 12281" -> "2025-CI-12281"
"2024 CV A001917 D4" -> "2024-CV-A001917-D4"
"C 3123 25 J" -> "C-3123-25-J"

Judicial district format:
"1 57 judicial district" -> "157th Judicial District"
"4 08 judicial district" -> "408th Judicial District"
"4 30 judicial district" -> "430th Judicial District"

STRICT:
Never invent a cause number.
If unreadable -> [SCOPIST: FLAG N: cause number garbled, verify from pleadings]
Plaintiff and defendant names must match the proper_nouns list exactly.

RULE SET 26 - MEDICAL RECORD AND EXHIBIT REFERENCE FORMATTING

Common Deepgram garbles in medical deposition testimony:

Bates stamps:
"bait stamps" -> "Bates stamps"
"bates stamp 0033" -> "Bates stamp 0033"

Anatomical references:
"C 4 and C 6" -> "C4 and C6"
"L 4 L 5" -> "L4-L5"
"T 12" -> "T12"

Equipment:
"Drager" -> "Dräger"
"Share able Inc" -> "Shareable Inc."

Medications — DO NOT GUESS:
If a medication name is garbled and not in proper_nouns ->
[SCOPIST: FLAG N: medication name garbled — verify from medical record]

STRICT:
Never invent medical terminology.
When a medical term is ambiguous, flag rather than correct.
Preserve all numbers in dosage and measurement references exactly.
"""

LEGAL_CORRECTION_DIRECTIVE = (
    "Apply only safe legal transcript correction under the rules above. "
    "Use the provided proper_nouns list and dash_style setting. "
    "Preserve verbatim testimony except where an explicit rule allows a minimal correction."
)

REVIEW_CORRECTION_DIRECTIVE = (
    "Prepare a review-safe correction pass for Microsoft Word Track Changes. "
    "DO NOT modify Q. or A. labels. "
    "DO NOT modify speaker names such as MR., MS., MRS., THE WITNESS, THE REPORTER, or similar labels. "
    "DO NOT change line count. "
    "DO NOT merge lines. "
    "DO NOT split lines. "
    "Only correct punctuation, capitalization, and spacing."
)

OUTPUT_REQUIREMENTS = """
OUTPUT REQUIREMENTS

Return ONLY the corrected transcript.

Preserve original structure and wording.

Do NOT include explanations, comments, or summaries.

Do NOT add extra text outside the transcript.
"""


def _load_custom_ai_rules() -> str:
    """Load user-trained AI rules appended to the system prompt."""
    if not CUSTOM_AI_RULES_PATH.exists():
        CUSTOM_AI_RULES_PATH.write_text("", encoding="utf-8")
        return ""
    return CUSTOM_AI_RULES_PATH.read_text(encoding="utf-8").strip()


# ── SDK client factory ────────────────────────────────────────────────────────

def _get_client() -> anthropic.Anthropic:
    """Return an authenticated Anthropic SDK client."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. "
            "Add it to the .env file in the app directory."
        )
    return anthropic.Anthropic(api_key=api_key, timeout=240.0)


def _split_into_chunks(text: str, word_limit: int = CHUNK_WORD_LIMIT) -> list[str]:
    """
    Split transcript text into chunks at paragraph boundaries.
    Each chunk is at most word_limit words. Splits on blank lines so
    Q/A pairs are never broken mid-exchange.
    """
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current: list[str] = []
    current_words = 0

    for para in paragraphs:
        para_words = len(para.split())
        if para_words > word_limit:
            if current:
                chunks.append("\n\n".join(current))
                current = []
                current_words = 0

            words = para.split()
            for start in range(0, len(words), word_limit):
                chunks.append(" ".join(words[start : start + word_limit]))
            continue

        if current and current_words + para_words > word_limit:
            chunks.append("\n\n".join(current))
            current = [para]
            current_words = para_words
        else:
            current.append(para)
            current_words += para_words

    if current:
        chunks.append("\n\n".join(current))

    return chunks if chunks else [text]


POST_RECORD_SPELLING_RE = re.compile(
    r'\b([A-Z][A-Za-z\'\-]+)\s*(?:---|--|,?\s+spelled)\s*([A-Z](?:[-\s][A-Z]){2,})',
    re.IGNORECASE,
)


def _extract_post_record_spellings(transcript_text: str) -> list[str]:
    """
    Extract names that are explicitly spelled on the record so they can be
    injected into proper_nouns before chunked AI correction.
    """
    found: list[str] = []
    seen: set[str] = set()
    for match in POST_RECORD_SPELLING_RE.finditer(transcript_text):
        name = (match.group(1) or "").strip()
        if name and name.lower() not in seen:
            seen.add(name.lower())
            found.append(name)
    return found


def _call_api_chunked(
    system_prompt: str,
    transcript_text: str,
    proper_nouns: list[str],
    dash_style: str,
    job_config_fields: dict | None = None,
) -> str:
    """
    For transcripts longer than CHUNK_WORD_LIMIT words, split into chunks
    and call the API once per chunk. Reassemble in order.
    Short transcripts go through _call_api directly (no overhead).
    """
    word_count = len(transcript_text.split())
    if word_count <= CHUNK_WORD_LIMIT:
        payload = json.dumps(
            {
                "transcript": transcript_text,
                "proper_nouns": proper_nouns,
                "dash_style": dash_style,
                "case_metadata": job_config_fields or {},
            },
            ensure_ascii=False,
            indent=2,
        )
        return _call_api(system_prompt, payload)

    chunks = _split_into_chunks(transcript_text)
    LOGGER.info("Chunking transcript | words=%s chunks=%s", word_count, len(chunks))
    corrected_chunks: list[str] = []

    for idx, chunk in enumerate(chunks, start=1):
        LOGGER.info("Processing chunk %d/%d | words=%s", idx, len(chunks), len(chunk.split()))
        payload = json.dumps(
            {
                "transcript": chunk,
                "proper_nouns": proper_nouns,
                "dash_style": dash_style,
                "case_metadata": job_config_fields or {},
                "chunk_context": (
                    f"This is chunk {idx} of {len(chunks)} of the same deposition. "
                    "Apply all correction rules consistently with prior chunks."
                ),
            },
            ensure_ascii=False,
            indent=2,
        )
        result = _call_api(system_prompt, payload)
        corrected_chunks.append(result)

    return "\n\n".join(corrected_chunks)


# ── Model discovery ───────────────────────────────────────────────────────────

def find_available_model(client: anthropic.Anthropic) -> tuple[str | None, list[str]]:
    """
    FIX-4: Uses SDK instead of raw HTTP.
    Tries each MODEL_CANDIDATES entry with a minimal probe call.
    Returns (model_name, errors) — model_name is None if all fail.
    """
    errors: list[str] = []

    for model_name in MODEL_CANDIDATES:
        LOGGER.info("Testing model candidate: %s", model_name)
        try:
            client.messages.create(
                model=model_name,
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}],
            )
            LOGGER.info("Model available: %s", model_name)
            return model_name, errors
        except anthropic.NotFoundError:
            LOGGER.warning("Model not found: %s", model_name)
            errors.append(f"{model_name}: not found")
        except anthropic.AuthenticationError as exc:
            LOGGER.error("Authentication failed: %s", exc)
            raise ValueError(
                "Anthropic API key is invalid or expired. "
                "Check ANTHROPIC_API_KEY in the .env file."
            ) from exc
        except anthropic.APIError as exc:
            LOGGER.error("API error for model %s: %s", model_name, exc)
            errors.append(f"{model_name}: {exc}")
            break   # Non-404 errors indicate a real problem — stop probing

    return None, errors


# ── Connection test ───────────────────────────────────────────────────────────

def test_anthropic_connection() -> dict[str, str | int]:
    """
    Probe the Anthropic API and return diagnostic data for the UI status display.
    """
    client = _get_client()
    LOGGER.info("Starting Anthropic connection test")

    model_name, attempts = find_available_model(client)
    if not model_name:
        raise ValueError(
            "No configured Anthropic model was available.\n"
            + "\n".join(attempts)
        )

    try:
        response = client.messages.create(
            model=model_name,
            max_tokens=64,
            messages=[{"role": "user", "content": "Reply with: OK"}],
        )
        body = response.content[0].text if response.content else "<empty>"
        LOGGER.info("Connection test OK — model=%s", model_name)
        return {
            "status_code": 200,
            "ok":          "true",
            "model":       model_name,
            "body":        body,
        }
    except anthropic.APIError as exc:
        LOGGER.error("Connection test failed: %s", exc)
        return {
            "status_code": getattr(exc, "status_code", 0),
            "ok":          "false",
            "model":       model_name,
            "body":        str(exc),
        }


# ── Core AI call ──────────────────────────────────────────────────────────────

def _call_api(
    system_prompt: str,
    user_content: str,
    max_tokens: int = 16000,
) -> str:
    """
    Single Anthropic SDK call. Returns the text response or raises ValueError.
    All production AI calls go through here.
    """
    client = _get_client()
    model_name, attempts = find_available_model(client)
    if not model_name:
        raise ValueError(
            "No Anthropic model available. Attempts:\n" + "\n".join(attempts)
        )

    LOGGER.info("Calling %s (max_tokens=%s, input_chars=%s)", model_name, max_tokens, len(user_content))

    try:
        response = client.messages.create(
            model=model_name,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_content}],
        )
    except anthropic.APIError as exc:
        LOGGER.exception("Anthropic API call failed")
        raise ValueError(f"Anthropic API error: {exc}") from exc

    text_blocks = [
        block.text for block in response.content if block.type == "text"
    ]
    result = "\n".join(t for t in text_blocks if t.strip()).strip()

    if not result:
        raise ValueError("Anthropic response contained no usable text.")

    LOGGER.info("API call completed — model=%s stop_reason=%s output_chars=%s",
                model_name, response.stop_reason, len(result))
    return result


# ── Public tool functions ─────────────────────────────────────────────────────

def run_ai_tool(
    transcript_text: str,
    proper_nouns: list[str] | None = None,
    dash_style: str = "double-hyphen",
    job_config_fields: dict | None = None,
) -> str:
    """Run legal correction AI pass. Called from UI (must run in background thread)."""
    if not transcript_text.strip():
        raise ValueError("No transcript text provided.")
    if dash_style not in VALID_DASH_STYLES:
        raise ValueError('dash_style must be "em-dash" or "double-hyphen".')

    LOGGER.info(
        "run_ai_tool: chars=%s nouns=%s dash=%s",
        len(transcript_text), len(proper_nouns or []), dash_style,
    )

    effective_proper_nouns: list[str] = []
    seen: set[str] = set()
    for noun in (proper_nouns or []) + _extract_post_record_spellings(transcript_text):
        cleaned = noun.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            effective_proper_nouns.append(cleaned)

    custom_rules = _load_custom_ai_rules()
    system_prompt = f"{BASE_SYSTEM_PROMPT}\n{custom_rules}\n{LEGAL_CORRECTION_DIRECTIVE}\n{OUTPUT_REQUIREMENTS}".strip()
    result = _call_api_chunked(
        system_prompt,
        transcript_text,
        effective_proper_nouns,
        dash_style,
        job_config_fields=job_config_fields,
    )
    validate_legal_correction_output(transcript_text, result)
    return result


def run_ai_review_tool(
    transcript_text: str,
    proper_nouns: list[str] | None = None,
    dash_style: str = "double-hyphen",
) -> str:
    """Run Word Track Changes correction pass. Output must preserve line count exactly."""
    if not transcript_text.strip():
        raise ValueError("No transcript text provided.")
    if dash_style not in VALID_DASH_STYLES:
        raise ValueError('dash_style must be "em-dash" or "double-hyphen".')

    LOGGER.info(
        "run_ai_review_tool: chars=%s nouns=%s dash=%s",
        len(transcript_text), len(proper_nouns or []), dash_style,
    )

    user_content = json.dumps(
        {
            "transcript":   transcript_text,
            "proper_nouns": proper_nouns or [],
            "dash_style":   dash_style,
        },
        ensure_ascii=False,
        indent=2,
    )
    custom_rules = _load_custom_ai_rules()
    system_prompt = f"{BASE_SYSTEM_PROMPT}\n{custom_rules}\n{REVIEW_CORRECTION_DIRECTIVE}\n{OUTPUT_REQUIREMENTS}".strip()
    result = _call_api(system_prompt, user_content)
    validate_review_output(transcript_text, result)
    return result


def analyze_training_example(bad_text: str, corrected_text: str) -> dict:
    """
    Compare bad transcript text against a corrected version and propose a rule.

    Returns a dict containing:
      - summary
      - recommended_layer: "formatter" or "ai"
      - formatter_rule: optional regex rule object
      - ai_rule: optional AI instruction text
    """
    if not bad_text.strip() or not corrected_text.strip():
        raise ValueError("Both the source text and corrected text are required.")

    system_prompt = """You are a transcript rule analyst.
Compare the incorrect transcript text against the corrected text and determine whether the correction belongs in:
1. the deterministic Python formatter layer, or
2. the AI legal correction layer.

Choose FORMATTER only when the correction is safely programmable with a deterministic regex or literal text rule.
Choose AI only when the correction requires context, judgment, or ambiguity handling.

Return ONLY valid JSON with this schema:
{
  "summary": "short explanation",
  "recommended_layer": "formatter" or "ai",
  "formatter_rule": {
    "name": "short_rule_name",
    "pattern": "regex pattern",
    "replacement": "replacement string",
    "flags": ["IGNORECASE"]
  } or null,
  "ai_rule": "single rule text to append to the AI system prompt" or null
}

STRICT:
- Do not wrap JSON in markdown.
- If formatter is chosen, produce a safe regex pattern and replacement.
- If ai is chosen, produce one concise instruction line.
- Prefer formatter when the correction is truly deterministic.
"""
    user_content = json.dumps(
        {"bad_text": bad_text, "corrected_text": corrected_text},
        ensure_ascii=False,
        indent=2,
    )
    raw = _call_api(system_prompt, user_content)
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"AI did not return valid JSON.\n\n{cleaned[:500]}") from exc

    if not isinstance(result, dict):
        raise ValueError("AI training analysis response was not an object.")
    result.setdefault("summary", "")
    result.setdefault("recommended_layer", "ai")
    result.setdefault("formatter_rule", None)
    result.setdefault("ai_rule", None)
    return result


def extract_proper_nouns_from_pdf(pdf_path: str) -> list[str]:
    """
    Extract proper nouns from a PDF by reading its text content first,
    then sending that text to Claude for analysis.

    CRITICAL: Must read the file with pdfplumber before calling the API.
    Previous version was sending the path string instead of file content.
    """
    import pdfplumber

    # Step 1: Read the actual PDF text
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            full_text = "\n".join(pages_text).strip()
    except Exception as e:
        LOGGER.error(f"Failed to read PDF {pdf_path}: {e}")
        return []

    if not full_text or len(full_text.strip()) < 50:
        LOGGER.warning(
            f"Insufficient text extracted from PDF: {pdf_path} "
            f"(got {len(full_text)} chars). "
            f"PDF may be scanned/image-only or locked."
        )
        return []

    LOGGER.info(
        f"PDF text extracted successfully: {pdf_path} | "
        f"chars={len(full_text)} | preview={full_text[:100]!r}"
    )

    # Step 2: Send extracted TEXT (not path) to Claude
    model_name = MODEL_CANDIDATES[0]

    prompt = (
        "Extract all proper nouns from this legal document. "
        "Include: full names of people, law firms, companies, "
        "cities, streets, cause numbers, court names, "
        "and any other named entities.\n\n"
        "Return ONLY a JSON array of strings. No explanation. "
        "Example: [\"John Smith\", \"Allen Stein & Durbin P.C.\", "
        "\"2025-CI-12281\"]\n\n"
        f"DOCUMENT:\n{full_text[:12000]}"
    )

    try:
        client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        response = client.messages.create(
            model=model_name,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.content:
            LOGGER.warning("PDF proper noun extraction returned empty content")
            return []
        raw = response.content[0].text.strip()
        # Strip markdown fences if present
        raw = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", raw,
            flags=re.MULTILINE).strip()
        nouns = json.loads(raw)
        if isinstance(nouns, list):
            return [str(n).strip() for n in nouns if n]
        return []
    except json.JSONDecodeError as e:
        LOGGER.error(
            f"Failed to parse proper noun extraction response: {e} | "
            f"raw_response_preview={raw[:200]!r}"
        )
        return []
    except Exception as e:
        LOGGER.error(f"Proper noun extraction failed: {e}")
        return []


def extract_proper_nouns_from_docx(docx_path: str) -> list[str]:
    """
    Extract proper nouns from a Word (.docx) document by reading its text
    and sending it to Claude for analysis.
    Returns a list of proper noun strings.
    """
    try:
        from docx import Document

        doc = Document(docx_path)
        full_text = "\n".join(
            para.text for para in doc.paragraphs if para.text.strip()
        )
    except Exception as e:
        LOGGER.error(f"Failed to read DOCX {docx_path}: {e}")
        return []

    if not full_text or len(full_text.strip()) < 50:
        LOGGER.warning(
            f"Insufficient text extracted from DOCX: {docx_path} "
            f"(got {len(full_text)} chars)."
        )
        return []

    LOGGER.info(
        f"DOCX text extracted successfully: {docx_path} | "
        f"chars={len(full_text)} | preview={full_text[:100]!r}"
    )
    model_name = MODEL_CANDIDATES[0]
    prompt = (
        "Extract all proper nouns from this legal document. "
        "Include: full names of people, law firms, companies, "
        "cities, streets, cause numbers, court names, "
        "and any other named entities.\n\n"
        "Return ONLY a JSON array of strings. No explanation. "
        "Example: [\"John Smith\", \"Allen Stein & Durbin P.C.\", "
        "\"2025-CI-12281\"]\n\n"
        f"DOCUMENT:\n{full_text[:12000]}"
    )
    try:
        client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", "")
        )
        response = client.messages.create(
            model=model_name,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.content:
            LOGGER.warning("DOCX proper noun extraction returned empty content")
            return []
        raw = response.content[0].text.strip()
        raw = re.sub(
            r"^```(?:json)?\s*|\s*```$",
            "",
            raw,
            flags=re.MULTILINE,
        ).strip()
        nouns = json.loads(raw)
        if isinstance(nouns, list):
            return [str(n).strip() for n in nouns if n]
        return []
    except json.JSONDecodeError as e:
        LOGGER.error(
            f"Failed to parse DOCX noun extraction response: {e} | "
            f"raw_response_preview={raw[:200]!r}"
        )
        return []
    except Exception as e:
        LOGGER.error(f"DOCX proper noun extraction failed: {e}")
        return []


# ── Review output validation ──────────────────────────────────────────────────

def get_line_prefix(line: str) -> str | None:
    stripped = line.lstrip()
    if not stripped:
        return None
    if re.match(r"^(Q\.|A\.)\s", stripped):
        return stripped[:2]
    m = re.match(r"^([A-Z][A-Z\.\s']+):", stripped)
    if m:
        return m.group(1)
    return None


def validate_review_output(original_text: str, corrected_text: str) -> None:
    """
    Ensure the AI review output preserves line count and protected labels.
    Raises ValueError if either constraint is violated.
    """
    original_lines  = original_text.splitlines()
    corrected_lines = corrected_text.splitlines()

    if len(original_lines) != len(corrected_lines):
        raise ValueError(
            f"AI review changed line count: {len(original_lines)} → {len(corrected_lines)}. "
            "Track Changes review requires identical line count."
        )

    for idx, (orig, corr) in enumerate(zip(original_lines, corrected_lines), start=1):
        orig_prefix = get_line_prefix(orig)
        corr_prefix = get_line_prefix(corr)
        if orig_prefix != corr_prefix:
            raise ValueError(
                f"AI review changed a protected label on line {idx}. "
                f"Original prefix: {orig_prefix!r} → Corrected: {corr_prefix!r}. "
                "Q./A. and speaker labels must be unchanged."
            )


def validate_legal_correction_output(original_text: str, corrected_text: str) -> None:
    """
    Ensure the legal correction pass does not damage protected line prefixes or
    collapse the transcript structure too aggressively.
    """
    original_lines = original_text.splitlines()
    corrected_lines = corrected_text.splitlines()

    if not corrected_lines:
        raise ValueError("AI legal correction returned empty output.")

    if len(corrected_lines) < max(1, len(original_lines) // 2):
        raise ValueError(
            f"AI legal correction changed line count too aggressively: "
            f"{len(original_lines)} → {len(corrected_lines)}."
        )

    protected_orig = [get_line_prefix(line) for line in original_lines if get_line_prefix(line)]
    protected_corr = [get_line_prefix(line) for line in corrected_lines if get_line_prefix(line)]

    if protected_orig != protected_corr:
        raise ValueError(
            "AI legal correction changed protected Q./A. or speaker label ordering."
        )


def _block_type_code(block: "Block") -> str:
    block_type = str(getattr(block, "block_type", "") or "").upper()
    if block_type.endswith("QUESTION"):
        return "Q"
    if block_type.endswith("ANSWER"):
        return "A"
    if block_type.endswith("SPEAKER") or block_type.endswith("COLLOQUY"):
        return "SP"
    if block_type.endswith("PARENTHETICAL"):
        return "PN"
    if block_type.endswith("FLAG"):
        return "FLAG"
    return "TXT"


def _serialize_blocks_for_ai(blocks: list["Block"]) -> str:
    lines = []
    for idx, block in enumerate(blocks):
        lines.append(f"[{idx}|{_block_type_code(block)}] {(getattr(block, 'text', '') or '').strip()}")
    return "\n".join(lines)


def _parse_indexed_ai_output(output: str, expected_count: int) -> dict[int, str] | None:
    line_re = re.compile(r"^\[(\d+)\|[A-Z]+\]\s*(.*)$", re.MULTILINE)
    matches = line_re.findall(output)
    if len(matches) != expected_count:
        return None
    if any(int(idx) != i for i, (idx, _) in enumerate(matches)):
        return None
    return {int(idx): text.strip() for idx, text in matches}


def _build_text_only_prompt() -> str:
    return (
        BASE_SYSTEM_PROMPT
        + """
STRUCTURED INPUT FORMAT:
Each line is: [INDEX|TYPE] text

YOU MUST:
- Return the exact same number of lines
- Keep every [INDEX|TYPE] prefix unchanged
- Only correct text after the ] bracket
- Preserve speaker order and structure

YOU MUST NOT:
- Add or remove lines
- Change INDEX values
- Change TYPE values
- Split or merge lines
- Rewrite testimony
- Remove filler words such as uh, um, yeah, yep, nope, nah, uh-huh, mm-hmm

If uncertain, return the line unchanged.
"""
    )


def correct_blocks_with_ai(
    blocks: list["Block"],
    proper_nouns: list[str] | None = None,
    dash_style: str = "double-hyphen",
    job_config_fields: dict | None = None,
) -> list["Block"]:
    """
    Structured AI correction pass. Only Block.text may change.
    """
    if not blocks:
        return blocks

    payload = _serialize_blocks_for_ai(blocks)
    result = _call_api_chunked(
        system_prompt=_build_text_only_prompt(),
        transcript_text=payload,
        proper_nouns=proper_nouns or [],
        dash_style=dash_style,
        job_config_fields=job_config_fields,
    )
    parsed = _parse_indexed_ai_output(result, len(blocks))
    if parsed is None:
        raise ValueError("AI block correction returned malformed indexed output.")

    corrected_blocks = copy.deepcopy(blocks)
    for idx, new_text in parsed.items():
        corrected_blocks[idx].text = new_text
    return corrected_blocks
