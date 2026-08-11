"""Adapter from the completed Depo-Pro render model to the existing formatter authority."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping, Sequence


def format_render_model(
    render_model: Mapping[str, object],
    formats: Sequence[str],
    output_directory: Path,
    certified: Mapping[str, object] | None = None,
) -> dict[str, Path]:
    """Create requested artifacts without reinterpreting rendered transcript content.

    When `certified` is provided, the DOCX is the COMPLETE certified document
    (front matter -> numbered body -> certificate + changes/signature); the body is
    still rendered by the one surviving body renderer. When it is absent (the default),
    behavior is byte-identical to before — a body-only transcript — so the wiring is
    backward-compatible / default-off."""
    _validate_render_model(render_model)

    requested = set(formats)
    if not requested or requested.difference({"DOCX", "PDF"}):
        raise ValueError("formats must contain DOCX and/or PDF")

    output_directory.mkdir(parents=True, exist_ok=True)
    document_path = output_directory / "transcript.docx"

    if certified is not None:
        from .certified_sections import render_certified_document_to_docx

        render_certified_document_to_docx(render_model, certified, str(document_path))
    else:
        from .docx_exporter import export_render_model_to_docx

        export_render_model_to_docx(render_model, str(document_path))
    artifacts: dict[str, Path] = {}
    if "DOCX" in requested:
        artifacts["DOCX"] = document_path

    if "PDF" in requested:
        from .pdf_exporter import export_pdf

        pdf_path = output_directory / "transcript.pdf"
        export_pdf(str(document_path), str(pdf_path))
        artifacts["PDF"] = pdf_path

    if "DOCX" not in requested:
        document_path.unlink(missing_ok=True)

    return artifacts


def _validate_render_model(render_model: Mapping[str, object]) -> None:
    geometry = render_model.get("geometry")
    lines = render_model.get("lines")
    if not isinstance(geometry, dict):
        raise ValueError("render model requires document geometry")
    required_document_geometry = (
        "format_box_width_inches",
        "left_margin_inches",
        "right_margin_inches",
        "line_spacing_points",
        "lines_per_page",
    )
    if any(not isinstance(geometry.get(name), (int, float)) or geometry[name] <= 0 for name in required_document_geometry):
        raise ValueError("render model requires valid document geometry")
    if not isinstance(lines, list) or not lines:
        raise ValueError("render model requires non-empty lines")

    for line in lines:
        if not isinstance(line, dict) or not isinstance(line.get("content"), str):
            raise ValueError("render model lines require string content")
        line_geometry = line.get("geometry")
        if not isinstance(line_geometry, dict):
            raise ValueError("render model lines require geometry")
        if line_geometry.get("role") not in {"qa", "speaker", "parenthetical", "centered"}:
            raise ValueError("render model lines require a valid geometry role")
        for name in ("first_line_tab_inches", "continuation_indent_inches"):
            if not isinstance(line_geometry.get(name), (int, float)) or line_geometry[name] < 0:
                raise ValueError("render model lines require valid tab geometry")
        text_tab = line_geometry.get("text_tab_inches")
        if text_tab is not None and (not isinstance(text_tab, (int, float)) or text_tab < 0):
            raise ValueError("render model lines require valid text tab geometry")
