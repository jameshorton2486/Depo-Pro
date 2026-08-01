"""ProviderAdapter interface (ATIA §4.10, D10.1).

Every AI provider implements this one interface. The rest of the system never
imports ``anthropic``/``openai``/etc. directly — it depends only on the shapes
below and asks for a vendor-neutral ``model_hint``.
"""

from __future__ import annotations

from typing import Protocol, TypedDict, runtime_checkable


# Vendor-neutral model hints. Depo-Pro asks for a tier, never a vendor model ID.
#   "opus"   → best quality (judgment-heavy specialties)
#   "sonnet" → balanced (structural specialties)
#   "haiku"  → fast/cheap (near-deterministic specialties)
MODEL_HINTS = ("opus", "sonnet", "haiku")


class CallRequest(TypedDict, total=False):
    """A single, fully-composed request to a provider.

    ``prompt`` is the already-composed prompt (system + user assembled by the
    PromptRegistry). ``context_envelope`` is carried through for logging/replay
    only — adapters must not mutate it. ``request_id`` is derived from a hash of
    the input and makes calls idempotent/replayable.
    """

    prompt: str
    context_envelope: dict
    model_hint: str          # one of MODEL_HINTS
    max_tokens: int
    temperature: float
    request_id: str
    timeout_seconds: int


class CallResponse(TypedDict, total=False):
    """A provider-agnostic response. Adapters normalize their vendor payload
    into this shape so downstream code never sees vendor specifics."""

    raw_output: str          # the model's raw text output
    parsed_output: dict      # provider-agnostic parsed form (best effort)
    tokens_used: dict        # {"input": int, "output": int, "cached": int}
    latency_ms: int
    provider: str            # "anthropic" | "openai" | "mock" | ...
    model: str               # actual model ID used
    finish_reason: str


class ProviderError(Exception):
    """Base class for provider-adapter failures (auth, request, parse)."""


class ProviderUnavailableError(ProviderError):
    """Raised when a provider fails its health check or has no model for a hint.

    The ``ProviderRegistry`` treats this as a signal to fail over to the next
    configured provider.
    """


@runtime_checkable
class ProviderAdapter(Protocol):
    """The single interface every AI provider must implement."""

    name: str

    def call(self, request: CallRequest) -> CallResponse:
        """Execute one request. Raises ``ProviderError`` on failure."""
        ...

    def supports_model(self, model_hint: str) -> bool:
        """True if this adapter can serve the given vendor-neutral hint."""
        ...

    def health_check(self) -> bool:
        """Cheap liveness probe. False (or raising) triggers registry failover."""
        ...
