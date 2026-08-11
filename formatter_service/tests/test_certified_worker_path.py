"""DOC-0328 — application-path integration test (the REAL formatter_service worker).

Unlike test_certified_cross_runtime (which calls the renderer directly), this drives the
actual worker entry point process_formatter_task with a real ExportServiceRequest-shaped
payload carrying the certified section data, and inspects the artifact the worker would
upload. This is the exact application seam a later Human Gate would deploy:

  export request (renderModel + certified) -> formatter_service.worker
    -> formatter_core.format_render_model -> complete certified DOCX.

It also proves the wiring is default-off: with `certified` absent, the worker still
produces the body-only transcript, byte-path unchanged.
"""

import json
from datetime import datetime
from pathlib import Path

from docx import Document

from formatter_service.worker import process_formatter_task

_FIXTURE = (
    Path(__file__).resolve().parents[2]
    / "src" / "lib" / "export" / "__fixtures__" / "certifiedTransport.fixture.json"
)


class _CapturingStore:
    """Minimal in-memory ExportStore that captures the artifact path the worker uploads."""

    def __init__(self) -> None:
        self.uploaded: dict[str, Path] = {}

    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str:
        return job_id

    def read_job(self, job_id: str):
        return None

    def claim_processing(self, job_id: str):
        return f"lease-{job_id}"

    def renew_processing(self, job_id: str, lease_token: str) -> bool:
        return True

    def release_processing(self, job_id: str, lease_token: str) -> None:
        return None

    def write_job(self, job, task, retry_eligible, updated_at) -> None:
        return None

    def upload_artifact(self, job_id: str, format_name: str, path: Path) -> str:
        assert path.exists()
        self.uploaded[format_name] = Path(path)
        return f"exports/{job_id}/transcript.{format_name.lower()}"

    def signed_download_url(self, object_name: str, expires_at: datetime) -> str:
        return f"https://example.test/{object_name}"


def _payload(fixture: dict, *, with_certified: bool) -> dict:
    request = {
        "contractVersion": "2026-07-21",
        "transcriptId": fixture["renderModel"]["transcriptId"],
        "renderModel": fixture["renderModel"],
        "formats": ["DOCX"],
        "idempotencyKey": "req-cert-001",
    }
    if with_certified:
        request["certified"] = fixture["certified"]
    return {"jobId": "job-cert-001", "request": request}


def _docx_text(path: Path) -> str:
    doc = Document(str(path))
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                parts.append(cell.text)
    return "\n".join(parts)


def _table_text(path: Path) -> str:
    doc = Document(str(path))
    return "\n".join(cell.text for tb in doc.tables for row in tb.rows for cell in row.cells)


def test_worker_produces_complete_certified_docx(tmp_path) -> None:
    fixture = json.loads(_FIXTURE.read_text(encoding="utf-8"))
    store = _CapturingStore()

    result = process_formatter_task(_payload(fixture, with_certified=True), store, tmp_path, url_ttl_seconds=3600)

    assert result.job["status"] == "COMPLETED"
    text = _docx_text(store.uploaded["DOCX"])
    # Reviewed line_type reached the actual worker output...
    assert "You understand the oath?" in text
    assert "Yes I understand completely." in text
    # ...alongside the certified sections.
    assert "MARY REPORTER" in text
    assert "CERTIFICATE" in text
    assert "INDEX OF EXHIBITS" in text
    assert "CHANGES AND SIGNATURE" in text


def test_worker_is_default_off_without_certified(tmp_path) -> None:
    fixture = json.loads(_FIXTURE.read_text(encoding="utf-8"))
    store = _CapturingStore()

    result = process_formatter_task(_payload(fixture, with_certified=False), store, tmp_path, url_ttl_seconds=3600)

    assert result.job["status"] == "COMPLETED"
    # Body still rendered, but NO certified pages — behavior unchanged when certified is absent.
    assert "You understand the oath?" in _docx_text(store.uploaded["DOCX"])
    assert "CERTIFICATE" not in _table_text(store.uploaded["DOCX"])
