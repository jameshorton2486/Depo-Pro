import json
from datetime import UTC, datetime, timedelta

from google.api_core.exceptions import NotFound, PreconditionFailed

from formatter_service.storage import CloudStorageExportStore


class FakeCredentials:
    valid = False
    token = None
    service_account_email = "depo-pro-formatter@example.test"

    def refresh(self, _request) -> None:
        self.valid = True
        self.token = "runtime-access-token"


class FakeBlob:
    def __init__(self) -> None:
        self.arguments = None

    def generate_signed_url(self, **arguments) -> str:
        self.arguments = arguments
        return "https://storage.example.test/signed"


class FakeLeaseBlob:
    def __init__(self, claimed: bool = False, updated: datetime | None = None, content: str = "existing-lease") -> None:
        self.claimed = claimed
        self.content = content if claimed else ""
        self.deleted = False
        self.updated = updated
        self.generation = 7
        self.uploads = 0

    def reload(self) -> None:
        if not self.claimed:
            raise NotFound("not found")

    def download_as_text(self, **keyword_arguments) -> str:
        if not self.claimed:
            raise NotFound("not found")
        expected = keyword_arguments.get("if_generation_match")
        if expected is not None and expected != self.generation:
            raise PreconditionFailed("generation changed")
        return self.content

    def upload_from_string(self, content, *_arguments, **keyword_arguments) -> None:
        expected = keyword_arguments.get("if_generation_match")
        if expected == 0 and self.claimed:
            raise PreconditionFailed("already claimed")
        if expected not in (None, 0) and (not self.claimed or expected != self.generation):
            raise PreconditionFailed("generation changed")
        self.claimed = True
        self.content = content
        self.generation += 1
        self.uploads += 1

    def delete(self, **keyword_arguments) -> None:
        if not self.claimed:
            raise NotFound("not found")
        expected = keyword_arguments.get("if_generation_match")
        if expected is not None and expected != self.generation:
            raise PreconditionFailed("generation changed")
        self.claimed = False
        self.deleted = True


class FakeBucket:
    def __init__(self, blob: FakeBlob) -> None:
        self._blob = blob

    def blob(self, _object_name: str) -> FakeBlob:
        return self._blob


def test_signed_url_uses_runtime_identity_for_iam_signing() -> None:
    blob = FakeBlob()
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._credentials = FakeCredentials()
    store._bucket = FakeBucket(blob)
    expires_at = datetime(2026, 7, 21, tzinfo=UTC)

    url = store.signed_download_url("exports/artifacts/job/transcript.docx", expires_at)

    assert url == "https://storage.example.test/signed"
    assert blob.arguments == {
        "expiration": expires_at,
        "version": "v4",
        "method": "GET",
        "service_account_email": "depo-pro-formatter@example.test",
        "access_token": "runtime-access-token",
    }


def test_processing_lease_uses_conditional_create_renewal_and_owned_release() -> None:
    blob = FakeLeaseBlob()
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)

    lease_token = store.claim_processing("job-001")
    assert lease_token is not None
    assert store.claim_processing("job-001") is None
    assert store.renew_processing("job-001", lease_token) is True

    store.release_processing("job-001", "different-owner")
    assert blob.deleted is False

    store.release_processing("job-001", lease_token)
    assert blob.deleted is True


def test_missing_processing_lease_can_be_released() -> None:
    blob = FakeLeaseBlob()
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)

    store.release_processing("job-001", "lease-token")


def test_stale_processing_lease_is_reclaimed(monkeypatch) -> None:
    now = datetime(2026, 7, 21, 12, 0, tzinfo=UTC)
    blob = FakeLeaseBlob(claimed=True, updated=now - timedelta(minutes=11))
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)
    monkeypatch.setattr("formatter_service.storage.datetime", FixedDatetime)

    lease_token = store.claim_processing("job-001")

    assert lease_token is not None
    assert blob.claimed is True
    assert blob.content == lease_token


def test_rejected_job_does_not_overwrite_completed_job() -> None:
    completed = {
        "job": {
            "jobId": "job-001",
            "transcriptId": "transcript-001",
            "status": "COMPLETED",
            "artifacts": [{"format": "DOCX"}],
            "error": None,
        }
    }
    blob = FakeLeaseBlob(claimed=True, content=json.dumps(completed))
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)

    result = store.write_rejected_job(
        "job-001",
        "transcript-001",
        "malformed payload",
        datetime(2026, 7, 21, tzinfo=UTC),
    )

    assert result["status"] == "COMPLETED"
    assert blob.uploads == 0


class FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return datetime(2026, 7, 21, 12, 0, tzinfo=tz)
