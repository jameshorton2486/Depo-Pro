"""Tests for the CorrectionObject contract (ATIA §4.8, D8.1/D8.4)."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from services.tie.correction_object import (
    CorrectionValidationError,
    validate_correction,
    new_correction_id,
    SPECIALTIES,
)

_SCHEMA = json.loads(
    (Path(__file__).resolve().parents[1] / "schema" / "correction_object.schema.json").read_text(
        encoding="utf-8"
    )
)
_TEXT_EXAMPLE = _SCHEMA["$defs"]["example_proper_name_correction"]
_STRUCTURAL_EXAMPLE = _SCHEMA["$defs"]["example_qa_split"]


def test_schema_embedded_text_example_is_valid():
    validate_correction(copy.deepcopy(_TEXT_EXAMPLE))


def test_schema_embedded_structural_example_is_valid():
    validate_correction(copy.deepcopy(_STRUCTURAL_EXAMPLE))


def test_new_correction_id_matches_schema_pattern():
    import re

    pattern = _SCHEMA["properties"]["id"]["pattern"]
    for _ in range(50):
        assert re.match(pattern, new_correction_id())


def test_missing_required_fields_are_all_reported():
    with pytest.raises(CorrectionValidationError) as exc:
        validate_correction({})
    # Every required field should be named, not just the first.
    assert len(exc.value.errors) >= len(_SCHEMA["required"])


def test_text_change_requires_before_and_after():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    del bad["change"]["after"]
    with pytest.raises(CorrectionValidationError) as exc:
        validate_correction(bad)
    assert any("requires both 'before' and 'after'" in e for e in exc.value.errors)


def test_structural_change_must_not_carry_text():
    bad = copy.deepcopy(_STRUCTURAL_EXAMPLE)
    bad["change"]["before"] = "some text"
    bad["change"]["after"] = "other text"
    with pytest.raises(CorrectionValidationError) as exc:
        validate_correction(bad)
    assert any("must not carry 'before'/'after'" in e for e in exc.value.errors)


def test_structural_change_requires_structural_change_field():
    bad = copy.deepcopy(_STRUCTURAL_EXAMPLE)
    del bad["change"]["structural_change"]
    with pytest.raises(CorrectionValidationError) as exc:
        validate_correction(bad)
    assert any("requires 'structural_change'" in e for e in exc.value.errors)


def test_generic_reason_is_rejected():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["reason"] = "improved clarity"
    with pytest.raises(CorrectionValidationError):
        validate_correction(bad)


def test_short_reason_is_rejected():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["reason"] = "too short"  # < 10 chars
    with pytest.raises(CorrectionValidationError):
        validate_correction(bad)


def test_out_of_range_confidence_is_rejected():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["confidence"] = 1.5
    with pytest.raises(CorrectionValidationError):
        validate_correction(bad)


def test_unknown_specialty_is_rejected():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["specialty"] = "not_a_real_specialty"
    with pytest.raises(CorrectionValidationError):
        validate_correction(bad)
    assert "not_a_real_specialty" not in SPECIALTIES


def test_ai_provenance_requires_provider():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["provenance"] = {"source": "ai", "generated_at": "2026-10-01T14:23:11Z"}
    with pytest.raises(CorrectionValidationError) as exc:
        validate_correction(bad)
    assert any("provider is required" in e for e in exc.value.errors)


def test_bad_id_pattern_is_rejected():
    bad = copy.deepcopy(_TEXT_EXAMPLE)
    bad["id"] = "not-a-corr-id"
    with pytest.raises(CorrectionValidationError):
        validate_correction(bad)
