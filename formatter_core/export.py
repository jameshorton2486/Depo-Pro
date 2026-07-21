"""Adapter from the completed Depo-Pro render model to the existing formatter authority."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping, Sequence


def format_render_model(
    render_model: Mapping[str, object],
    formats: Sequence[str],
    output_directory: Path,
) -> dict[str, Path]:
    """Create requested artifacts without reinterpreting rendered transcript content."""
    lines = render_model.get("lines")
    if not isinstance(lines, list) or not lines:
        raise ValueError("render model requires non-empty lines")

    contents: list[str] = []
    for line in lines:
        if not isinstance(line, dict) or not isinstance(line.get("content"), str):
            raise ValueError("render model lines require string content")
        contents.append(line["content"])

    requested = set(formats)
    if not requested or requested.difference({"DOCX", "PDF"}):
        raise ValueError("formats must contain DOCX and/or PDF")

    output_directory.mkdir(parents=True, exist_ok=True)
    document_path = output_directory / "transcript.docx"
    text = "\n\n".join(contents)

    from .docx_exporter import export_to_docx

    export_to_docx(text, str(document_path))
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
