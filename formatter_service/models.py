"""Validation for the private Cloud Tasks worker envelope."""

from __future__ import annotations

from dataclasses import dataclass

EXPORT_SERVICE_CONTRACT_VERSION = "2026-07-21"
_FORMATS = frozenset({"DOCX", "PDF"})


@dataclass(frozen=True)
class FormatterTask:
    job_id: str
    transcript_id: str
    idempotency_key: str
    request: dict[str, object]


def validate_formatter_task(payload: object) -> FormatterTask:
    if not isinstance(payload, dict):
        raise ValueError("formatter task must be an object")

    job_id = payload.get("jobId")
    request = payload.get("request")
    if not isinstance(job_id, str) or not job_id.strip():
        raise ValueError("formatter task requires a job id")
    if not isinstance(request, dict):
        raise ValueError("formatter task requires an export request")
    if request.get("contractVersion") != EXPORT_SERVICE_CONTRACT_VERSION:
        raise ValueError("export request uses an unsupported contract version")

    transcript_id = request.get("transcriptId")
    render_model = request.get("renderModel")
    formats = request.get("formats")
    idempotency_key = request.get("idempotencyKey")
    if not isinstance(transcript_id, str) or not transcript_id.strip():
        raise ValueError("export request requires a transcript id")
    if not isinstance(render_model, dict) or render_model.get("transcriptId") != transcript_id:
        raise ValueError("export request transcript id must match the render model")
    if not isinstance(render_model.get("lines"), list) or not render_model["lines"]:
        raise ValueError("export request requires rendered transcript content")
    if not isinstance(formats, list) or not formats or len(set(formats)) != len(formats):
        raise ValueError("export request requires unique output formats")
    if any(not isinstance(format_name, str) or format_name not in _FORMATS for format_name in formats):
        raise ValueError("export request requires valid output formats")
    if not isinstance(idempotency_key, str) or not idempotency_key.strip():
        raise ValueError("export request requires an idempotency key")

    # Optional/default-off certified section data. When present it must be an object
    # (the renderer reads its fields); its detailed shape is validated by the renderer.
    certified = request.get("certified")
    if certified is not None and not isinstance(certified, dict):
        raise ValueError("export request certified section data must be an object")

    return FormatterTask(
        job_id=job_id,
        transcript_id=transcript_id,
        idempotency_key=idempotency_key,
        request=request,
    )