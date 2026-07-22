"""Cloud Storage persistence for asynchronous export jobs and artifacts."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .models import FormatterTask


_PROCESSING_LEASE_TTL = timedelta(minutes=10)


class CloudStorageExportStore:
    def __init__(self, bucket_name: str) -> None:
        import google.auth
        from google.cloud import storage

        credentials, project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        self._credentials = credentials
        self._bucket = storage.Client(project=project, credentials=credentials).bucket(bucket_name)

    def claim_idempotency(self, transcript_id: str, idempotency_key: str, job_id: str) -> str:
        from google.api_core.exceptions import PreconditionFailed

        blob = self._bucket.blob(_idempotency_object_name(transcript_id, idempotency_key))
        try:
            blob.upload_from_string(job_id, content_type="text/plain", if_generation_match=0)
            return job_id
        except PreconditionFailed:
            return blob.download_as_text().strip()

    def read_job(self, job_id: str) -> dict[str, object] | None:
        from google.api_core.exceptions import NotFound

        try:
            payload = json.loads(self._bucket.blob(_job_object_name(job_id)).download_as_text())
        except NotFound:
            return None
        job = payload.get("job")
        return job if isinstance(job, dict) else None

    def claim_processing(self, job_id: str) -> str | None:
        from google.api_core.exceptions import NotFound, PreconditionFailed

        blob = self._bucket.blob(_processing_object_name(job_id))
        lease_token = uuid.uuid4().hex
        try:
            blob.upload_from_string(lease_token, content_type="text/plain", if_generation_match=0)
            return lease_token
        except PreconditionFailed:
            try:
                blob.reload()
                updated = blob.updated
                if updated is None or datetime.now(UTC) - updated <= _PROCESSING_LEASE_TTL:
                    return None
                blob.upload_from_string(
                    lease_token,
                    content_type="text/plain",
                    if_generation_match=blob.generation,
                )
                return lease_token
            except (NotFound, PreconditionFailed):
                return None

    def renew_processing(self, job_id: str, lease_token: str) -> bool:
        from google.api_core.exceptions import NotFound, PreconditionFailed

        blob = self._bucket.blob(_processing_object_name(job_id))
        try:
            blob.reload()
            generation = blob.generation
            if blob.download_as_text(if_generation_match=generation).strip() != lease_token:
                return False
            blob.upload_from_string(
                lease_token,
                content_type="text/plain",
                if_generation_match=generation,
            )
            return True
        except (NotFound, PreconditionFailed):
            return False

    def release_processing(self, job_id: str, lease_token: str) -> None:
        from google.api_core.exceptions import NotFound, PreconditionFailed

        blob = self._bucket.blob(_processing_object_name(job_id))
        try:
            blob.reload()
            generation = blob.generation
            if blob.download_as_text(if_generation_match=generation).strip() == lease_token:
                blob.delete(if_generation_match=generation)
        except (NotFound, PreconditionFailed):
            pass

    def write_rejected_job(self, job_id: str, transcript_id: str, error: str, updated_at: datetime) -> dict[str, object]:
        from google.api_core.exceptions import NotFound, PreconditionFailed

        blob = self._bucket.blob(_job_object_name(job_id))
        generation = 0
        try:
            blob.reload()
            generation = blob.generation
            current_payload = json.loads(blob.download_as_text(if_generation_match=generation))
            current_job = current_payload.get("job")
            if isinstance(current_job, dict) and current_job.get("status") == "COMPLETED":
                return current_job
        except NotFound:
            pass

        job: dict[str, object] = {
            "jobId": job_id,
            "transcriptId": transcript_id,
            "status": "FAILED",
            "artifacts": [],
            "error": error,
        }
        payload = {"job": job, "idempotencyKey": None, "retryEligible": False, "updatedAt": updated_at.isoformat()}
        try:
            blob.upload_from_string(
                json.dumps(payload, separators=(",", ":")),
                content_type="application/json",
                if_generation_match=generation,
            )
        except PreconditionFailed:
            current_job = self.read_job(job_id)
            if current_job and current_job.get("status") == "COMPLETED":
                return current_job
            raise
        return job

    def write_job(self, job: dict[str, object], task: FormatterTask, retry_eligible: bool, updated_at: datetime) -> None:
        payload = {
            "job": job,
            "idempotencyKey": task.idempotency_key,
            "retryEligible": retry_eligible,
            "updatedAt": updated_at.isoformat(),
        }
        self._bucket.blob(_job_object_name(task.job_id)).upload_from_string(
            json.dumps(payload, separators=(",", ":")),
            content_type="application/json",
        )

    def upload_artifact(self, job_id: str, format_name: str, path: Path) -> str:
        object_name = f"exports/artifacts/{job_id}/transcript.{format_name.lower()}"
        self._bucket.blob(object_name).upload_from_filename(path, content_type=_content_type(format_name))
        return object_name

    def signed_download_url(self, object_name: str, expires_at: datetime) -> str:
        from google.auth.transport.requests import Request

        if not self._credentials.valid:
            self._credentials.refresh(Request())
        service_account_email = getattr(self._credentials, "service_account_email", None)
        if not service_account_email or not self._credentials.token:
            raise RuntimeError("formatter credentials cannot sign artifact URLs")
        return self._bucket.blob(object_name).generate_signed_url(
            expiration=expires_at,
            version="v4",
            method="GET",
            service_account_email=service_account_email,
            access_token=self._credentials.token,
        )


def _job_object_name(job_id: str) -> str:
    return f"exports/jobs/{job_id}.json"


def _processing_object_name(job_id: str) -> str:
    return f"exports/processing/{job_id}.lock"


def _idempotency_object_name(transcript_id: str, idempotency_key: str) -> str:
    digest = hashlib.sha256(f"{transcript_id}:{idempotency_key}".encode("utf-8")).hexdigest()
    return f"exports/idempotency/{digest}.txt"


def _content_type(format_name: str) -> str:
    if format_name == "DOCX":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/pdf"
