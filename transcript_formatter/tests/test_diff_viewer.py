from __future__ import annotations

from utils.diff_viewer import count_changes, diff_summary, generate_diff


def test_generate_diff_marks_changed_lines():
    diff = generate_diff("A\nB", "A\nC")
    assert "❌  B" in diff
    assert "✅  C" in diff


def test_count_changes_accounts_for_added_lines():
    changed, total = count_changes("A\nB", "A\nB\nC")
    assert changed == 1
    assert total == 2


def test_diff_summary_reports_expected_text():
    assert diff_summary("A\nB", "A\nC") == "1 of 2 line(s) changed."
    assert diff_summary("A", "A") == "No changes."
