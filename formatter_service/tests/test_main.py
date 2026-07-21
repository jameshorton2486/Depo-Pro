from fastapi.testclient import TestClient

from formatter_service.main import create_app


def test_health_endpoint_reports_service_status() -> None:
    response = TestClient(create_app()).get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"



class FakeStore:
    rejected: list[tuple[str, str, str]] = []

    def __init__(self, _bucket_name: str) -> None:
        pass

    def write_rejected_job(self, job_id, transcript_id, error, _updated_at):
        self.rejected.append((job_id, transcript_id, error))
        return {"jobId": job_id, "transcriptId": transcript_id, "status": "FAILED", "artifacts": [], "error": error}


def test_malformed_named_task_is_persisted_and_acknowledged(monkeypatch) -> None:
    FakeStore.rejected = []
    monkeypatch.setenv("EXPORT_ARTIFACT_BUCKET", "synthetic-exports")
    monkeypatch.setattr("formatter_service.main.CloudStorageExportStore", FakeStore)

    response = TestClient(create_app()).post("/tasks/format", json={"jobId": "job-invalid", "request": {"transcriptId": "transcript-001"}})

    assert response.status_code == 200
    assert response.json()["status"] == "FAILED"
    assert FakeStore.rejected[0][0:2] == ("job-invalid", "transcript-001")
