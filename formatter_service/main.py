"""Private Cloud Run application invoked only by Cloud Tasks."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from .storage import CloudStorageExportStore
from .worker import RetryableFormatterError, process_formatter_task


def create_app() -> FastAPI:
    app = FastAPI(title="Depo-Pro Formatter Service", docs_url=None, redoc_url=None)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok", "formatterVersion": os.environ.get("FORMATTER_VERSION", "unknown")}

    @app.post("/tasks/format")
    def format_task(payload: dict[str, object]) -> JSONResponse:
        bucket_name = os.environ.get("EXPORT_ARTIFACT_BUCKET")
        if not bucket_name:
            raise HTTPException(status_code=500, detail="EXPORT_ARTIFACT_BUCKET is not configured")

        try:
            ttl_seconds = int(os.environ.get("EXPORT_ARTIFACT_URL_TTL_SECONDS", "900"))
            if ttl_seconds <= 0:
                raise ValueError
        except ValueError as error:
            raise HTTPException(status_code=500, detail="EXPORT_ARTIFACT_URL_TTL_SECONDS must be positive") from error

        try:
            with tempfile.TemporaryDirectory(prefix="depo-pro-export-") as temporary_directory:
                result = process_formatter_task(
                    payload,
                    CloudStorageExportStore(bucket_name),
                    Path(temporary_directory),
                    ttl_seconds,
                )
        except RetryableFormatterError as error:
            return JSONResponse(error.result.job, status_code=500)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

        return JSONResponse(result.job, status_code=200)

    return app


app = create_app()