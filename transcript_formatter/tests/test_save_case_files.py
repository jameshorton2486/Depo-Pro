"""
Tests for _resolve_audio_path audio resolution logic in _save_case_files.
"""
from __future__ import annotations

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

pytest.importorskip("tkinter", reason="tkinter not available in headless environment")


def _make_app_stub(audio_path: str = "", session_audio: str = ""):
    """Create a minimal stub with the fields _resolve_audio_path needs."""
    from main import DepoProToolsApp

    stub = MagicMock(spec=DepoProToolsApp)
    stub._audio_var = MagicMock()
    stub._audio_var.get.return_value = audio_path
    stub._session = {"audio_path": session_audio}
    stub._save_session = MagicMock()
    # Bind the real method to the stub
    stub._resolve_audio_path = DepoProToolsApp._resolve_audio_path.__get__(stub, type(stub))
    return stub


def test_resolve_audio_path_returns_existing_primary(tmp_path):
    """If _audio_var points to a real file, return it immediately."""
    f = tmp_path / "test.mp3"
    f.write_bytes(b"\x00")
    app = _make_app_stub(audio_path=str(f))
    result, err = app._resolve_audio_path()
    assert result == f
    assert err == ""


def test_resolve_audio_path_falls_back_to_session(tmp_path):
    """If _audio_var is stale but session has valid path, use session."""
    f = tmp_path / "fallback.mp3"
    f.write_bytes(b"\x00")
    app = _make_app_stub(audio_path="/nonexistent/path.mp3", session_audio=str(f))
    result, err = app._resolve_audio_path()
    assert result == f
    assert err == ""


def test_resolve_audio_path_prompts_user_when_missing(tmp_path):
    """When no path resolves, filedialog is invoked."""
    f = tmp_path / "located.mp3"
    f.write_bytes(b"\x00")
    app = _make_app_stub(audio_path="/bad/path.mp3", session_audio="/also/bad.mp3")
    with patch("main.filedialog") as mock_fd:
        mock_fd.askopenfilename.return_value = str(f)
        result, err = app._resolve_audio_path()
    assert result == f
    assert err == ""
    app._audio_var.set.assert_called_once_with(str(f))
    app._save_session.assert_called_once_with("audio_path", str(f))


def test_resolve_audio_path_user_cancels():
    """If user cancels the dialog, return (None, reason)."""
    app = _make_app_stub(audio_path="/bad/path.mp3")
    with patch("main.filedialog") as mock_fd:
        mock_fd.askopenfilename.return_value = ""
        result, err = app._resolve_audio_path()
    assert result is None
    assert "cancelled" in err.lower()
