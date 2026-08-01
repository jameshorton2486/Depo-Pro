"""ATIA provider-abstraction guard (§4.10 acceptance criterion).

Fails the build if `anthropic.Anthropic(...)` is instantiated anywhere other than
the sanctioned adapter. The two legacy callers (`ai_tools.py`, `main.py`) are
grandfathered on the deprecation path and listed explicitly — as migration
retires them, delete them from ALLOWED and the guard tightens automatically.

This is the "lint rule that stops drift" from the cleanup strategy: it does not
delete legacy code, it just prevents NEW code from re-coupling to the vendor SDK.
"""

from __future__ import annotations

from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]

# Only these files may instantiate the Anthropic SDK directly.
#   - providers/anthropic_adapter.py : the sanctioned home (ATIA §4.10)
#   - ai_tools.py, main.py           : quarantined legacy, remove as they retire
ALLOWED = {
    "providers/anthropic_adapter.py",
    "ai_tools.py",
    "main.py",
}

# Built by concatenation so this guard file never matches its own scan.
_NEEDLE = "anthropic" + ".Anthropic("
_SELF = "tests/test_import_guard.py"
_SKIP_DIRS = {"__pycache__", ".git", "transcript_formatter_NEW", "output", "temp", "logs", "work_files"}


def _iter_py_files():
    for path in _ROOT.rglob("*.py"):
        rel = path.relative_to(_ROOT)
        if rel.as_posix() == _SELF:
            continue
        if any(part in _SKIP_DIRS or part.startswith("depo_formatter_backup_") for part in rel.parts):
            continue
        yield path, rel.as_posix()


def test_anthropic_sdk_only_instantiated_in_sanctioned_files():
    offenders = []
    for path, rel in _iter_py_files():
        if rel in ALLOWED:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if _NEEDLE in text:
            offenders.append(rel)

    assert not offenders, (
        "anthropic.Anthropic(...) may only be instantiated in "
        f"{sorted(ALLOWED)} (ATIA §4.10). New offenders: {offenders}. "
        "Route AI calls through providers/anthropic_adapter.py instead."
    )


def test_allowlist_entries_still_exist():
    # Keep ALLOWED honest: a stale entry (file deleted/renamed) should be pruned.
    missing = [rel for rel in ALLOWED if not (_ROOT / rel).exists()]
    assert not missing, f"ALLOWED references files that no longer exist: {missing}"
