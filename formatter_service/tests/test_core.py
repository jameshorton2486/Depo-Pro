from pathlib import Path

from formatter_core import format_render_model


def test_generates_docx_from_completed_render_model(tmp_path: Path) -> None:
    artifacts = format_render_model(
        {"transcriptId": "transcript-001", "lines": [{"content": "Q. Where were you?"}]},
        ["DOCX"],
        tmp_path,
    )

    assert artifacts["DOCX"].suffix == ".docx"
    assert artifacts["DOCX"].exists()
