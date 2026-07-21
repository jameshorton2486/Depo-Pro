"""Cloud Tasks worker logic, independent of HTTP and Cloud Storage clients."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Protocol

from formatter_core import format_render_model

from .models import FormatterTask, validate_formatter_task


class ExportStore(Protocol):
    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str: ...

    def read_job(self, job_id: str) -> dict[str, object] | None: ...

    def write_job(self, job: dict[str, object], task: FormatterTask, retry_eligible: bool, updated_at: datetime) -> None: ...

    def upload_artifact(self, job_id: str, format_name: str, path: Path) -> str: ...

    def signed_download_url(self, object_name: str, expires_at: datetime) -> str: ...


@dataclass(frozen=True)
class WorkerResult:
    job: dict[str, object]
    retry_eligible: bool


class RetryableFormatterError(RuntimeError):
    def __init__(self, result: WorkerResult) -> None:
        super().__init__(str(result.job["error"]))
        self.result = result


def process_formatter_task(
    payload: object,
    store: ExportStore,
    work_directory: Path,
    url_ttl_seconds: int,
    now: datetime | None = None,
) -> WorkerResult:
    task = validate_formatter_task(payload)
    timestamp = now or datetime.now(UTC)
    claimed_job_id = store.claim_idempotency(task.transcript_id, task.idempotency_key, task.job_id)
    if claimed_job_id != task.job_id:
        claimed_job = store.read_job(claimed_job_id)
        if claimed_job is None:
            raise RetryableFormatterError(WorkerResult(_job(task, "FAILED", [], "idempotent job is not yet available"), True))
        return WorkerResult(claimed_job, False)

    existing_job = store.read_job(task.job_id)
    if existing_job and existing_job.get("status") == "COMPLETED":
        return WorkerResult(existing_job, False)

    processing = _job(task, "PROCESSING", [], None)
    store.write_job(processing, task, True, timestamp)

    try:
        render_model = task.request["renderModel"]
        formats = task.request["formats"]
        assert isinstance(render_model, dict)
        assert isinstance(formats, list)
        artifacts = format_render_model(render_model, formats, work_directory / task.job_id)
        expires_at = timestamp + timedelta(seconds=url_ttl_seconds)
        completed_artifacts = [
            _artifact(store, task.job_id, format_name, path, expires_at)
            for format_name, path in artifacts.items()
        ]
        completed = _job(task, "COMPLETED", completed_artifacts, None)
        store.write_job(completed, task, False, timestamp)
        return WorkerResult(completed, False)
    except ValueError as error:
        failed = _job(task, "FAILED", [], str(error))
        store.write_job(failed, task, False, timestamp)
        return WorkerResult(failed, False)
    except Exception as error:
        failed = _job(task, "FAILED", [], str(error))
        store.write_job(failed, task, True, timestamp)
        raise RetryableFormatterError(WorkerResult(failed, True)) from error


def _artifact(store: ExportStore, job_id: str, format_name: str, path: Path, expires_at: datetime) -> dict[str, object]:
    object_name = store.upload_artifact(job_id, format_name, path)
    return {
        "format": format_name,
        "contentType": _content_type(format_name),
        "downloadUrl": store.signed_download_url(object_name, expires_at),
        "expiresAt": expires_at.isoformat(),
    }


def _job(task: FormatterTask, status: str, artifacts: list[dict[str, object]], error: str | None) -> dict[str, object]:
    return {
        "jobId": task.job_id,
        "transcriptId": task.transcript_id,
        "status": status,
        "artifacts": artifacts,
        "error": error,
    }


def _content_type(format_name: str) -> str:
    if format_name == "DOCX":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/pdf"