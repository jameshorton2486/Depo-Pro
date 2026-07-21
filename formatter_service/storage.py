"""Cloud Storage persistence for asynchronous export jobs and artifacts."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path

from .models import FormatterTask


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


def _idempotency_object_name(transcript_id: str, idempotency_key: str) -> str:
    digest = hashlib.sha256(f"{transcript_id}:{idempotency_key}".encode("utf-8")).hexdigest()
    return f"exports/idempotency/{digest}.txt"


def _content_type(format_name: str) -> str:
    if format_name == "DOCX":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/pdf"