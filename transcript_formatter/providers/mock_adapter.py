"""MockAdapter (ATIA §4.10, D10.3).

Returns canned, deterministic responses so the full test suite runs without any
live API calls. Two modes, checked in order:

1. In-memory ``responses`` keyed by ``request_id`` (highest priority).
2. Fixture files in ``fixtures_dir`` named ``<request_id>.json``.

If neither has an entry, a deterministic echo response is returned so tests that
don't care about content still exercise the pipeline. Set ``strict=True`` to
raise on an unknown ``request_id`` instead (useful for replay tests).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .adapter import CallRequest, CallResponse, ProviderError

_DEFAULT_FIXTURES = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "provider_responses"


class MockAdapter:
    name = "mock"

    def __init__(
        self,
        responses: Optional[dict[str, CallResponse]] = None,
        fixtures_dir: Optional[Path] = None,
        strict: bool = False,
        healthy: bool = True,
    ) -> None:
        self._responses = dict(responses or {})
        self._fixtures_dir = Path(fixtures_dir) if fixtures_dir else _DEFAULT_FIXTURES
        self._strict = strict
        self._healthy = healthy
        self.calls: list[CallRequest] = []  # recorded for assertions

    def call(self, request: CallRequest) -> CallResponse:
        self.calls.append(request)
        request_id = request.get("request_id", "")

        if request_id in self._responses:
            return self._responses[request_id]

        fixture = self._fixtures_dir / f"{request_id}.json"
        if fixture.exists():
            return json.loads(fixture.read_text(encoding="utf-8"))

        if self._strict:
            raise ProviderError(f"MockAdapter has no canned response for request_id={request_id!r}")

        # Deterministic echo — no clocks, no randomness, so replay is stable.
        prompt = request.get("prompt", "")
        return CallResponse(
            raw_output=f"MOCK::{request_id}",
            parsed_output={"echo": prompt[:200], "request_id": request_id},
            tokens_used={"input": len(prompt.split()), "output": 1, "cached": 0},
            latency_ms=0,
            provider=self.name,
            model=f"mock-{request.get('model_hint', 'sonnet')}",
            finish_reason="stop",
        )

    def supports_model(self, model_hint: str) -> bool:
        return True

    def health_check(self) -> bool:
        return self._healthy
