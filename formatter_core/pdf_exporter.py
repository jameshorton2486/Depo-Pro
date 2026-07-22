"""
PDF export for Depo-Pro.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _try_win32_com(docx_path: str, pdf_path: str) -> bool:
    """Convert DOCX to PDF with Word COM on Windows."""
    if sys.platform != "win32":
        return False
    try:
        import win32com.client as win32  # type: ignore

        word = win32.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(str(Path(docx_path).resolve()))
        doc.SaveAs(str(Path(pdf_path).resolve()), FileFormat=17)
        doc.Close(False)
        word.Quit()
        return Path(pdf_path).exists()
    except Exception:
        return False


def _try_docx2pdf(docx_path: str, pdf_path: str) -> bool:
    """Convert DOCX to PDF via docx2pdf if available."""
    try:
        from docx2pdf import convert  # type: ignore

        convert(docx_path, pdf_path)
        return Path(pdf_path).exists()
    except Exception:
        return False


def _try_libreoffice(docx_path: str, pdf_path: str) -> bool:
    """Convert DOCX to PDF with LibreOffice headless mode."""
    lo_candidates = [
        "soffice",
        "/usr/bin/soffice",
        "/usr/local/bin/soffice",
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    ]
    soffice = None
    for candidate in lo_candidates:
        if Path(candidate).exists():
            soffice = candidate
            break
        try:
            cmd = ["where", candidate] if sys.platform == "win32" else ["which", candidate]
            if subprocess.run(cmd, capture_output=True).returncode == 0:
                soffice = candidate
                break
        except Exception:
            continue

    if not soffice:
        return False

    try:
        out_dir = str(Path(pdf_path).parent.resolve())
        result = subprocess.run(
            [soffice, "--headless", "--convert-to", "pdf", "--outdir", out_dir, str(Path(docx_path).resolve())],
            capture_output=True,
            timeout=60,
        )
        if result.returncode == 0:
            lo_output = Path(out_dir) / (Path(docx_path).stem + ".pdf")
            if lo_output.exists():
                if lo_output.resolve() != Path(pdf_path).resolve():
                    lo_output.replace(pdf_path)
                return Path(pdf_path).exists()
        return False
    except Exception:
        return False



def export_pdf(docx_path: str, pdf_path: str) -> str:
    """Convert DOCX to PDF using the first working strategy."""
    import logging

    dest = Path(pdf_path)
    if dest.suffix.lower() != ".pdf":
        dest = dest.with_suffix(".pdf")
    dest.parent.mkdir(parents=True, exist_ok=True)
    pdf_path = str(dest)

    strategies = [
        ("Word COM (Windows)", _try_win32_com),
        ("docx2pdf", _try_docx2pdf),
        ("LibreOffice headless", _try_libreoffice),
    ]

    log = logging.getLogger(__name__)
    for name, fn in strategies:
        log.info("PDF export: trying %s ...", name)
        try:
            if fn(docx_path, pdf_path):
                log.info("PDF export succeeded via %s", name)
                return pdf_path
        except Exception as exc:
            log.warning("PDF export via %s failed: %s", name, exc)

    raise RuntimeError(
        "PDF export failed. None of the conversion strategies succeeded.\n"
        "Ensure Microsoft Word, LibreOffice, or docx2pdf is installed."
    )
