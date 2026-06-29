"""
app.py — Depo-Pro Tools launcher.

Run this file to start the application:
    python app.py

Tabs:
  1. Transcribe — audio/video upload, Deepgram pipeline, auto-format
  2. Format     — rules engine, AI correction, Word track changes
  3. Build      — administrative pages, export
  4. Train      — rule learning from bad/good examples
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

# Ensure required directories exist before startup
for _dir in ("temp", "output", "logs"):
    _path = os.path.join(_HERE, _dir)
    os.makedirs(_path, exist_ok=True)

from main import DepoProToolsApp

if __name__ == "__main__":
    app = DepoProToolsApp()
    app.mainloop()
