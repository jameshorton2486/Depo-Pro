"""CorrectionObject contract + validator (ATIA §4.8, D8.1 & D8.4).

The CorrectionObject is the atomic unit of transcript intelligence: one proposed
change against the immutable canonical Deepgram baseline, produced by a
deterministic rule or an AI specialty prompt, and reviewed by a human reporter.

The JSON Schema at ``schema/correction_object.schema.json`` is the single source
of truth. This module loads that schema to derive its enums / required fields, so
the backend can never silently drift from the contract the frontend also consumes.
The conditional per-``change.type`` constraints (the schema's ``allOf``/``if``/
``then`` blocks) are enforced explicitly here — a text correction must carry
before/after; a structural correction must carry ``structural_change`` and must
NOT carry before/after.

This module has zero third-party dependencies (no pydantic / jsonschema), so it
runs anywhere the pipeline runs.
"""

from __future__ import annotations

import json
import re
import secrets
import time
from pathlib import Path
from typing import Any, Iterable

# ── schema as single source of truth ─────────────────────────────────────────

_SCHEMA_PATH = Path(__file__).resolve().parents[2] / "schema" / "correction_object.schema.json"


def _load_schema() -> dict:
    return json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))


_SCHEMA = _load_schema()
_PROPS = _SCHEMA["properties"]

REQUIRED_FIELDS: tuple[str, ...] = tuple(_SCHEMA["required"])
SPECIALTIES: frozenset[str] = frozenset(_PROPS["specialty"]["enum"])
CHANGE_TYPES: frozenset[str] = frozenset(_PROPS["change"]["properties"]["type"]["enum"])
REASON_KINDS: frozenset[str] = frozenset(_PROPS["reason_kind"]["enum"])
PROVENANCE_SOURCES: frozenset[str] = frozenset(
    _PROPS["provenance"]["properties"]["source"]["enum"]
)
REVIEW_STATES: frozenset[str] = frozenset(_PROPS["review"]["properties"]["state"]["enum"])

_ID_PATTERN = re.compile(_PROPS["id"]["pattern"])
_REASON_MIN = _PROPS["reason"]["minLength"]
_REASON_MAX = _PROPS["reason"]["maxLength"]
_CONF_MIN = _PROPS["confidence"]["minimum"]
_CONF_MAX = _PROPS["confidence"]["maximum"]

# Derived from the schema's change.allOf branches (kept in sync with §4.8).
TEXT_CHANGE_TYPES: frozenset[str] = frozenset(
    {"proper_name_correction", "medical_term_correction", "contextual_number_flag"}
)
STRUCTURAL_CHANGE_TYPES: frozenset[str] = frozenset(
    {
        "speaker_reassignment",
        "qa_split",
        "objection_attribution",
        "examination_section_change",
        "off_record_boundary_mark",
    }
)

_LOCATION_REQUIRED = ("paragraph_id", "start_word_id", "end_word_id")

# Generic reasons the validator rejects (ATIA §2.4: reasons must be specific).
_GENERIC_REASONS = {"improved clarity", "looks better", "better", "clarity", "fix", "correction"}


class CorrectionValidationError(ValueError):
    """Raised when a correction payload violates the CorrectionObject contract.

    Carries every problem found (not just the first) so callers can surface a
    complete diagnosis."""

    def __init__(self, errors: Iterable[str]) -> None:
        self.errors = list(errors)
        super().__init__("; ".join(self.errors) or "invalid correction")


