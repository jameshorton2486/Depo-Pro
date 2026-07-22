"""Cloud Tasks worker logic, independent of HTTP and Cloud Storage clients."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Event, Thread
from typing import Protocol

from formatter_core import format_render_model

from .models import FormatterTask, validate_formatter_task


class ExportStore(Protocol):
    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str: ...

    def read_job(self, job_id: str) -> dict[str, object] | None: ...

    def claim_processing(self, job_id: str) -> str | None: ...

    def renew_processing(self, job_id: str, lease_token: str) -> bool: ...

    def release_processing(self, job_id: str, lease_token: str) -> None: ...

    def write_job(self, job: dict[str, object], task: FormatterTask, retry_eligible: bool, updated_at: datetime) -> None: ...

    def upload_artifact(self, job_id: str, format_name: str, path: Path) -> str: ...

    def signed_download_url(self, object_name: str, expires_at: datetime) -> str: ...


@dataclass(frozen=True)
class WorkerResult:
    job: dict[str, object]
    retry_eligible: bool


_PROCESSING_LEASE_RENEW_INTERVAL_SECONDS = 60.0


class ProcessingLeaseLost(RuntimeError):
    pass


class RetryableFormatterError(RuntimeError):
    def __init__(self, result: WorkerResult) -> None:
        super().__init__(str(result.job["error"]))
        self.result = result


class _ProcessingLeaseHeartbeat:
    def __init__(self, store: ExportStore, job_id: str, lease_token: str) -> None:
        self._store = store
        self._job_id = job_id
        self._lease_token = lease_token
        self._stop = Event()
        self._lost = Event()
        self._thread = Thread(target=self._run, name=f"formatter-lease-{job_id}", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def ensure_active(self) -> None:
        if self._lost.is_set():
            raise ProcessingLeaseLost("processing lease could not be renewed")

    def close(self) -> None:
        self._stop.set()
        self._thread.join()

    def _run(self) -> None:
        while not self._stop.wait(_PROCESSING_LEASE_RENEW_INTERVAL_SECONDS):
            try:
                if not self._store.renew_processing(self._job_id, self._lease_token):
                    self._lost.set()
                    return
            except Exception:
                self._lost.set()
                return


def process_formatter_task(
    payload: object,
    store: ExportStore,
    work_directory: Path,
    url_ttl_seconds: int,
    now: datetime | None = None,
) -> WorkerResult:
    task = validate_formatter_task(payload)
    started_at = now or _utc_now()
    claimed_job_id = store.claim_idempotency(task.transcript_id, task.idempotency_key, task.job_id)
    if claimed_job_id != task.job_id:
        claimed_job = store.read_job(claimed_job_id)
        if claimed_job is None:
            raise RetryableFormatterError(WorkerResult(_job(task, "PROCESSING", [], None, job_id=claimed_job_id), True))
        return WorkerResult(claimed_job, False)

    existing_job = store.read_job(task.job_id)
    if existing_job and existing_job.get("status") == "COMPLETED":
        return WorkerResult(existing_job, False)

    lease_token = store.claim_processing(task.job_id)
    if lease_token is None:
        raise RetryableFormatterError(WorkerResult(_job(task, "PROCESSING", [], None), True))

    heartbeat = _ProcessingLeaseHeartbeat(store, task.job_id, lease_token)
    heartbeat.start()
    try:
        existing_job = store.read_job(task.job_id)
        if existing_job and existing_job.get("status") == "COMPLETED":
            return WorkerResult(existing_job, False)

        processing = _job(task, "PROCESSING", [], None)
        store.write_job(processing, task, True, started_at)

        try:
            render_model = task.request["renderModel"]
            formats = task.request["formats"]
            assert isinstance(render_model, dict)
            assert isinstance(formats, list)
            artifacts = format_render_model(render_model, formats, work_directory / task.job_id)
            heartbeat.ensure_active()
            completed_at = now or _utc_now()
            expires_at = completed_at + timedelta(seconds=url_ttl_seconds)
            completed_artifacts = [
                _artifact(store, task.job_id, format_name, path, expires_at)
                for format_name, path in artifacts.items()
            ]
            heartbeat.ensure_active()
            completed = _job(task, "COMPLETED", completed_artifacts, None)
            store.write_job(completed, task, False, completed_at)
            return WorkerResult(completed, False)
        except ProcessingLeaseLost as error:
            raise RetryableFormatterError(
                WorkerResult(_job(task, "PROCESSING", [], str(error)), True),
            ) from error
        except ValueError as error:
            _require_active_lease(heartbeat, task)
            failed = _job(task, "FAILED", [], str(error))
            store.write_job(failed, task, False, now or _utc_now())
            return WorkerResult(failed, False)
        except Exception as error:
            _require_active_lease(heartbeat, task)
            failed = _job(task, "FAILED", [], str(error))
            store.write_job(failed, task, True, now or _utc_now())
            raise RetryableFormatterError(WorkerResult(failed, True)) from error
    finally:
        heartbeat.close()
        store.release_processing(task.job_id, lease_token)

def _require_active_lease(heartbeat: _ProcessingLeaseHeartbeat, task: FormatterTask) -> None:
    try:
        heartbeat.ensure_active()
    except ProcessingLeaseLost as error:
        raise RetryableFormatterError(
            WorkerResult(_job(task, "PROCESSING", [], str(error)), True),
        ) from error


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _artifact(store: ExportStore, job_id: str, format_name: str, path: Path, expires_at: datetime) -> dict[str, object]:
    object_name = store.upload_artifact(job_id, format_name, path)
    return {
        "format": format_name,
        "contentType": _content_type(format_name),
        "downloadUrl": store.signed_download_url(object_name, expires_at),
        "expiresAt": expires_at.isoformat(),
    }


def _job(
    task: FormatterTask,
    status: str,
    artifacts: list[dict[str, object]],
    error: str | None,
    job_id: str | None = None,
) -> dict[str, object]:
    return {
        "jobId": job_id or task.job_id,
        "transcriptId": task.transcript_id,
        "status": status,
        "artifacts": artifacts,
        "error": error,
    }


def _content_type(format_name: str) -> str:
    if format_name == "DOCX":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/pdf"
