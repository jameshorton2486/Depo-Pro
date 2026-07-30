"""AnthropicAdapter (ATIA §4.10, D10.2).

Wraps the Anthropic SDK and normalizes it into the vendor-neutral
``CallResponse``. This is the ONLY module in the codebase permitted to import
``anthropic`` (acceptance criterion §4.10). It mirrors the call mechanics
already proven in ``ai_tools.py`` (SDK ``messages.create``, text-block join,
240s default timeout) so it is feature-complete against the current path.

Model-hint → model-ID mapping is env-overridable and injectable, so swapping
model IDs (as new generations ship) is configuration, never code. Defaults use
the current-generation IDs; override per deployment via ``TIE_MODEL_*`` env vars
or the ``model_map`` constructor argument.
"""

from __future__ import annotations

import os
import time
from typing import Optional

from .adapter import (
    CallRequest,
    CallResponse,
    ProviderError,
    ProviderUnavailableError,
    MODEL_HINTS,
)

# Vendor-neutral hint → Anthropic model ID. Env-overridable so a deployment can
# pin/roll model IDs without a code change.
DEFAULT_MODEL_MAP = {
    "opus": os.getenv("TIE_MODEL_OPUS", "claude-opus-4-6"),
    "sonnet": os.getenv("TIE_MODEL_SONNET", "claude-sonnet-4-6"),
    "haiku": os.getenv("TIE_MODEL_HAIKU", "claude-3-5-haiku-20241022"),
}

_DEFAULT_TIMEOUT_SECONDS = 240


class AnthropicAdapter:
    name = "anthropic"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_map: Optional[dict[str, str]] = None,
        client: Optional[object] = None,
    ) -> None:
        # Lazy import so importing the providers package never requires the SDK
        # (e.g. test runs that only use MockAdapter).
        self._api_key = (api_key or os.getenv("ANTHROPIC_API_KEY", "")).strip()
        self._model_map = dict(model_map or DEFAULT_MODEL_MAP)
        self._client = client  # injectable for tests

    # ── ProviderAdapter ──────────────────────────────────────────────────────

    def supports_model(self, model_hint: str) -> bool:
        return model_hint in self._model_map

    def health_check(self) -> bool:
        # A key must exist and be resolvable to a client. We intentionally do NOT
        # burn a live token here; a real network probe belongs to a scheduled
        # healthcheck, not the hot path.
        if not self._api_key and self._client is None:
            return False
        try:
            self._get_client()
            return True
        except Exception:
            return False

    def call(self, request: CallRequest) -> CallResponse:
        hint = request.get("model_hint", "sonnet")
        if hint not in self._model_map:
            raise ProviderUnavailableError(
                f"AnthropicAdapter has no model for hint {hint!r} (known: {sorted(self._model_map)})"
            )
        model = self._model_map[hint]
        client = self._get_client()

        started = time.monotonic()
        try:
            response = client.messages.create(
                model=model,
                max_tokens=int(request.get("max_tokens", 16000)),
                temperature=float(request.get("temperature", 0.0)),
                messages=[{"role": "user", "content": request.get("prompt", "")}],
            )
        except Exception as exc:  # anthropic.APIError and friends
            raise ProviderError(f"Anthropic API error: {exc}") from exc
        latency_ms = int((time.monotonic() - started) * 1000)

        raw_output = self._extract_text(response)
        if not raw_output:
            raise ProviderError("Anthropic response contained no usable text.")

        usage = getattr(response, "usage", None)
        tokens_used = {
            "input": getattr(usage, "input_tokens", 0) or 0,
            "output": getattr(usage, "output_tokens", 0) or 0,
            "cached": getattr(usage, "cache_read_input_tokens", 0) or 0,
        }

        return CallResponse(
            raw_output=raw_output,
            parsed_output={},  # specialty callers parse; adapter stays content-agnostic
            tokens_used=tokens_used,
            latency_ms=latency_ms,
            provider=self.name,
            model=getattr(response, "model", model),
            finish_reason=getattr(response, "stop_reason", "") or "",
        )

    # ── internals ──────────────────────────────────────────────────────────

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self._api_key:
            raise ProviderUnavailableError("ANTHROPIC_API_KEY is not set.")
        import anthropic  # lazy: only the adapter depends on the SDK
        self._client = anthropic.Anthropic(api_key=self._api_key, timeout=float(_DEFAULT_TIMEOUT_SECONDS))
        return self._client

    @staticmethod
    def _extract_text(response) -> str:
        blocks = getattr(response, "content", []) or []
        texts = [getattr(b, "text", "") for b in blocks if getattr(b, "type", "") == "text"]
        return "\n".join(t for t in texts if t and t.strip()).strip()


__all__ = ["AnthropicAdapter", "DEFAULT_MODEL_MAP", "MODEL_HINTS"]