def new_correction_id() -> str:
    """Return a ``corr_``-prefixed ULID matching the schema's id pattern.

    Crockford base32, time-ordered (48-bit ms timestamp + 80 bits randomness).
    Uses stdlib ``time``/``secrets`` — deterministic ordering is not required for
    correctness, only monotonic-ish sortability."""
    alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford; all within [0-9A-Z]
    timestamp = int(time.time() * 1000) & ((1 << 48) - 1)
    value = (timestamp << 80) | secrets.randbits(80)
    chars = []
    for _ in range(26):
        chars.append(alphabet[value & 0x1F])
        value >>= 5
    return "corr_" + "".join(reversed(chars))


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_correction(data: Any) -> None:
    """Validate a correction payload against the CorrectionObject contract.

    Raises ``CorrectionValidationError`` (with every problem found) on any
    violation; returns ``None`` when valid."""
    errors: list[str] = []

    if not isinstance(data, dict):
        raise CorrectionValidationError(["correction must be an object"])

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field '{field}'")

    _validate_id(data.get("id"), errors)
    _validate_enum(data.get("specialty"), SPECIALTIES, "specialty", errors)
    _validate_reason(data.get("reason"), errors)
    _validate_enum(data.get("reason_kind"), REASON_KINDS, "reason_kind", errors)
    _validate_confidence(data.get("confidence"), errors)
    _validate_location(data.get("location"), errors)
    _validate_change(data.get("change"), errors)
    _validate_provenance(data.get("provenance"), errors)
    _validate_review(data.get("review"), errors)

    if errors:
        raise CorrectionValidationError(errors)


# ── field validators ──────────────────────────────────────────────────────

def _validate_id(value: Any, errors: list[str]) -> None:
    if value is None:
        return  # missing-required already reported
    if not isinstance(value, str) or not _ID_PATTERN.match(value):
        errors.append(f"id must match {_ID_PATTERN.pattern} (got {value!r})")


def _validate_enum(value: Any, allowed: frozenset[str], field: str, errors: list[str]) -> None:
    if value is None:
        return
    if value not in allowed:
        errors.append(f"{field} must be one of {sorted(allowed)} (got {value!r})")


def _validate_reason(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, str):
        errors.append("reason must be a string")
        return
    if not (_REASON_MIN <= len(value) <= _REASON_MAX):
        errors.append(f"reason length must be {_REASON_MIN}-{_REASON_MAX} chars (got {len(value)})")
    if value.strip().lower() in _GENERIC_REASONS:
        errors.append(f"reason is too generic: {value!r}")


def _validate_confidence(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not _is_number(value) or not (_CONF_MIN <= value <= _CONF_MAX):
        errors.append(f"confidence must be a number in [{_CONF_MIN}, {_CONF_MAX}] (got {value!r})")


def _validate_location(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, dict):
        errors.append("location must be an object")
        return
    for key in _LOCATION_REQUIRED:
        if not value.get(key):
            errors.append(f"location.{key} is required")
    for offset_key in ("start_offset_ms", "end_offset_ms"):
        if offset_key in value and not (isinstance(value[offset_key], int) and value[offset_key] >= 0):
            errors.append(f"location.{offset_key} must be a non-negative integer")


def _validate_change(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, dict):
        errors.append("change must be an object")
        return

    change_type = value.get("type")
    if change_type is None:
        errors.append("change.type is required")
        return
    if change_type not in CHANGE_TYPES:
        errors.append(f"change.type must be one of {sorted(CHANGE_TYPES)} (got {change_type!r})")
        return

    has_before = "before" in value and value["before"] is not None
    has_after = "after" in value and value["after"] is not None
    has_structural = isinstance(value.get("structural_change"), dict)

    if change_type in TEXT_CHANGE_TYPES:
        if not has_before or not has_after:
            errors.append(f"change.type '{change_type}' requires both 'before' and 'after'")
    elif change_type in STRUCTURAL_CHANGE_TYPES:
        if not has_structural:
            errors.append(f"change.type '{change_type}' requires 'structural_change'")
        if has_before or has_after:
            errors.append(f"change.type '{change_type}' must not carry 'before'/'after' text")
    # inconsistency_flag: marks a location; no before/after/structural required.


def _validate_provenance(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, dict):
        errors.append("provenance must be an object")
        return
    if not value.get("generated_at"):
        errors.append("provenance.generated_at is required")
    source = value.get("source")
    if source is None:
        errors.append("provenance.source is required")
    else:
        _validate_enum(source, PROVENANCE_SOURCES, "provenance.source", errors)
        if source == "ai" and not value.get("provider"):
            errors.append("provenance.provider is required when source == 'ai'")


def _validate_review(value: Any, errors: list[str]) -> None:
    if value is None:
        return
    if not isinstance(value, dict):
        errors.append("review must be an object")
        return
    state = value.get("state")
    if state is None:
        errors.append("review.state is required")
    else:
        _validate_enum(state, REVIEW_STATES, "review.state", errors)
