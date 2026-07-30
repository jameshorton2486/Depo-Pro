"""Tests for the provider abstraction (ATIA §4.10, D10.1-D10.4).

The whole suite runs against MockAdapter + an injected fake Anthropic client —
no live API calls (acceptance criterion §4.10)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from providers.adapter import CallRequest, ProviderError, ProviderUnavailableError
from providers.mock_adapter import MockAdapter
from providers.registry import ProviderRegistry
from providers.anthropic_adapter import AnthropicAdapter


def _req(**over) -> CallRequest:
    base: CallRequest = {
        "prompt": "hello world",
        "context_envelope": {},
        "model_hint": "sonnet",
        "max_tokens": 100,
        "temperature": 0.0,
        "request_id": "req_test",
        "timeout_seconds": 30,
    }
    base.update(over)
    return base


# ── MockAdapter ──────────────────────────────────────────────────────────

def test_mock_echo_is_deterministic():
    mock = MockAdapter()
    r1 = mock.call(_req())
    r2 = mock.call(_req())
    assert r1 == r2
    assert r1["provider"] == "mock"
    assert r1["raw_output"] == "MOCK::req_test"


def test_mock_canned_response_by_request_id():
    canned = {"req_x": {"raw_output": "CANNED", "provider": "mock", "model": "m"}}
    mock = MockAdapter(responses=canned)
    assert mock.call(_req(request_id="req_x"))["raw_output"] == "CANNED"


def test_mock_strict_raises_on_unknown_request():
    mock = MockAdapter(strict=True)
    with pytest.raises(ProviderError):
        mock.call(_req(request_id="unknown"))


def test_mock_records_calls():
    mock = MockAdapter()
    mock.call(_req(request_id="a"))
    mock.call(_req(request_id="b"))
    assert [c["request_id"] for c in mock.calls] == ["a", "b"]


# ── AnthropicAdapter (injected fake client, no network) ────────────────────

def _fake_anthropic_client(text="RESULT"):
    def create(**kwargs):
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text=text)],
            usage=SimpleNamespace(input_tokens=11, output_tokens=7, cache_read_input_tokens=0),
            model=kwargs["model"],
            stop_reason="end_turn",
        )

    return SimpleNamespace(messages=SimpleNamespace(create=create))


def test_anthropic_adapter_normalizes_response():
    adapter = AnthropicAdapter(client=_fake_anthropic_client("HELLO"))
    resp = adapter.call(_req(model_hint="opus"))
    assert resp["raw_output"] == "HELLO"
    assert resp["provider"] == "anthropic"
    assert resp["tokens_used"] == {"input": 11, "output": 7, "cached": 0}
    assert resp["finish_reason"] == "end_turn"


def test_anthropic_adapter_maps_model_hint():
    captured = {}

    def create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text="x")],
            usage=None, model=kwargs["model"], stop_reason="end_turn",
        )

    adapter = AnthropicAdapter(
        client=SimpleNamespace(messages=SimpleNamespace(create=create)),
        model_map={"opus": "OPUS_ID", "sonnet": "SONNET_ID", "haiku": "HAIKU_ID"},
    )
    adapter.call(_req(model_hint="haiku"))
    assert captured["model"] == "HAIKU_ID"


def test_anthropic_adapter_unknown_hint_raises():
    adapter = AnthropicAdapter(client=_fake_anthropic_client())
    with pytest.raises(ProviderUnavailableError):
        adapter.call(_req(model_hint="gpt5"))


def test_anthropic_adapter_empty_output_raises():
    adapter = AnthropicAdapter(client=_fake_anthropic_client(text="   "))
    with pytest.raises(ProviderError):
        adapter.call(_req())


def test_anthropic_health_check_false_without_key():
    adapter = AnthropicAdapter(api_key="")
    assert adapter.health_check() is False


# ── ProviderRegistry ───────────────────────────────────────────────────────

def test_registry_uses_default_then_falls_over_on_unhealthy():
    unhealthy = MockAdapter(healthy=False)
    unhealthy.name = "primary"
    healthy = MockAdapter()
    healthy.name = "backup"

    registry = ProviderRegistry(
        adapters={"primary": unhealthy, "backup": healthy},
        default="primary",
    )
    resp = registry.call(_req())
    assert resp["provider"] == "backup"  # failed over from unhealthy primary
    assert len(healthy.calls) == 1  # fell over to backup
    assert len(unhealthy.calls) == 0  # never called (health gate)


def test_registry_specialty_pin_wins():
    a = MockAdapter(); a.name = "a"
    b = MockAdapter(); b.name = "b"
    registry = ProviderRegistry(
        adapters={"a": a, "b": b},
        default="a",
        specialty_pins={"qa_split": "b"},
    )
    registry.call(_req(), specialty="qa_split")
    assert len(b.calls) == 1 and len(a.calls) == 0


def test_registry_skips_providers_that_do_not_support_hint():
    class HaikuOnly(MockAdapter):
        def supports_model(self, model_hint):
            return model_hint == "haiku"

    picky = HaikuOnly(); picky.name = "picky"
    general = MockAdapter(); general.name = "general"
    registry = ProviderRegistry(
        adapters={"picky": picky, "general": general},
        default="picky",
    )
    registry.call(_req(model_hint="opus"))
    assert len(general.calls) == 1 and len(picky.calls) == 0


def test_registry_all_fail_raises():
    class Broken(MockAdapter):
        def call(self, request):
            raise ProviderError("boom")

    b1 = Broken(); b1.name = "b1"
    registry = ProviderRegistry(adapters={"b1": b1}, default="b1")
    with pytest.raises(ProviderUnavailableError):
        registry.call(_req())


def test_registry_no_provider_for_hint_raises():
    class HaikuOnly(MockAdapter):
        def supports_model(self, model_hint):
            return model_hint == "haiku"

    only = HaikuOnly(); only.name = "only"
    registry = ProviderRegistry(adapters={"only": only}, default="only")
    with pytest.raises(ProviderUnavailableError):
        registry.call(_req(model_hint="opus"))
