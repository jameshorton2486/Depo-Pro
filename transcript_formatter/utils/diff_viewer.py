"""
Diff helpers for transcript correction passes.
"""

from __future__ import annotations

import difflib
from typing import Tuple


def generate_diff(original: str, corrected: str) -> str:
    orig_lines = (original or "").splitlines()
    corr_lines = (corrected or "").splitlines()
    diff = difflib.ndiff(orig_lines, corr_lines)
    output: list[str] = []

    for line in diff:
        if line.startswith("- "):
            output.append(f"\u274c  {line[2:]}")
        elif line.startswith("+ "):
            output.append(f"\u2705  {line[2:]}")
        elif line.startswith("? "):
            continue
        else:
            output.append(f"   {line[2:]}")

    return "\n".join(output)


def count_changes(original: str, corrected: str) -> Tuple[int, int]:
    orig_lines = (original or "").splitlines()
    corr_lines = (corrected or "").splitlines()
    changed = sum(1 for a, b in zip(orig_lines, corr_lines) if a != b)
    changed += abs(len(orig_lines) - len(corr_lines))
    return changed, len(orig_lines)


def diff_summary(original: str, corrected: str) -> str:
    changed, total = count_changes(original, corrected)
    if changed == 0:
        return "No changes."
    return f"{changed} of {total} line(s) changed."
