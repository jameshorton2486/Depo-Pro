from datetime import UTC, datetime, timedelta
from pathlib import Path
from time import sleep

import pytest

from formatter_service.worker import RetryableFormatterError, process_formatter_task


class FakeStore:
    def __init__(self) -> None:
        self.jobs: dict[str, dict[str, object]] = {}
        self.claims: dict[tuple[str, str], str] = {}
        self.write_history: list[dict[str, object]] = []
        self.processing: dict[str, str] = {}
        self.renewals = 0
        self.renewal_available = True
        self.processing_available = True

    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str:
        return self.claims.setdefault((transcript_id, idempotency_key), job_id)

    def read_job(self, job_id: str) -> dict[str, object] | None:
        return self.jobs.get(job_id)

    def claim_processing(self, job_id: str) -> str | None:
        if not self.processing_available or job_id in self.processing:
            return None
        lease_token = f"lease-{job_id}"
        self.processing[job_id] = lease_token
        return lease_token

    def renew_processing(self, job_id: str, lease_token: str) -> bool:
        self.renewals += 1
        return self.renewal_available and self.processing.get(job_id) == lease_token

    def release_processing(self, job_id: str, lease_token: str) -> None:
        if self.processing.get(job_id) == lease_token:
            self.processing.pop(job_id)

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
            "renderModel": {
                "transcriptId": "transcript-001",
                "geometry": {
                    "format_box_width_inches": 6.5,
                    "left_margin_inches": 1.25,
                    "right_margin_inches": 0.75,
                    "line_spacing_points": 28,
                    "lines_per_page": 25,
                },
                "lines": [{
                    "content": "A. Austin.",
                    "geometry": {
                        "role": "qa",
                        "first_line_tab_inches": 0.5,
                        "text_tab_inches": 1.0,
                        "continuation_indent_inches": 0.0,
                    },
                }],
            },
            "formats": ["DOCX"],
            "idempotencyKey": "request-001",
        },
    }


def test_updates_job_and_preserves_rendered_content(monkeypatch, tmp_path: Path) -> None:
    def fake_formatter(render_model, formats, output_directory):
        assert render_model["lines"][0]["content"] == "A. Austin."
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


def test_missing_idempotent_job_is_retryable_processing(tmp_path: Path) -> None:
    store = FakeStore()
    store.claims[("transcript-001", "request-001")] = "job-original"

    with pytest.raises(RetryableFormatterError) as raised:
        process_formatter_task(task_payload("job-duplicate"), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))

    assert raised.value.result.job["status"] == "PROCESSING"
    assert raised.value.result.job["jobId"] == "job-original"
    assert raised.value.result.job["error"] is None
    assert raised.value.result.retry_eligible is True


def test_overlapping_delivery_does_not_format(monkeypatch, tmp_path: Path) -> None:
    def fail_formatter(*_arguments):
        raise AssertionError("overlapping delivery must not format")

    monkeypatch.setattr("formatter_service.worker.format_render_model", fail_formatter)
    store = FakeStore()
    store.processing_available = False

    with pytest.raises(RetryableFormatterError) as raised:
        process_formatter_task(task_payload(), store, tmp_path, 900, datetime(2026, 7, 21, tzinfo=UTC))

    assert raised.value.result.job["status"] == "PROCESSING"
    assert store.write_history == []


def test_signed_url_ttl_starts_after_formatting(monkeypatch, tmp_path: Path) -> None:
    started_at = datetime(2026, 7, 21, 12, 0, tzinfo=UTC)
    completed_at = started_at + timedelta(minutes=4)
    timestamps = iter([started_at, completed_at])

    def fake_formatter(_render_model, _formats, output_directory):
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker._utc_now", lambda: next(timestamps))
    monkeypatch.setattr("formatter_service.worker.format_render_model", fake_formatter)
    store = FakeStore()

    result = process_formatter_task(task_payload(), store, tmp_path, 900)

    artifact = result.job["artifacts"][0]
    assert artifact["expiresAt"] == (completed_at + timedelta(seconds=900)).isoformat()

def test_long_formatting_renews_processing_lease(monkeypatch, tmp_path: Path) -> None:
    def slow_formatter(_render_model, _formats, output_directory):
        sleep(0.04)
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker._PROCESSING_LEASE_RENEW_INTERVAL_SECONDS", 0.01)
    monkeypatch.setattr("formatter_service.worker.format_render_model", slow_formatter)
    store = FakeStore()

    result = process_formatter_task(task_payload(), store, tmp_path, 900)

    assert result.job["status"] == "COMPLETED"
    assert store.renewals >= 1
    assert store.processing == {}

def test_lost_processing_lease_never_publishes_completion(monkeypatch, tmp_path: Path) -> None:
    def slow_formatter(_render_model, _formats, output_directory):
        sleep(0.04)
        output_directory.mkdir(parents=True)
        docx = output_directory / "transcript.docx"
        docx.write_text("synthetic")
        return {"DOCX": docx}

    monkeypatch.setattr("formatter_service.worker._PROCESSING_LEASE_RENEW_INTERVAL_SECONDS", 0.01)
    monkeypatch.setattr("formatter_service.worker.format_render_model", slow_formatter)
    store = FakeStore()
    store.renewal_available = False

    with pytest.raises(RetryableFormatterError) as raised:
        process_formatter_task(task_payload(), store, tmp_path, 900)

    assert raised.value.result.job["status"] == "PROCESSING"
    assert [entry["status"] for entry in store.write_history] == ["PROCESSING"]
@pytest.mark.parametrize("formatter_error", [ValueError("invalid synthetic input"), RuntimeError("synthetic converter failure")])
def test_lost_processing_lease_never_publishes_failure(monkeypatch, tmp_path: Path, formatter_error: Exception) -> None:
    def slow_failing_formatter(_render_model, _formats, _output_directory):
        sleep(0.04)
        raise formatter_error

    monkeypatch.setattr("formatter_service.worker._PROCESSING_LEASE_RENEW_INTERVAL_SECONDS", 0.01)
    monkeypatch.setattr("formatter_service.worker.format_render_model", slow_failing_formatter)
    store = FakeStore()
    store.renewal_available = False

    with pytest.raises(RetryableFormatterError) as raised:
        process_formatter_task(task_payload(), store, tmp_path, 900)

    assert raised.value.result.job["status"] == "PROCESSING"
    assert [entry["status"] for entry in store.write_history] == ["PROCESSING"]
