from datetime import UTC, datetime

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
    def __init__(self, claimed: bool = False) -> None:
        self.claimed = claimed
        self.deleted = False

    def upload_from_string(self, *_arguments, **_keyword_arguments) -> None:
        if self.claimed:
            raise PreconditionFailed("already claimed")
        self.claimed = True

    def delete(self) -> None:
        if not self.claimed:
            raise NotFound("not found")
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


def test_processing_lease_uses_conditional_create_and_release() -> None:
    blob = FakeLeaseBlob()
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)

    assert store.claim_processing("job-001") is True
    assert store.claim_processing("job-001") is False

    store.release_processing("job-001")

    assert blob.deleted is True


def test_missing_processing_lease_can_be_released() -> None:
    blob = FakeLeaseBlob()
    store = CloudStorageExportStore.__new__(CloudStorageExportStore)
    store._bucket = FakeBucket(blob)

    store.release_processing("job-001")
