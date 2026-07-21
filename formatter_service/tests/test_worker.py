from datetime import UTC, datetime
from pathlib import Path

from formatter_service.worker import process_formatter_task


class FakeStore:
    def __init__(self) -> None:
        self.jobs: dict[str, dict[str, object]] = {}
        self.claims: dict[tuple[str, str], str] = {}
        self.write_history: list[dict[str, object]] = []

    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str:
        return self.claims.setdefault((transcript_id, idempotency_key), job_id)

    def read_job(self, job_id: str) -> dict[str, object] | None:
        return self.jobs.get(job_id)

    def write_job(self, job, task, retry_eligible, updated_at) -> None:
        self.jobs[task.job_id] = job
        self.write_history.append(job)

    def upload_artifact(self, job_id: str, format_name: str, path: Path) -> str:
        assert path.exists()
        return f"exports/artifacts/{job_id}/transcript.{format_name.lower()}"

    def signed_download_url(self, object_name: str, expires_at: datetime) -> str:
        return f"https://example.test/{object_name}?expires={expires_at.isoformat()}"


def task_payload(job_id: str = "job-001") -> dict[str, object]:
    return {
        "jobId": job_id,
        "request": {
            "contractVersion": "2026-07-21",
            "transcriptId": "transcript-001",
            "renderModel": {"transcriptId": "transcript-001", "lines": [{"content": "A. Austin."}]},
            "formats": ["DOCX"],
            "idempotencyKey": "request-001",
        },
    }


def test_updates_job_and_preserves_rendered_content(monkeypatch, tmp_path: Path) -> None:
    def fake_formatter(render_model, formats, output_directory):
        assert render_model["lines"] == [{"content": "A. Austin."}]
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker.format_render_model", fake_formatter)
    store = FakeStore()

    result = process_formatter_task(task_payload(), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))

    assert [entry["status"] for entry in store.write_history] == ["PROCESSING", "COMPLETED"]
    assert result.job["artifacts"][0]["format"] == "DOCX"


def test_completed_job_is_immutable_on_retry(monkeypatch, tmp_path: Path) -> None:
    calls = 0

    def fake_formatter(render_model, formats, output_directory):
        nonlocal calls
        calls += 1
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker.format_render_model", fake_formatter)
    store = FakeStore()
    first = process_formatter_task(task_payload(), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))
    second = process_formatter_task(task_payload(), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))

    assert calls == 1
    assert second.job == first.job
    assert [entry["status"] for entry in store.write_history] == ["PROCESSING", "COMPLETED"]


def test_duplicate_idempotency_key_returns_original_artifacts(monkeypatch, tmp_path: Path) -> None:
    def fake_formatter(render_model, formats, output_directory):
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker.format_render_model", fake_formatter)
    store = FakeStore()
    original = process_formatter_task(task_payload(), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))
    duplicate = process_formatter_task(task_payload("job-002"), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))

    assert duplicate.job == original.job
    assert "job-002" not in store.jobs