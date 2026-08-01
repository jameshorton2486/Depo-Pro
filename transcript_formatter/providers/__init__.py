"""Provider abstraction for the Transcript Intelligence Engine (ATIA §4.10).

Depo-Pro code never depends on a vendor SDK directly. It depends on the
``ProviderAdapter`` interface and asks for a vendor-neutral model hint
("opus" | "sonnet" | "haiku"). Swapping providers is a configuration change,
never a pipeline-code change.
"""

from .adapter import (
    CallRequest,
    CallResponse,
    ProviderAdapter,
    ProviderError,
    ProviderUnavailableError,
    MODEL_HINTS,
)
from .mock_adapter import MockAdapter
from .registry import ProviderRegistry

__all__ = [
    "CallRequest",
    "CallResponse",
    "ProviderAdapter",
    "ProviderError",
    "ProviderUnavailableError",
    "MODEL_HINTS",
    "MockAdapter",
    "ProviderRegistry",
]
