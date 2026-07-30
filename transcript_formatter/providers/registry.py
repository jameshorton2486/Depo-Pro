"""ProviderRegistry (ATIA §4.10, D10.4).

Selects a ``ProviderAdapter`` for a call and fails over when the preferred
provider is unhealthy or cannot serve the requested model hint. Selection order
(ATIA §4.10):

    1. Per-specialty pin        (explicit override for this call)
    2. Per-case configuration   (case.ai_provider)
    3. Global default
    4. Availability             (skip providers failing health_check / hint)

The registry itself calls ``adapter.call``; callers depend only on the registry,
never on a concrete adapter.
"""

from __future__ import annotations

from typing import Optional

from .adapter import (
    CallRequest,
    CallResponse,
    ProviderAdapter,
    ProviderError,
    ProviderUnavailableError,
)


class ProviderRegistry:
    def __init__(
        self,
        adapters: dict[str, ProviderAdapter],
        default: str,
        specialty_pins: Optional[dict[str, str]] = None,
    ) -> None:
        if default not in adapters:
            raise ValueError(f"default provider {default!r} is not registered")
        self._adapters = dict(adapters)
        self._default = default
        self._specialty_pins = dict(specialty_pins or {})

    def register(self, adapter: ProviderAdapter) -> None:
        self._adapters[adapter.name] = adapter

    def resolve_order(
        self,
        model_hint: str,
        *,
        specialty: Optional[str] = None,
        case_provider: Optional[str] = None,
    ) -> list[str]:
        """Return the provider names to try, most-preferred first, filtered to
        those that both exist and support ``model_hint``. Health is checked at
        call time (a provider can go unhealthy between resolve and call)."""
        preference: list[str] = []
        for candidate in (self._specialty_pins.get(specialty or ""), case_provider, self._default):
            if candidate and candidate not in preference:
                preference.append(candidate)
        # Append any remaining registered providers as last-resort fallbacks.
        for name in self._adapters:
            if name not in preference:
                preference.append(name)

        return [
            name
            for name in preference
            if name in self._adapters and self._adapters[name].supports_model(model_hint)
        ]

    def call(
        self,
        request: CallRequest,
        *,
        specialty: Optional[str] = None,
        case_provider: Optional[str] = None,
    ) -> CallResponse:
        hint = request.get("model_hint", "sonnet")
        order = self.resolve_order(hint, specialty=specialty, case_provider=case_provider)
        if not order:
            raise ProviderUnavailableError(
                f"No registered provider supports model hint {hint!r}"
            )

        errors: list[str] = []
        for name in order:
            adapter = self._adapters[name]
            try:
                if not adapter.health_check():
                    errors.append(f"{name}: failed health_check")
                    continue
                return adapter.call(request)
            except ProviderError as exc:
                # A provider-level failure is a failover signal, not a hard stop.
                errors.append(f"{name}: {exc}")
                continue

        raise ProviderUnavailableError(
            "All providers failed for hint "
            f"{hint!r} (tried {order}): " + "; ".join(errors)
        )
