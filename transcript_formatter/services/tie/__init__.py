"""Transcript Intelligence Service (TIS) — ATIA §3.1.

The service layer that turns the immutable Deepgram baseline + case context into
reviewable CorrectionObjects. Phase 1 lands the two load-bearing contracts:
the CorrectionObject (validated here) and the provider abstraction (``providers``).
"""

from .correction_object import (
    CorrectionValidationError,
    validate_correction,
    new_correction_id,
    SPECIALTIES,
    CHANGE_TYPES,
    TEXT_CHANGE_TYPES,
    STRUCTURAL_CHANGE_TYPES,
    REVIEW_STATES,
)

__all__ = [
    "CorrectionValidationError",
    "validate_correction",
    "new_correction_id",
    "SPECIALTIES",
    "CHANGE_TYPES",
    "TEXT_CHANGE_TYPES",
    "STRUCTURAL_CHANGE_TYPES",
    "REVIEW_STATES",
]
