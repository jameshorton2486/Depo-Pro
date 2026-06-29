"""
Optional AI refinement stage for structured transcript blocks.

This module is intentionally conservative. It exists to provide the
architectural handoff point where AI can operate on block text before visual
rendering. The default implementation is a no-op until stricter block-safe AI
editing rules are fully integrated.
"""

from __future__ import annotations

from typing import Any, List

from ai_tools import correct_blocks_with_ai
from spec_engine.models import Block


def run_ai_review_blocks(blocks: List[Block], rules: Any = None) -> List[Block]:
    """
    Structured AI review for blocks.
    AI must operate on block text, never on final rendered output.
    """
    if not blocks:
        return blocks
    config = rules or {}
    return correct_blocks_with_ai(
        blocks,
        proper_nouns=config.get("proper_nouns"),
        dash_style=config.get("dash_style", "double-hyphen"),
        job_config_fields=config.get("job_config_fields"),
    )
