from formatter_service.models import validate_formatter_task


def task_payload() -> dict[str, object]:
    return {
        "jobId": "job-001",
        "request": {
            "contractVersion": "2026-07-21",
            "transcriptId": "transcript-001",
            "renderModel": {
                "transcriptId": "transcript-001",
                "lines": [{"content": "Q. Where were you?"}],
            },
            "formats": ["DOCX", "PDF"],
            "idempotencyKey": "request-001",
        },
    }


def test_validates_contract_compatible_task() -> None:
    task = validate_formatter_task(task_payload())

    assert task.job_id == "job-001"
    assert task.transcript_id == "transcript-001"


def test_rejects_transcript_mismatch() -> None:
    payload = task_payload()
    request = payload["request"]
    assert isinstance(request, dict)
    render_model = request["renderModel"]
    assert isinstance(render_model, dict)
    render_model["transcriptId"] = "different-transcript"

    try:
        validate_formatter_task(payload)
    except ValueError as error:
        assert str(error) == "export request transcript id must match the render model"
    else:
        raise AssertionError("expected task validation failure")
