"""
Depo-Pro Tools — main.py
Light/neutral professional UI. Tabs: Transcribe → Format → Build → Train.
"""

from __future__ import annotations

import json
import csv
import os
import re
import sys
import threading
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk
from dotenv import load_dotenv

# ── Path wiring ────────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent
for _p in [str(_HERE)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

load_dotenv(dotenv_path=_HERE / ".env")

from app_logging import get_logger
from ai_tools import (
    CUSTOM_AI_RULES_PATH,
    analyze_training_example,
    extract_job_config_from_doc,
    extract_proper_nouns_from_docx,
    extract_proper_nouns_from_pdf,
    run_ai_review_tool,
    run_ai_tool,
)
from docx_exporter import export_to_docx
from file_loader import load_transcript
from formatter import CUSTOM_FORMATTER_RULES_PATH, format_transcript

LOGGER = get_logger(__name__)
SESSION_PATH = _HERE / "session_state.json"

# ── Theme ──────────────────────────────────────────────────────────────────────
ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

BG_APP       = "#F5F6FA"
BG_CARD      = "#FFFFFF"
BG_INPUT     = "#F0F2F7"
BORDER_LIGHT = "#DDE1EA"
BORDER_MID   = "#C5CADE"
NAVY         = "#1C3557"
NAVY_HOVER   = "#24446E"
GOLD         = "#B8972E"
GOLD_LIGHT   = "#D4AC47"
GREEN        = "#1E7E4A"
AMBER        = "#C07800"
RED          = "#C0392B"
BLUE         = "#2563EB"
TEXT_DARK    = "#1A1A2E"
TEXT_MID     = "#4A5568"
TEXT_MUTED   = "#8896AB"
TEXT_WHITE   = "#FFFFFF"

F_TITLE  = ("Segoe UI", 20, "bold")
F_HEAD   = ("Segoe UI", 13, "bold")
F_LABEL  = ("Segoe UI", 11)
F_SMALL  = ("Segoe UI", 10)
F_MONO   = ("Courier New", 12)
F_MONO_S = ("Courier New", 11)


# ── Reusable widgets ───────────────────────────────────────────────────────────

class SectionLabel(ctk.CTkLabel):
    def __init__(self, parent, text, **kw):
        super().__init__(parent, text=text.upper(),
                         font=("Segoe UI", 9, "bold"), text_color=TEXT_MUTED,
                         anchor="w", **kw)


class Card(ctk.CTkFrame):
    def __init__(self, parent, **kw):
        super().__init__(parent, fg_color=BG_CARD, corner_radius=8,
                         border_width=1, border_color=BORDER_LIGHT, **kw)


class PrimaryBtn(ctk.CTkButton):
    def __init__(self, parent, **kw):
        defaults = dict(fg_color=NAVY, hover_color=NAVY_HOVER,
                        text_color=TEXT_WHITE, font=("Segoe UI", 11, "bold"),
                        corner_radius=6, height=36)
        defaults.update(kw)
        super().__init__(parent, **defaults)


class GoldBtn(ctk.CTkButton):
    """
    Primary action button.
    Default: gold (#B8972E). Hover: navy blue (#1B3A6B).
    Binding-based hover because customtkinter's hover_color
    only fires on mouseenter, not on mouseleave restore.
    """
    GOLD = "#B8972E"
    BLUE = "#1B3A6B"

    def __init__(self, parent, **kw):
        # Set both fg and hover to GOLD initially —
        # we override hover via bind so hover_color here is a fallback only
        defaults = dict(
            fg_color=self.GOLD,
            hover_color=self.BLUE,
            text_color=TEXT_WHITE,
            font=("Segoe UI", 12, "bold"),
            corner_radius=6,
            height=42,
        )
        defaults.update(kw)
        super().__init__(parent, **defaults)
        # Bind manual hover for reliable gold→blue→gold cycle
        self.bind("<Enter>", self._on_enter, add="+")
        self.bind("<Leave>", self._on_leave, add="+")

    def _on_enter(self, _event=None):
        self.configure(fg_color=self.BLUE)

    def _on_leave(self, _event=None):
        self.configure(fg_color=self.GOLD)


class SecondaryBtn(ctk.CTkButton):
    def __init__(self, parent, **kw):
        defaults = dict(
            fg_color="transparent",
            border_width=1,
            border_color=BORDER_MID,
            text_color=TEXT_DARK,
            hover_color=BG_INPUT,
            font=F_LABEL,
            corner_radius=6,
            height=34,
        )
        defaults.update(kw)
        super().__init__(parent, **defaults)


class StatusBadge(ctk.CTkFrame):
    _COLORS = {
        "draft":      (AMBER,  "Draft"),
        "ready":      (GREEN,  "Ready for Export"),
        "processing": (BLUE,   "Processing\u2026"),
        "error":      (RED,    "Error"),
    }

    def __init__(self, parent, **kw):
        super().__init__(parent, fg_color="transparent", **kw)
        self._dot = ctk.CTkLabel(self, text="\u25cf",
                                 font=("Segoe UI", 11), width=18)
        self._dot.grid(row=0, column=0, padx=(0, 4))
        self._lbl = ctk.CTkLabel(self, text="Draft",
                                 font=F_SMALL, text_color=TEXT_MID)
        self._lbl.grid(row=0, column=1)
        self.set("draft")

    def set(self, s: str):
        c, t = self._COLORS.get(s, (TEXT_MUTED, s.title()))
        self._dot.configure(text_color=c)
        self._lbl.configure(text=t)


class LogBox(ctk.CTkTextbox):
    def __init__(self, parent, **kw):
        super().__init__(parent, font=F_MONO_S, fg_color=BG_INPUT,
                         text_color=TEXT_DARK, border_width=1,
                         border_color=BORDER_LIGHT, **kw)
        self.configure(state="disabled")

    def append(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        self.configure(state="normal")
        self.insert("end", f"[{ts}]  {msg}\n")
        self.see("end")
        self.configure(state="disabled")

    def clear(self):
        self.configure(state="normal")
        self.delete("1.0", "end")
        self.configure(state="disabled")


class ExhibitManagerDialog(ctk.CTkToplevel):
    """
    Modal dialog for managing deposition exhibits.
    """

    INITIAL_ROWS = 10

    def __init__(self, parent, existing_exhibits: list):
        super().__init__(parent)
        self.title("Exhibit Manager")
        self.geometry("720x620")
        self.resizable(True, True)
        self.grab_set()
        self.result = None
        self._rows = []

        self.columnconfigure(0, weight=1)
        self.rowconfigure(4, weight=1)

        ctk.CTkLabel(
            self, text="Exhibit Manager",
            font=("Inter", 18, "bold"),
            text_color="#1a2744"
        ).grid(row=0, column=0, sticky="w", padx=20, pady=(16, 4))

        ctk.CTkLabel(
            self,
            text="Enter exhibit number and description. "
                 "Page references are added after transcript review.",
            font=("Inter", 12),
            text_color="#6b7280",
            justify="left"
        ).grid(row=1, column=0, sticky="w", padx=20, pady=(0, 10))

        toolbar = ctk.CTkFrame(self, fg_color="transparent")
        toolbar.grid(row=2, column=0, sticky="ew", padx=20, pady=(0, 8))

        ctk.CTkButton(
            toolbar,
            text="⬆  Import CSV",
            command=self._import_csv,
            width=140, height=32,
            fg_color="#1a2744", hover_color="#2d3f6b",
            font=("Inter", 12)
        ).pack(side="left", padx=(0, 8))

        ctk.CTkButton(
            toolbar,
            text="✦  AI Detect from Transcript",
            command=self._ai_detect_exhibits,
            width=200, height=32,
            fg_color="#b45309", hover_color="#92400e",
            font=("Inter", 12)
        ).pack(side="left", padx=(0, 8))

        ctk.CTkLabel(
            toolbar,
            text="AI reads the transcript and fills exhibit numbers automatically.",
            font=("Inter", 11),
            text_color="#6b7280"
        ).pack(side="left", padx=(8, 0))

        headers = ctk.CTkFrame(self, fg_color="#f1f5f9", corner_radius=6)
        headers.grid(row=3, column=0, sticky="ew", padx=20, pady=(0, 4))
        headers.columnconfigure(0, weight=0)
        headers.columnconfigure(1, weight=0)
        headers.columnconfigure(2, weight=1)

        ctk.CTkLabel(headers, text="#", font=("Inter", 12, "bold"),
                     text_color="#1a2744", width=40).grid(
            row=0, column=0, padx=(12, 4), pady=6, sticky="w")
        ctk.CTkLabel(headers, text="Exhibit No.", font=("Inter", 12, "bold"),
                     text_color="#1a2744", width=100).grid(
            row=0, column=1, padx=4, pady=6, sticky="w")
        ctk.CTkLabel(headers, text="Description", font=("Inter", 12, "bold"),
                     text_color="#1a2744").grid(
            row=0, column=2, padx=(4, 12), pady=6, sticky="w")

        self._scroll = ctk.CTkScrollableFrame(
            self, fg_color="#ffffff",
            border_width=1, border_color="#e2e8f0",
            corner_radius=8)
        self._scroll.grid(row=4, column=0, sticky="nsew",
                          padx=20, pady=(0, 8))
        self._scroll.columnconfigure(0, weight=0)
        self._scroll.columnconfigure(1, weight=0)
        self._scroll.columnconfigure(2, weight=1)
        self._scroll.columnconfigure(3, weight=0)

        seed = existing_exhibits if existing_exhibits else []
        for i in range(max(self.INITIAL_ROWS, len(seed))):
            existing = seed[i] if i < len(seed) else None
            self._add_row(existing)

        add_frame = ctk.CTkFrame(self, fg_color="transparent")
        add_frame.grid(row=5, column=0, sticky="w", padx=20, pady=(0, 8))
        ctk.CTkButton(
            add_frame,
            text="＋  Add Row",
            command=lambda: self._add_row(None),
            width=120, height=30,
            fg_color="transparent",
            border_width=1,
            border_color="#1a2744",
            text_color="#1a2744",
            hover_color="#e8edf5",
            font=("Inter", 12)
        ).pack(side="left")

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.grid(row=6, column=0, sticky="e", padx=20, pady=(0, 16))
        ctk.CTkButton(
            btn_row, text="Cancel",
            command=self._on_cancel,
            width=100, height=36,
            fg_color="#e2e8f0", text_color="#374151",
            hover_color="#cbd5e1",
            font=("Inter", 13)
        ).pack(side="left", padx=(0, 8))
        ctk.CTkButton(
            btn_row, text="Save Exhibits",
            command=self._on_ok,
            width=130, height=36,
            fg_color="#1a2744", hover_color="#2d3f6b",
            font=("Inter", 13)
        ).pack(side="left")

    def _add_row(self, existing=None):
        """Append one exhibit row to the scrollable frame."""
        idx = len(self._rows)
        row_num = idx + 1

        num_var = ctk.StringVar(value=getattr(existing, "number", ""))
        desc_var = ctk.StringVar(value=getattr(existing, "description", ""))
        self._rows.append((num_var, desc_var))

        ctk.CTkLabel(
            self._scroll, text=str(row_num),
            font=("Inter", 12), text_color="#9ca3af",
            width=36
        ).grid(row=idx, column=0, padx=(8, 4), pady=3, sticky="w")

        ctk.CTkEntry(
            self._scroll, textvariable=num_var,
            width=100, height=28,
            font=("Courier New", 12),
            fg_color="#f8fafc", border_color="#cbd5e1",
            placeholder_text="1"
        ).grid(row=idx, column=1, padx=4, pady=3, sticky="w")

        ctk.CTkEntry(
            self._scroll, textvariable=desc_var,
            height=28,
            font=("Inter", 12),
            fg_color="#f8fafc", border_color="#cbd5e1",
            placeholder_text="Exhibit description..."
        ).grid(row=idx, column=2, padx=4, pady=3, sticky="ew")

        ctk.CTkButton(
            self._scroll, text="✕",
            command=lambda i=idx: self._delete_row(i),
            width=28, height=28,
            fg_color="transparent",
            text_color="#ef4444",
            hover_color="#fee2e2",
            font=("Inter", 13)
        ).grid(row=idx, column=3, padx=(4, 8), pady=3)

    def _delete_row(self, idx: int):
        """Clear a row; empty rows are filtered on save."""
        try:
            self._rows[idx][0].set("")
            self._rows[idx][1].set("")
        except IndexError:
            pass

    def _import_csv(self):
        """Import exhibit rows from CSV."""
        path = filedialog.askopenfilename(
            title="Select Exhibit CSV",
            filetypes=[("CSV Files", "*.csv"), ("All Files", "*.*")])
        if not path:
            return

        try:
            with open(path, newline="", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    num = (row.get("Number") or row.get("Exhibit")
                           or row.get("No") or row.get("#") or "").strip()
                    desc = (row.get("Description") or row.get("Desc")
                            or row.get("description") or "").strip()
                    if num or desc:
                        rows.append((num, desc))

            if not rows:
                messagebox.showwarning(
                    "No Data",
                    "CSV had no usable rows.\nExpected columns: Number, Description")
                return

            self._rows.clear()
            for widget in self._scroll.winfo_children():
                widget.destroy()

            from spec_engine.models import ExhibitEntry
            for num, desc in rows:
                self._add_row(ExhibitEntry(number=num, description=desc))

            while len(self._rows) < self.INITIAL_ROWS:
                self._add_row(None)

        except Exception as exc:
            messagebox.showerror("CSV Error", str(exc))

    def _ai_detect_exhibits(self):
        """Use AI to detect exhibit numbers from transcript text."""
        if hasattr(self.master, "_build_preview"):
            transcript_text = self.master._build_preview.get("1.0", "end").strip()
        else:
            transcript_text = ""
        if not transcript_text and hasattr(self.master, "_preview"):
            transcript_text = self.master._preview.get("1.0", "end").strip()

        if not transcript_text:
            messagebox.showwarning(
                "No Transcript",
                "No transcript text found.\nTranscribe or load a transcript first.")
            return

        if not os.getenv("ANTHROPIC_API_KEY", "").strip():
            messagebox.showwarning(
                "API Key Required",
                "Set ANTHROPIC_API_KEY to use AI exhibit detection.")
            return

        def _worker():
            try:
                import anthropic
                from anthropic.types import MessageParam

                client = anthropic.Anthropic(
                    api_key=os.getenv("ANTHROPIC_API_KEY"))
                prompt = (
                    "You are a legal transcript parser. "
                    "Read the transcript below and extract every exhibit "
                    "that was marked, offered, or admitted.\n"
                    "Return ONLY a JSON array. Each element: "
                    "{\"number\": \"1\", \"description\": \"\"}\n"
                    "Use the exhibit number exactly as stated. "
                    "Leave description blank if not stated in transcript.\n"
                    "Return [] if no exhibits found.\n\n"
                    "TRANSCRIPT:\n" + transcript_text[:12000]
                )
                messages: list[MessageParam] = [
                    {"role": "user", "content": prompt}
                ]
                resp = client.messages.create(
                    model="claude-sonnet-4-6",
                    max_tokens=1000,
                    messages=messages,
                )
                raw = resp.content[0].text.strip()
                raw = re.sub(r"^```json\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
                found = json.loads(raw)
            except Exception as exc:
                found = []
                LOGGER.warning("AI exhibit detect failed: %s", exc)

            def _update():
                if not found:
                    messagebox.showinfo(
                        "AI Result",
                        "No exhibits found in transcript.")
                    return

                from spec_engine.models import ExhibitEntry
                self._rows.clear()
                for widget in self._scroll.winfo_children():
                    widget.destroy()
                for item in found:
                    self._add_row(ExhibitEntry(
                        number=str(item.get("number", "")),
                        description=str(item.get("description", "")),
                    ))
                while len(self._rows) < self.INITIAL_ROWS:
                    self._add_row(None)
                messagebox.showinfo(
                    "AI Result",
                    f"{len(found)} exhibit(s) detected.\n"
                    "Add descriptions for any that are blank.")

            self.after(0, lambda: _update())

        threading.Thread(target=_worker, daemon=True).start()

    def _on_ok(self):
        from spec_engine.models import ExhibitEntry
        results = []
        for num_var, desc_var in self._rows:
            num = num_var.get().strip()
            desc = desc_var.get().strip()
            if num or desc:
                results.append(ExhibitEntry(number=num, description=desc))
        self.result = results
        self.destroy()

    def _on_cancel(self):
        self.result = None
        self.destroy()


# ── Main application ───────────────────────────────────────────────────────────

class DepoProToolsApp(ctk.CTk):

    def __init__(self):
        super().__init__()
        self.title("Depo-Pro Tools")
        self.geometry("1240x840")
        self.minsize(1050, 720)
        self.configure(fg_color=BG_APP)

        self._transcript_text: str = ""
        self._undo_stack: list[str] = []
        self._output_paths: dict = {}
        self._proper_nouns: list[str] = []
        self._kw_doc_paths: list[str] = []
        self._extracted_fields: dict = {}
        self._last_ufm_output_path: str = ""
        self._last_pdf_output_path: str = ""
        self._last_ascii_output_path: str = ""
        self._last_run_dir = None
        self._last_spec_flags: list = []
        self._flag_resolved: dict = {}
        self._job_exhibits: list = []
        self._pending_rule: dict | None = None
        self._pending_corrections: str | None = None
        self._pending_source: str = ""
        self._last_diff: str = ""
        self._doc_extraction_in_progress = False

        self._session = self._load_session()
        self._extracted_fields = dict(self._session.get("extracted_fields", {}))
        self._last_ufm_output_path = self._session.get("last_ufm_output_path", "")
        self._last_pdf_output_path = self._session.get("last_pdf_output_path", "")
        self._last_ascii_output_path = self._session.get("last_ascii_output_path", "")
        _saved_auto = self._session.get("last_auto_docx_path", "")
        if _saved_auto and os.path.exists(_saved_auto):
            self._output_paths["auto_docx"] = _saved_auto
        raw_resolved = self._session.get("flag_resolved", {})
        self._flag_resolved = {k: set(v) for k, v in raw_resolved.items()}
        # Restore persisted proper nouns, keyword doc paths, and output paths
        self._proper_nouns = list(self._session.get("proper_nouns", []))
        self._kw_doc_paths = [
            p for p in self._session.get("kw_doc_paths", [])
            if os.path.exists(p)
        ]
        saved_output_paths = self._session.get("output_paths", {})
        for k, v in saved_output_paths.items():
            if v and os.path.exists(v):
                self._output_paths[k] = v
        self._build_ui()
        self.after(100, self._restore_session_ui)
        self.after(200, lambda: self._check_api_keys())

    # ── Session ────────────────────────────────────────────────────────────────

    def _load_session(self) -> dict:
        try:
            if SESSION_PATH.exists():
                return json.loads(SESSION_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
        return {}

    def _save_session(self, key: str, value):
        self._session[key] = value
        try:
            SESSION_PATH.write_text(
                json.dumps(self._session, indent=2), encoding="utf-8")
        except Exception:
            pass

    def _restore_session_ui(self):
        """Restore UI widgets from persisted session state after build."""
        if self._kw_doc_paths:
            self._refresh_kw_list()
        if self._proper_nouns:
            try:
                self._nouns_box.delete("1.0", "end")
                self._nouns_box.insert("1.0", "\n".join(self._proper_nouns))
            except Exception:
                pass
            try:
                self._pn_box.delete("1.0", "end")
                self._pn_box.insert("1.0", "\n".join(self._proper_nouns))
            except Exception:
                pass
        if self._extracted_fields:
            try:
                self._populate_data_table(
                    self._extracted_fields, self._proper_nouns)
                self._save_case_btn.configure(state="normal")
            except Exception:
                pass

    # ── Top-level layout ───────────────────────────────────────────────────────

    def _build_ui(self):
        self._build_topbar()
        body = ctk.CTkFrame(self, fg_color=BG_APP, corner_radius=0)
        body.pack(fill="both", expand=True)
        body.columnconfigure(1, weight=1)
        body.rowconfigure(0, weight=1)
        self._build_sidebar(body)
        self._build_main(body)

    def _build_topbar(self):
        bar = ctk.CTkFrame(self, fg_color=NAVY, height=56, corner_radius=0)
        bar.pack(fill="x")
        bar.pack_propagate(False)
        ctk.CTkLabel(bar, text="Depo-Pro Tools",
                     font=("Segoe UI", 17, "bold"),
                     text_color=TEXT_WHITE).pack(side="left", padx=24, pady=14)
        ctk.CTkLabel(bar, text="SA Legal Solutions",
                     font=F_SMALL, text_color="#8EB4D8").pack(side="left")
        self._top_badge = StatusBadge(bar)
        self._top_badge.pack(side="right", padx=20, pady=14)

    def _build_sidebar(self, parent):
        sb = ctk.CTkFrame(parent, fg_color=NAVY, width=210, corner_radius=0)
        sb.grid(row=0, column=0, sticky="nsew")
        sb.grid_propagate(False)

        ctk.CTkLabel(sb, text="WORKFLOW",
                     font=("Segoe UI", 9, "bold"),
                     text_color="#607D98").pack(
            anchor="w", padx=20, pady=(24, 8))

        self._nav_btns: list[ctk.CTkButton] = []
        for i, label in enumerate(
                ["1  Transcribe", "2  Format", "3  Build", "4  Train"]):
            btn = ctk.CTkButton(
                sb, text=label, font=("Segoe UI", 12),
                fg_color="transparent", hover_color=NAVY_HOVER,
                text_color=TEXT_WHITE, anchor="w", height=42, corner_radius=6,
                command=lambda idx=i: self._switch_tab(idx))
            btn.pack(fill="x", padx=12, pady=2)
            self._nav_btns.append(btn)

        ctk.CTkFrame(sb, fg_color="#2E4F70", height=1).pack(
            fill="x", padx=16, pady=14)

        ctk.CTkLabel(sb, text="API STATUS",
                     font=("Segoe UI", 9, "bold"),
                     text_color="#607D98").pack(
            anchor="w", padx=20, pady=(0, 6))
        self._dg_lbl = ctk.CTkLabel(
            sb, text="\u25cf  Deepgram",
            font=F_SMALL, text_color="#607D98", anchor="w")
        self._dg_lbl.pack(anchor="w", padx=20, pady=2)
        self._ai_lbl = ctk.CTkLabel(
            sb, text="\u25cf  Anthropic",
            font=F_SMALL, text_color="#607D98", anchor="w")
        self._ai_lbl.pack(anchor="w", padx=20, pady=2)

        ctk.CTkFrame(sb, fg_color="#2E4F70", height=1).pack(
            fill="x", padx=16, pady=14)
        ctk.CTkLabel(sb, text="SAVE LOCATION",
                     font=("Segoe UI", 9, "bold"),
                     text_color="#607D98").pack(
            anchor="w", padx=20, pady=(0, 6))
        self._save_dir_var = ctk.StringVar(
            value=self._session.get(
                "save_dir",
                str(Path.home() / "Documents" / "Depositions")))
        ctk.CTkEntry(sb, textvariable=self._save_dir_var, font=F_SMALL,
                     fg_color="#2A4A6B", text_color=TEXT_WHITE,
                     border_color="#2E4F70", height=28).pack(
            fill="x", padx=12, pady=(0, 4))
        SecondaryBtn(sb, text="Browse\u2026",
                     border_color="#2E4F70", text_color="#8EB4D8",
                     hover_color=NAVY_HOVER, height=28,
                     command=self._browse_save_dir).pack(fill="x", padx=12)

    def _build_main(self, parent):
        main = ctk.CTkFrame(parent, fg_color=BG_APP, corner_radius=0)
        main.grid(row=0, column=1, sticky="nsew")
        main.columnconfigure(0, weight=1)
        main.rowconfigure(0, weight=1)

        self._tabs: list[ctk.CTkFrame] = []
        for _ in range(4):
            f = ctk.CTkFrame(main, fg_color=BG_APP, corner_radius=0)
            f.grid(row=0, column=0, sticky="nsew")
            f.grid_remove()
            self._tabs.append(f)

        self._build_tab_transcribe(self._tabs[0])
        self._build_tab_format(self._tabs[1])
        self._build_tab_build(self._tabs[2])
        self._build_tab_train(self._tabs[3])
        self._switch_tab(0)

    def _switch_tab(self, idx: int):
        for i, btn in enumerate(self._nav_btns):
            btn.configure(fg_color=GOLD if i == idx else "transparent")
        for i, f in enumerate(self._tabs):
            if i == idx:
                f.grid()
            else:
                f.grid_remove()

    # ── Tab 1 — Transcribe ─────────────────────────────────────────────────────

    def _build_tab_transcribe(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(1, weight=1)

        hdr = ctk.CTkFrame(parent, fg_color="transparent")
        hdr.grid(row=0, column=0, columnspan=2, sticky="ew",
                 padx=24, pady=(20, 8))
        ctk.CTkLabel(hdr, text="Transcribe",
                     font=F_TITLE, text_color=TEXT_DARK).pack(side="left")
        ctk.CTkLabel(hdr,
                     text=" \u2014 FFmpeg normalize \u2192 "
                          "Deepgram Nova-3 \u2192 auto-format",
                     font=F_SMALL, text_color=TEXT_MUTED).pack(
            side="left", pady=(8, 0))

        ctk.CTkButton(
            hdr, text="New Job",
            font=("Segoe UI", 11, "bold"),
            fg_color=RED, hover_color="#992222",
            text_color=TEXT_WHITE, corner_radius=6,
            width=110, height=32,
            command=self._reset_job,
        ).pack(side="right", padx=(8, 0))

        # ── Left column ────────────────────────────────────────────────────────
        left = ctk.CTkScrollableFrame(
            parent, fg_color=BG_APP, scrollbar_button_color=BORDER_MID)
        left.grid(row=1, column=0, sticky="nsew", padx=(24, 6), pady=(0, 8))
        left.columnconfigure(0, weight=1)

        # Audio file card
        ac = Card(left)
        ac.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        ac.columnconfigure(0, weight=1)
        ctk.CTkLabel(ac, text="Audio / Video File",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, columnspan=2, sticky="w", padx=16, pady=(14, 4))
        ctk.CTkLabel(
            ac,
            text="MP3 \u00b7 MP4 \u00b7 WAV \u00b7 M4A \u00b7 MOV \u00b7 "
                 "AVI \u00b7 MKV \u00b7 FLAC \u00b7 OGG \u00b7 AAC \u00b7 "
                 "WMA \u00b7 WEBM",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=1, column=0, columnspan=2, sticky="w", padx=16, pady=(0, 8))
        self._audio_var = ctk.StringVar(
            value=self._session.get("audio_path", ""))
        ctk.CTkEntry(ac, textvariable=self._audio_var, font=F_LABEL,
                     fg_color=BG_INPUT, border_color=BORDER_LIGHT, height=36,
                     placeholder_text="No file selected\u2026").grid(
            row=2, column=0, sticky="ew", padx=(16, 8), pady=(0, 14))
        PrimaryBtn(ac, text="Browse\u2026", width=90,
                   command=self._browse_audio).grid(
            row=2, column=1, padx=(0, 16), pady=(0, 14))

        # Case info card
        cc = Card(left)
        cc.grid(row=1, column=0, sticky="ew", pady=(0, 12))
        cc.columnconfigure(1, weight=1)
        ctk.CTkLabel(cc, text="Case Information",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, columnspan=2, sticky="w", padx=16, pady=(14, 4))
        ctk.CTkLabel(cc, text="Optional \u2014 appears in all output file headers",
                     font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=1, column=0, columnspan=2, sticky="w", padx=16, pady=(0, 8))
        self._case_vars: dict[str, ctk.StringVar] = {}
        for r, (label, key) in enumerate([
            ("Case Style",    "case_name"),
            ("Cause Number",  "cause_number"),
            ("Deponent Name", "deponent_name"),
            ("Date",          "deposition_date"),
        ], start=2):
            ctk.CTkLabel(cc, text=label, font=F_LABEL, text_color=TEXT_MID,
                         anchor="w", width=116).grid(
                row=r, column=0, sticky="w", padx=(16, 8), pady=4)
            v = ctk.StringVar(value="")
            ctk.CTkEntry(cc, textvariable=v, font=F_LABEL,
                         fg_color=BG_INPUT, border_color=BORDER_LIGHT,
                         height=32).grid(
                row=r, column=1, sticky="ew", padx=(0, 16), pady=4)
            self._case_vars[key] = v
        ctk.CTkLabel(cc, text="").grid(row=6, pady=4)

        # Deepgram settings card
        dc = Card(left)
        dc.grid(row=2, column=0, sticky="ew", pady=(0, 12))
        dc.columnconfigure(1, weight=1)
        ctk.CTkLabel(dc, text="Deepgram Settings",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, columnspan=3, sticky="w", padx=16, pady=(14, 10))

        self._dg_vars: dict[str, ctk.StringVar] = {}
        for r, (lbl, key, opts) in enumerate([
            ("Model",         "model",
             ["nova-3", "nova-3-medical", "nova-2", "nova-2-medical"]),
            ("Audio Quality", "quality",
             ["Clean (good/excellent audio)", "Default (fair audio)",
              "Aggressive (noisy/poor audio)"]),
        ], start=1):
            ctk.CTkLabel(dc, text=lbl, font=F_LABEL, text_color=TEXT_MID,
                         anchor="w", width=130).grid(
                row=r, column=0, sticky="w", padx=(16, 8), pady=5)
            v = ctk.StringVar(value=self._session.get(f"dg_{key}", opts[0]))
            ctk.CTkComboBox(dc, variable=v, values=opts, state="readonly",
                            font=F_LABEL, fg_color=BG_INPUT,
                            border_color=BORDER_LIGHT, button_color=NAVY,
                            height=32).grid(
                row=r, column=1, columnspan=2,
                sticky="ew", padx=(0, 16), pady=5)
            self._dg_vars[key] = v

        ctk.CTkLabel(dc, text="Utterance Split (s)", font=F_LABEL,
                     text_color=TEXT_MID, anchor="w", width=130).grid(
            row=3, column=0, sticky="w", padx=(16, 8), pady=5)
        self._utt_var = ctk.StringVar(
            value=str(self._session.get("utt_split", "0.9")))
        ctk.CTkEntry(dc, textvariable=self._utt_var, font=F_LABEL,
                     fg_color=BG_INPUT, border_color=BORDER_LIGHT,
                     height=32, width=72).grid(
            row=3, column=1, sticky="w", padx=(0, 8), pady=5)
        ctk.CTkLabel(dc, text="0.9 s default for speaker turns",
                     font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=3, column=2, sticky="w", pady=5)

        ctk.CTkLabel(dc, text="Confidence Flag", font=F_LABEL,
                     text_color=TEXT_MID, anchor="w", width=130).grid(
            row=4, column=0, sticky="w", padx=(16, 8), pady=(5, 14))
        self._conf_var = ctk.StringVar(
            value=str(self._session.get("conf_threshold", "0.85")))
        ctk.CTkEntry(dc, textvariable=self._conf_var, font=F_LABEL,
                     fg_color=BG_INPUT, border_color=BORDER_LIGHT,
                     height=32, width=72).grid(
            row=4, column=1, sticky="w", padx=(0, 8), pady=(5, 14))
        ctk.CTkLabel(dc, text="Words below this confidence are flagged",
                     font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=4, column=2, sticky="w", pady=(5, 14))

        # ── Right column ───────────────────────────────────────────────────────
        right = ctk.CTkScrollableFrame(
            parent, fg_color=BG_APP, scrollbar_button_color=BORDER_MID)
        right.grid(row=1, column=1, sticky="nsew",
                   padx=(6, 24), pady=(0, 8))
        right.columnconfigure(0, weight=1)

        kc = Card(right)
        kc.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        kc.columnconfigure(0, weight=1)
        ctk.CTkLabel(kc, text="Keyword Documents & Terms",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, sticky="w", padx=16, pady=(14, 4))
        ctk.CTkLabel(
            kc,
            text="Upload Notice of Deposition, reporter notes, or any document\n"
                 "containing names. AI extracts proper nouns automatically.\n"
                 "Supports PDF, Word (.docx), and TXT. Upload multiple files.",
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").grid(
            row=1, column=0, sticky="w", padx=16, pady=(0, 10))

        self._kw_list_box = ctk.CTkTextbox(
            kc, height=64, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT,
            text_color=TEXT_MUTED, state="disabled")
        self._kw_list_box.grid(row=2, column=0, sticky="ew",
                               padx=16, pady=(0, 6))

        kw_btn_row = ctk.CTkFrame(kc, fg_color="transparent")
        kw_btn_row.grid(row=3, column=0, sticky="w", padx=16, pady=(0, 8))
        PrimaryBtn(kw_btn_row, text="+ Add Files", width=110,
                   command=self._browse_kw_docs).pack(
            side="left", padx=(0, 8))
        PrimaryBtn(kw_btn_row, text="Extract Data", width=110,
                   command=self._extract_data_to_session).pack(
            side="left", padx=(0, 8))
        SecondaryBtn(kw_btn_row, text="Clear All", width=80,
                     command=self._clear_kw_docs).pack(side="left")

        self._extract_status_lbl = ctk.CTkLabel(
            kc,
            text="",
            font=("Segoe UI", 9), text_color=GREEN, anchor="w")
        self._extract_status_lbl.grid(row=4, column=0, sticky="w",
                                      padx=16, pady=(0, 6))

        right_panel = ctk.CTkFrame(right, fg_color="transparent")
        right_panel.grid(row=1, column=0, sticky="nsew", pady=(0, 12))
        right_panel.columnconfigure(0, weight=1)

        # Hidden UFM extraction table used as the internal field store.
        self._ufm_table_frame, self._ufm_field_vars = \
            self._build_extraction_table(right_panel)
        # Keep the table widgets alive without showing them in the UI.

        self._data_table_label = ctk.CTkLabel(
            right_panel,
            text="EXTRACTED CASE DATA",
            font=("Segoe UI", 10, "bold"),
            text_color=TEXT_MUTED,
            anchor="w",
        )
        self._data_table_scroll = ctk.CTkScrollableFrame(
            right_panel,
            fg_color=BG_INPUT,
            border_width=1,
            border_color=BORDER_LIGHT,
            height=320,
        )
        self._data_table_scroll.columnconfigure(0, weight=0)
        self._data_table_scroll.columnconfigure(1, weight=1)

        action_row = ctk.CTkFrame(right_panel, fg_color="transparent")
        action_row.pack(fill="x", padx=0, pady=(6, 0))

        PrimaryBtn(
            action_row,
            text="  Save UFM Fields to Job Config",
            command=self._save_ufm_fields_to_job,
            height=34,
        ).pack(side="left", padx=(0, 8))

        self._save_case_btn = GoldBtn(
            action_row,
            text="  Save Case Files",
            command=self._save_case_files,
            height=34,
            state="disabled",
        )
        self._save_case_btn.pack(side="left", padx=(0, 8))

        self._save_fields_status_lbl = ctk.CTkLabel(
            action_row,
            text="",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        )
        self._save_fields_status_lbl.pack(side="left")

        # Keep the flat noun textbox but make it collapsible / smaller
        ctk.CTkLabel(right_panel,
            text="— or paste / type terms directly (one per line) —",
            font=F_SMALL, text_color=TEXT_MUTED).pack(pady=(8, 2))
        self._nouns_box = ctk.CTkTextbox(
            right_panel, height=80, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._nouns_box.pack(fill="x", padx=0, pady=(0, 8))
        self._kw_textbox = self._nouns_box

        # Progress card
        pc = Card(parent)
        pc.grid(row=2, column=0, columnspan=2, sticky="ew",
                padx=24, pady=(0, 16))
        pc.columnconfigure(0, weight=1)

        inner = ctk.CTkFrame(pc, fg_color="transparent")
        inner.grid(row=0, column=0, sticky="ew", padx=16, pady=(12, 6))
        inner.columnconfigure(0, weight=1)

        self._prog_var = ctk.DoubleVar(value=0)
        ctk.CTkProgressBar(
            inner, variable=self._prog_var, height=10, corner_radius=5,
            fg_color=BG_INPUT, progress_color=GOLD).grid(
            row=0, column=0, sticky="ew", padx=(0, 12))
        self._prog_lbl = ctk.CTkLabel(
            inner, text="Ready", font=F_SMALL,
            text_color=TEXT_MUTED, width=170)
        self._prog_lbl.grid(row=0, column=1, sticky="e")

        self._log = LogBox(pc, height=90)
        self._log.grid(row=1, column=0, sticky="ew", padx=16, pady=(0, 8))

        btn_row = ctk.CTkFrame(pc, fg_color="transparent")
        btn_row.grid(row=2, column=0, sticky="ew", padx=16, pady=(0, 14))

        self._start_btn = GoldBtn(
            btn_row, text="\u25b6  START TRANSCRIPTION",
            command=self._start_transcription)
        self._start_btn.pack(side="left", padx=(0, 10))

        self._open_folder_btn = SecondaryBtn(
            btn_row, text="Open Output Folder",
            state="disabled", command=self._open_output_folder)
        self._open_folder_btn.pack(side="left", padx=(0, 6))

        self._open_txt_btn = SecondaryBtn(
            btn_row, text="Open Transcript",
            state="disabled", command=self._open_transcript_file)
        self._open_txt_btn.pack(side="left")

        self._auto_docx_lbl = ctk.CTkLabel(
            btn_row,
            text="",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        )
        self._auto_docx_lbl.pack(side="left", padx=(12, 0))

    # ── Tab 2 — Format ─────────────────────────────────────────────────────────

    def _build_tab_format(self, parent):
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(0, weight=1)

        sb = ctk.CTkFrame(parent, fg_color=BG_CARD, width=250,
                          corner_radius=0, border_width=1,
                          border_color=BORDER_LIGHT)
        sb.grid(row=0, column=0, sticky="nsew")
        sb.grid_propagate(False)
        sb.columnconfigure(0, weight=1)

        SectionLabel(sb, "Actions").pack(anchor="w", padx=16, pady=(16, 8))

        ctk.CTkLabel(
            sb,
            text="Changes are NOT applied automatically.\n"
                 "Review pending result, then click Apply.",
            font=("Segoe UI", 9), text_color=AMBER,
            justify="left", wraplength=220,
        ).pack(anchor="w", padx=16, pady=(0, 6))

        PrimaryBtn(
            sb,
            text="⚡ Format Transcript",
            command=self._on_format_transcript_click,
            height=42,
        ).pack(fill="x", padx=12, pady=(3, 2))

        self._use_ai_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(
            sb,
            text="Use AI Enhancement  (optional)",
            variable=self._use_ai_var,
            text_color=TEXT_MID,
            font=ctk.CTkFont(size=11),
            height=24,
        ).pack(anchor="w", padx=20, pady=(0, 8))

        for lbl, cmd in [
            ("AI Legal Correction  (Legacy)", self._run_ai),
            ("Word Track Changes   (Legacy)", self._run_word_review),
        ]:
            PrimaryBtn(sb, text=lbl, command=cmd, height=34).pack(
                fill="x", padx=12, pady=2)

        ctk.CTkFrame(sb, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=12, pady=(10, 6))
        SectionLabel(sb, "Review Pending Changes").pack(
            anchor="w", padx=16, pady=(0, 4))

        self._pending_banner = ctk.CTkFrame(
            sb, fg_color=BG_INPUT, corner_radius=6,
            border_width=1, border_color=BORDER_MID)
        self._pending_banner.pack(fill="x", padx=12, pady=(0, 6))

        self._pending_count_lbl = ctk.CTkLabel(
            self._pending_banner,
            text="No pending corrections.",
            font=("Segoe UI", 9), text_color=TEXT_MUTED,
            wraplength=210, justify="left")
        self._pending_count_lbl.pack(anchor="w", padx=10, pady=7)

        self._apply_btn = GoldBtn(
            sb, text="Apply Corrections",
            command=self._apply_pending_corrections,
            state="disabled", height=38)
        self._apply_btn.pack(fill="x", padx=12, pady=(0, 3))

        self._discard_btn = SecondaryBtn(
            sb, text="Discard Changes",
            command=self._discard_pending_corrections,
            state="disabled", height=32)
        self._discard_btn.pack(fill="x", padx=12, pady=(0, 6))

        ctk.CTkFrame(sb, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=12, pady=10)
        SectionLabel(sb, "UFM Production").pack(anchor="w", padx=16, pady=(0, 6))
        GoldBtn(sb, text="⚖  Spec Process (UFM)",
                command=self._run_spec_process, height=44).pack(
            fill="x", padx=12, pady=(0, 4))
        ctk.CTkLabel(sb,
            text="Texas UFM court-ready DOCX.\nOpens job config dialog.",
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").pack(
            anchor="w", padx=16, pady=(0, 8))
        self._review_btn = SecondaryBtn(
            sb,
            text="  Review Changes (Diff)",
            command=self._open_diff_viewer,
            state="disabled",
            height=32,
        )
        self._review_btn.pack(fill="x", padx=12, pady=(0, 4))
        SecondaryBtn(sb, text="📂  Load Recent Job Config",
                     command=self._load_recent_job, height=32).pack(
            fill="x", padx=12, pady=(0, 8))

        self._undo_btn = SecondaryBtn(
            sb, text="Undo Last Action",
            command=self._undo_last, state="disabled")
        self._undo_btn.pack(fill="x", padx=12, pady=(3, 0))

        ctk.CTkFrame(sb, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=12, pady=14)
        SectionLabel(sb, "AI Configuration").pack(
            anchor="w", padx=16, pady=(0, 8))

        ctk.CTkLabel(sb, text="Proper Nouns", font=F_SMALL,
                     text_color=TEXT_MID, anchor="w").pack(
            anchor="w", padx=16, pady=(0, 4))
        self._pn_box = ctk.CTkTextbox(
            sb, height=130, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._pn_box.pack(fill="x", padx=12, pady=(0, 6))
        SecondaryBtn(sb, text="+ Import PDF / Word",
                     command=self._import_nouns_doc).pack(
            fill="x", padx=12, pady=(0, 8))

        ctk.CTkLabel(sb, text="Dash Style", font=F_SMALL,
                     text_color=TEXT_MID, anchor="w").pack(
            anchor="w", padx=16, pady=(0, 4))
        self._dash_var = ctk.StringVar(
            value=self._session.get("dash_style", "double-hyphen"))
        ctk.CTkComboBox(sb, values=["double-hyphen", "em-dash"],
                        variable=self._dash_var, state="readonly",
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32).pack(fill="x", padx=12, pady=(0, 8))

        ctk.CTkFrame(sb, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=12, pady=10)
        SectionLabel(sb, "Export").pack(anchor="w", padx=16, pady=(0, 8))
        for lbl, cmd in [
            ("Save DOCX",    self._save_docx),
            ("Save as Text", self._save_text),
        ]:
            SecondaryBtn(sb, text=lbl, command=cmd).pack(
                fill="x", padx=12, pady=3)

        ctk.CTkFrame(sb, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=12, pady=10)
        self._ai_key_lbl = ctk.CTkLabel(
            sb, text="\u25cf  Checking Anthropic\u2026",
            font=F_SMALL, text_color=TEXT_MUTED, anchor="w")
        self._ai_key_lbl.pack(anchor="w", padx=16, pady=(0, 12))

        right = ctk.CTkFrame(parent, fg_color=BG_APP, corner_radius=0)
        right.grid(row=0, column=1, sticky="nsew")
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        phdr = ctk.CTkFrame(right, fg_color="transparent")
        phdr.grid(row=0, column=0, sticky="ew", padx=20, pady=(16, 8))
        ctk.CTkLabel(phdr, text="Transcript Preview",
                     font=F_HEAD, text_color=TEXT_DARK).pack(side="left")
        self._fmt_badge = StatusBadge(phdr)
        self._fmt_badge.pack(side="right")

        self._preview = ctk.CTkTextbox(
            right, font=F_MONO, fg_color=BG_CARD, text_color=TEXT_DARK,
            border_width=1, border_color=BORDER_LIGHT, corner_radius=8,
            wrap="none")
        self._preview.grid(row=1, column=0, sticky="nsew",
                           padx=20, pady=(0, 16))

        if self._session.get("transcript"):
            self._load_preview(self._session["transcript"])

    # ── Tab 3 — Build ──────────────────────────────────────────────────────────

    def _build_tab_build(self, parent):
        parent.columnconfigure(0, weight=0)
        parent.columnconfigure(1, weight=1)
        parent.rowconfigure(0, weight=1)

        left = Card(parent)
        left.grid(row=0, column=0, sticky="nsew", padx=(24, 8), pady=24)
        left.columnconfigure(0, weight=1)

        ctk.CTkLabel(left, text="Administrative Pages",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, sticky="w", padx=16, pady=(14, 4))
        ctk.CTkLabel(
            left,
            text="Click in the preview to set your cursor,\n"
                 "then click a button to insert.",
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").grid(
            row=1, column=0, sticky="w", padx=16, pady=(0, 12))

        for r, (lbl, cmd) in enumerate([
            ("\U0001f4c4  Insert Title / Caption Page",     self._insert_title_page),
            ("\U0001f465  Insert Appearances Page",         self._insert_appearances),
            ("\U0001f4cb  Insert Index Page",               self._insert_index),
            ("\u270f\ufe0f  Insert Changes & Signature",   self._insert_changes),
            ("\U0001f3db\ufe0f  Insert Reporter's Certification",
             self._insert_certification),
        ], start=2):
            PrimaryBtn(left, text=lbl, command=cmd, anchor="w",
                       height=40).grid(
                row=r, column=0, sticky="ew", padx=12, pady=4)

        SectionLabel(left, "Exhibits").grid(
            row=7, column=0, sticky="w", padx=16, pady=(16, 6))
        self._exhibit_summary_lbl = ctk.CTkLabel(
            left,
            text="No exhibits added.",
            font=F_SMALL, text_color=TEXT_MUTED)
        self._exhibit_summary_lbl.grid(
            row=8, column=0, sticky="w", padx=16)

        PrimaryBtn(
            left,
            text="  Manage Exhibits...",
            command=self._open_exhibit_manager,
            height=36).grid(
            row=9, column=0, sticky="ew", padx=12, pady=(6, 14))

        right = ctk.CTkFrame(parent, fg_color=BG_APP, corner_radius=0)
        right.grid(row=0, column=1, sticky="nsew", padx=(8, 24), pady=24)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        ctk.CTkLabel(right, text="Document Preview",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, sticky="w", pady=(0, 8))
        self._build_preview = ctk.CTkTextbox(
            right, font=F_MONO, fg_color=BG_CARD, text_color=TEXT_DARK,
            border_width=1, border_color=BORDER_LIGHT, corner_radius=8,
            wrap="none")
        self._build_preview.grid(row=1, column=0, sticky="nsew")
        export_frame = ctk.CTkFrame(right, fg_color="transparent")
        export_frame.grid(row=2, column=0, sticky="ew", pady=(14, 0))
        export_frame.columnconfigure((0, 1, 2), weight=1)

        PrimaryBtn(
            export_frame,
            text="  Export UFM Word",
            command=self._export_ufm_docx,
            height=38,
        ).grid(row=0, column=0, sticky="ew", padx=(0, 4))

        PrimaryBtn(
            export_frame,
            text="  Export UFM PDF",
            command=self._export_ufm_pdf,
            height=38,
        ).grid(row=0, column=1, sticky="ew", padx=4)

        SecondaryBtn(
            export_frame,
            text="  Export ASCII .txt",
            command=self._export_ascii_txt,
            height=38,
        ).grid(row=0, column=2, sticky="ew", padx=(4, 0))

        self._export_status_lbl = ctk.CTkLabel(
            right,
            text="",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        )
        self._export_status_lbl.grid(
            row=3, column=0, sticky="w", pady=(4, 0))

        SecondaryBtn(
            right,
            text="  View Last Corrections Log",
            command=self._view_corrections_log,
        ).grid(row=4, column=0, sticky="w", pady=(4, 0))

        flag_section = Card(right)
        flag_section.grid(row=5, column=0, sticky="ew", pady=(16, 0))
        flag_section.columnconfigure(0, weight=1)

        flag_hdr = ctk.CTkFrame(flag_section, fg_color="transparent")
        flag_hdr.grid(row=0, column=0, sticky="ew", padx=12, pady=(10, 4))
        flag_hdr.columnconfigure(1, weight=1)

        ctk.CTkLabel(
            flag_hdr,
            text="  Scopist Flags",
            font=F_HEAD,
            text_color=TEXT_DARK,
        ).grid(row=0, column=0, sticky="w")

        self._flag_count_lbl = ctk.CTkLabel(
            flag_hdr,
            text="No flags — run Spec Process first",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        )
        self._flag_count_lbl.grid(row=0, column=1, sticky="e")

        self._flag_scroll = ctk.CTkScrollableFrame(
            flag_section,
            height=180,
            fg_color=BG_APP,
            border_width=0,
        )
        self._flag_scroll.grid(row=1, column=0, sticky="ew", padx=8, pady=(0, 8))
        self._flag_scroll.columnconfigure(0, weight=1)

        self._flag_placeholder = ctk.CTkLabel(
            self._flag_scroll,
            text="Flags will appear here after Spec Process completes.",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        )
        self._flag_placeholder.grid(row=0, column=0, padx=8, pady=16)

    # ── Tab 4 — Train ──────────────────────────────────────────────────────────

    def _build_tab_train(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(3, weight=1)

        hdr = ctk.CTkFrame(parent, fg_color="transparent")
        hdr.grid(row=0, column=0, sticky="ew", padx=24, pady=(20, 8))
        ctk.CTkLabel(hdr, text="Train", font=F_TITLE,
                     text_color=TEXT_DARK).pack(side="left")
        ctk.CTkLabel(
            hdr,
            text=" \u2014 paste incorrect text and the corrected version "
                 "to propose a rule",
            font=F_SMALL, text_color=TEXT_MUTED).pack(
            side="left", pady=(8, 0))

        inputs = ctk.CTkFrame(parent, fg_color="transparent")
        inputs.grid(row=1, column=0, sticky="ew", padx=24, pady=(0, 12))
        inputs.columnconfigure(0, weight=1)
        inputs.columnconfigure(1, weight=1)

        for col, (lbl, color, attr) in enumerate([
            ("Text With Mistakes", RED,   "_train_bad"),
            ("Corrected Text",     GREEN, "_train_good"),
        ]):
            c = ctk.CTkFrame(inputs, fg_color=BG_CARD, corner_radius=8,
                             border_width=2, border_color=color)
            c.grid(row=0, column=col, sticky="ew",
                   padx=(0 if col == 0 else 8, 0))
            c.columnconfigure(0, weight=1)
            ctk.CTkLabel(c, text=lbl, font=F_LABEL,
                         text_color=color, anchor="w").grid(
                row=0, column=0, sticky="w", padx=12, pady=(10, 4))
            box = ctk.CTkTextbox(
                c, height=130, font=F_LABEL, fg_color=BG_INPUT,
                border_width=1, border_color=BORDER_LIGHT,
                text_color=TEXT_DARK)
            box.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 10))
            setattr(self, attr, box)

        GoldBtn(parent, text="Analyze & Propose Rule",
                command=self._run_training_analysis).grid(
            row=2, column=0, sticky="w", padx=24, pady=(0, 12))

        rc = Card(parent)
        rc.grid(row=3, column=0, sticky="nsew", padx=24, pady=(0, 24))
        rc.columnconfigure(0, weight=1)
        rc.rowconfigure(1, weight=1)

        ctk.CTkLabel(rc, text="Analysis Result",
                     font=F_HEAD, text_color=TEXT_DARK).grid(
            row=0, column=0, sticky="w", padx=16, pady=(14, 8))
        self._result_box = ctk.CTkTextbox(
            rc, font=F_LABEL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._result_box.grid(row=1, column=0, sticky="nsew",
                              padx=16, pady=(0, 8))

        btn_row = ctk.CTkFrame(rc, fg_color="transparent")
        btn_row.grid(row=2, column=0, sticky="w", padx=16, pady=(0, 14))
        self._accept_btn = PrimaryBtn(
            btn_row, text="\u2713  Accept Rule",
            state="disabled", command=self._accept_rule)
        self._accept_btn.pack(side="left", padx=(0, 8))
        SecondaryBtn(btn_row, text="\u2717  Discard",
                     command=self._discard_rule).pack(side="left")

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _ui(self, fn, *a, **kw):
        self.after(0, lambda: fn(*a, **kw))

    def _set_progress(self, pct: float, label: str = ""):
        def _do():
            self._prog_var.set(pct / 100.0)
            if label:
                self._prog_lbl.configure(text=label)
        self._ui(_do)

    def _log_msg(self, msg: str):
        self._trace(f"[UI] {msg}")
        self._ui(self._log.append, msg)
        self._ui(self._prog_lbl.configure, text=msg[:80])

    def _trace(self, msg: str, level: str = "info"):
        try:
            print(msg, flush=True)
        except Exception:
            pass
        if level == "error":
            LOGGER.error("%s", msg)
        elif level == "warning":
            LOGGER.warning("%s", msg)
        else:
            LOGGER.info("%s", msg)

    def _load_preview(self, text: str):
        self._transcript_text = text
        boxes = []
        for attr in ("_preview", "_build_preview"):
            widget = getattr(self, attr, None)
            if widget is not None:
                boxes.append(widget)
        for box in boxes:
            try:
                box.configure(state="normal")
                box.delete("1.0", "end")
                box.insert("1.0", text or "")
                box.configure(state="disabled")
            except Exception:
                pass

    def _get_preview_text(self) -> str:
        return self._preview.get("1.0", "end").strip()

    def _push_undo(self, text: str):
        self._undo_stack.append(text)
        self._undo_btn.configure(state="normal")

    def _check_api_keys(self):
        dg = os.getenv("DEEPGRAM_API_KEY", "").strip()
        self._dg_lbl.configure(
            text="\u25cf  Deepgram  \u2713" if dg
            else "\u25cf  Deepgram \u2014 key missing",
            text_color=GREEN if dg else RED)

        ai = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self._ai_lbl.configure(
            text="\u25cf  Anthropic  \u2713" if ai
            else "\u25cf  Anthropic \u2014 key missing",
            text_color=GREEN if ai else RED)
        self._ai_key_lbl.configure(
            text=("\u25cf  Anthropic API key loaded" if ai
                  else "\u25cf  Anthropic key not set"),
            text_color=GREEN if ai else RED)

    # ── Transcription pipeline ─────────────────────────────────────────────────

    def _browse_audio(self):
        path = filedialog.askopenfilename(
            title="Select Audio or Video File",
            filetypes=[
                ("Audio/Video",
                 "*.mp3 *.wav *.m4a *.mp4 *.mov *.avi *.mkv "
                 "*.flac *.ogg *.aac *.wma *.webm"),
                ("All files", "*.*"),
            ])
        if path:
            self._audio_var.set(path)
            self._save_session("audio_path", path)

    def _browse_kw_docs(self):
        paths = filedialog.askopenfilenames(
            title="Select Keyword Documents",
            filetypes=[
                ("Documents", "*.pdf *.docx *.doc *.txt *.rtf"),
                ("All files", "*.*"),
            ])
        if not paths:
            return
        for p in paths:
            if p not in self._kw_doc_paths:
                self._kw_doc_paths.append(p)
        self._save_session("kw_doc_paths", self._kw_doc_paths)
        self._refresh_kw_list()
        try:
            self._extract_status_lbl.configure(
                text=f"{len(self._kw_doc_paths)} file(s) loaded — click Extract Data to process.",
                text_color=TEXT_MUTED,
            )
        except Exception:
            pass

    def _clear_kw_docs(self):
        self._kw_doc_paths.clear()
        self._save_session("kw_doc_paths", [])
        self._doc_extraction_in_progress = False
        self._proper_nouns = []
        self._save_session("proper_nouns", [])
        self._extracted_fields = {}
        self._refresh_kw_list()
        self._nouns_box.delete("1.0", "end")
        try:
            self._pn_box.delete("1.0", "end")
        except Exception:
            pass
        try:
            self._extract_status_lbl.configure(text="", text_color=GREEN)
        except Exception:
            pass
        for var in self._ufm_field_vars.values():
            var.set("")
        for key, var in self._case_vars.items():
            var.set("")
            self._save_session(f"case_{key}", "")
        self._clear_data_table()
        try:
            self._save_case_btn.configure(state="disabled")
        except Exception:
            pass

    def _reset_job(self):
        """Clear ALL job state so the user can start a fresh transcript."""
        if not messagebox.askyesno(
            "Start New Job",
            "This will clear all current data:\n\n"
            "  - Audio file selection\n"
            "  - Keyword documents & extracted terms\n"
            "  - Case information fields\n"
            "  - Transcription results\n"
            "  - All output paths\n\n"
            "Are you sure?",
        ):
            return

        # Clear keyword docs / proper nouns / extracted fields
        self._clear_kw_docs()

        # Clear audio
        self._audio_var.set("")
        self._save_session("audio_path", "")

        # Clear transcript and output state
        self._transcript_text = ""
        self._undo_stack.clear()
        self._output_paths = {}
        self._last_ufm_output_path = ""
        self._last_pdf_output_path = ""
        self._last_ascii_output_path = ""
        self._last_run_dir = None
        self._last_spec_flags = []
        self._flag_resolved = {}
        self._job_exhibits = []
        self._pending_rule = None
        self._pending_corrections = None
        self._pending_source = ""
        self._last_diff = ""
        self._last_blocks = []

        # Clear session keys
        for key in [
            "transcript", "speaker_map", "output_paths",
            "deepgram_raw_path", "deepgram_transcript_path",
            "deepgram_raw_transcript_path", "last_auto_docx_path",
            "last_ufm_output_path", "last_pdf_output_path",
            "last_ascii_output_path", "flag_resolved",
            "extracted_fields", "proper_nouns", "kw_doc_paths",
        ]:
            self._session.pop(key, None)
        try:
            SESSION_PATH.write_text(
                json.dumps(self._session, indent=2), encoding="utf-8")
        except Exception:
            pass

        # Reset UI widgets
        self._prog_var.set(0)
        self._prog_lbl.configure(text="Ready")
        self._log.clear()
        self._top_badge.set("draft")
        try:
            self._start_btn.configure(state="normal")
            self._open_folder_btn.configure(state="disabled")
            self._open_txt_btn.configure(state="disabled")
            self._auto_docx_lbl.configure(text="")
        except Exception:
            pass

        # Clear Format tab preview
        try:
            self._preview.delete("1.0", "end")
            self._fmt_badge.set("draft")
            self._reset_pending_banner()
        except Exception:
            pass

        # Clear Build tab preview
        try:
            self._build_preview.delete("1.0", "end")
        except Exception:
            pass

        self._switch_tab(0)
        LOGGER.info("Job reset — all state cleared")

    def _refresh_kw_list(self):
        self._kw_list_box.configure(state="normal")
        self._kw_list_box.delete("1.0", "end")
        self._kw_list_box.insert(
            "1.0",
            "\n".join(Path(p).name for p in self._kw_doc_paths)
            if self._kw_doc_paths else "No documents loaded")
        self._kw_list_box.configure(state="disabled")

    def _extract_nouns_from_docs(self):
        """
        Runs proper noun extraction and UFM field extraction in the same worker.
        """
        if not self._kw_doc_paths:
            return
        self._doc_extraction_in_progress = True
        try:
            self._extract_status_lbl.configure(
                text=f"Extracting names and case fields from "
                     f"{len(self._kw_doc_paths)} file(s)...",
                text_color=AMBER)
        except Exception:
            pass

        def _worker():
            all_nouns: list[str] = []
            merged_fields: dict = {}
            for path in self._kw_doc_paths:
                try:
                    ext = Path(path).suffix.lower()
                    try:
                        raw_text = load_transcript(path).text
                    except Exception:
                        raw_text = ""
                    if ext == ".pdf":
                        nouns = extract_proper_nouns_from_pdf(path)
                    elif ext == ".docx":
                        nouns = extract_proper_nouns_from_docx(path)
                    else:
                        nouns = self._fallback_noun_extract(raw_text)
                    all_nouns.extend(nouns)
                    if raw_text and os.getenv("ANTHROPIC_API_KEY", "").strip():
                        try:
                            fields = extract_job_config_from_doc(raw_text)
                            for k, v in fields.items():
                                if v and v != [] and v != {}:
                                    merged_fields[k] = v
                        except Exception as fe:
                            LOGGER.warning("Field extraction failed for %s: %s", path, fe)
                except Exception as exc:
                    LOGGER.warning("Extraction failed for %s: %s", path, exc)

            seen: set = set()
            deduped = [n for n in all_nouns
                       if n.lower() not in seen and not seen.add(n.lower())]
            self._proper_nouns = deduped
            self._save_session("proper_nouns", deduped)
            self._extracted_fields = merged_fields

            def _update():
                self._doc_extraction_in_progress = False
                self._nouns_box.delete("1.0", "end")
                self._nouns_box.insert("1.0", "\n".join(deduped))
                try:
                    self._pn_box.delete("1.0", "end")
                    self._pn_box.insert("1.0", "\n".join(deduped))
                except Exception:
                    pass
                self._populate_ufm_table(deduped, self._ufm_field_vars)
                if merged_fields:
                    self._populate_case_fields(merged_fields)
                    for source_key, case_key in {
                        "case_style": "case_name",
                        "cause_number": "cause_number",
                        "witness_name": "deponent_name",
                        "depo_date": "deposition_date",
                    }.items():
                        value = merged_fields.get(source_key)
                        if value and case_key in self._case_vars:
                            text_value = str(value)
                            self._case_vars[case_key].set(text_value)
                            self._save_session(f"case_{case_key}", text_value)
                if merged_fields or deduped:
                    self._populate_data_table(merged_fields, deduped)
                try:
                    field_count = len([v for v in merged_fields.values() if v])
                    self._extract_status_lbl.configure(
                        text=f"{len(deduped)} name(s) + {field_count} case field(s) extracted.",
                        text_color=GREEN)
                    self._save_case_btn.configure(state="normal")
                except Exception:
                    pass
            self._ui(_update)

        def _guarded_worker():
            try:
                _worker()
            finally:
                def _clear_busy():
                    self._doc_extraction_in_progress = False
                self._ui(_clear_busy)

        threading.Thread(target=_guarded_worker, daemon=True).start()

    def _fallback_noun_extract(self, text: str) -> list[str]:
        try:
            from pipeline.keywords import extract_terms_from_document_text
            return extract_terms_from_document_text(text)
        except Exception:
            return []

    def _build_extraction_table(self, parent):
        """
        Builds a grouped two-column extraction results table.
        """
        frame = ctk.CTkScrollableFrame(
            parent, fg_color=BG_CARD,
            border_width=1, border_color=BORDER_LIGHT,
            label_text="EXTRACTED UFM FIELDS — Review and edit before processing",
            label_font=("Segoe UI", 9, "bold"),
            label_fg_color=BG_CARD,
            label_text_color=TEXT_MUTED,
        )
        frame.columnconfigure(0, weight=0, minsize=170)
        frame.columnconfigure(1, weight=1)

        UFM_FIELD_GROUPS = [
            ("CASE INFO", [
                "Case Style",
                "Cause Number",
                "Court",
                "County",
                "Judicial District",
                "Plaintiff Name",
                "Defendant Name(s)",
            ]),
            ("PROCEEDING", [
                "Proceeding Type",
                "Depo Date",
                "Start Time",
                "End Time",
                "Location",
                "Method",
                "Volume",
            ]),
            ("PARTICIPANTS", [
                "Witness",
                "Judge",
                "Plaintiff Counsel",
                "Defense Counsel",
                "Firm Name(s)",
                "Also Present",
            ]),
            ("REPORTER", [
                "Reporter Name",
                "CSR No.",
                "CSR Expiration",
                "Reporter Firm",
                "Reporter Phone",
                "Firm Registration",
            ]),
            ("FINANCIAL / CERT", [
                "Cost Total",
                "Cost Paid By",
                "Certified Date",
            ]),
            ("PROPER NOUNS", [
                "Cities",
                "Streets/Addresses",
                "Proper Nouns",
            ]),
        ]

        field_vars = {}
        current_row = 0
        for group_name, field_names in UFM_FIELD_GROUPS:
            ctk.CTkLabel(
                frame,
                text=group_name,
                font=("Segoe UI", 8, "bold"),
                text_color=TEXT_WHITE,
                fg_color=NAVY,
                anchor="w",
                corner_radius=0,
            ).grid(row=current_row, column=0, columnspan=2,
                   sticky="ew", padx=0, pady=(6, 2))
            current_row += 1

            for field_name in field_names:
                ctk.CTkLabel(
                    frame,
                    text=field_name + ":",
                    font=("Segoe UI", 10, "bold"),
                    text_color=TEXT_MID,
                    anchor="e",
                ).grid(row=current_row, column=0, sticky="e",
                       padx=(8, 6), pady=2)

                var = ctk.StringVar(value="")
                ctk.CTkEntry(
                    frame, textvariable=var,
                    fg_color=BG_INPUT, font=("Segoe UI", 10),
                    border_color=BORDER_LIGHT, text_color=TEXT_DARK,
                    height=26,
                ).grid(row=current_row, column=1, sticky="ew",
                       padx=(0, 8), pady=2)
                field_vars[field_name] = var
                current_row += 1

        return frame, field_vars

    def _populate_case_fields(self, fields: dict):
        """Push AI-extracted case fields into the grouped UFM table."""
        mapping = {
            "case_style": "Case Style",
            "cause_number": "Cause Number",
            "court": "Court",
            "county": "County",
            "judicial_district": "Judicial District",
            "plaintiff_name": "Plaintiff Name",
            "defendant_names": "Defendant Name(s)",
            "proceeding_type": "Proceeding Type",
            "depo_date": "Depo Date",
            "depo_start_time": "Start Time",
            "depo_end_time": "End Time",
            "location_city": "Location",
            "method": "Method",
            "volume_number": "Volume",
            "witness_name": "Witness",
            "judge_name": "Judge",
            "also_present": "Also Present",
            "reporter_name": "Reporter Name",
            "reporter_csr": "CSR No.",
            "reporter_expiration": "CSR Expiration",
            "reporter_firm": "Reporter Firm",
            "reporter_phone": "Reporter Phone",
            "firm_registration": "Firm Registration",
            "cost_total": "Cost Total",
            "cost_paid_by": "Cost Paid By",
            "certified_date": "Certified Date",
        }
        for source_key, field_name in mapping.items():
            value = fields.get(source_key)
            if not value or field_name not in self._ufm_field_vars:
                continue
            if isinstance(value, list):
                if source_key in ("plaintiff_counsel", "defense_counsel"):
                    continue
                text = "; ".join(str(v) for v in value if v)
            else:
                text = str(value)
            self._ufm_field_vars[field_name].set(text)

        counsel_mappings = [
            ("plaintiff_counsel", "Plaintiff Counsel"),
            ("defense_counsel", "Defense Counsel"),
        ]
        for source_key, field_name in counsel_mappings:
            raw = fields.get(source_key, [])
            if field_name not in self._ufm_field_vars or not raw:
                continue
            names = [c.get("name", "").strip() for c in raw if isinstance(c, dict) and c.get("name")]
            firms = [c.get("firm", "").strip() for c in raw if isinstance(c, dict) and c.get("firm")]
            lines = names + [f for f in firms if f and f not in names]
            if lines:
                self._ufm_field_vars[field_name].set("; ".join(lines))

        firm_names = []
        for source_key in ("plaintiff_counsel", "defense_counsel"):
            for c in fields.get(source_key, []):
                if isinstance(c, dict) and c.get("firm"):
                    firm_names.append(c["firm"].strip())
        if firm_names and "Firm Name(s)" in self._ufm_field_vars:
            seen = set()
            deduped = [f for f in firm_names if f and f.lower() not in seen and not seen.add(f.lower())]
            self._ufm_field_vars["Firm Name(s)"].set("; ".join(deduped))

    def _clear_data_table(self):
        try:
            self._data_table_label.pack_forget()
            self._data_table_scroll.pack_forget()
            for widget in self._data_table_scroll.winfo_children():
                widget.destroy()
        except Exception:
            pass

    def _populate_data_table(self, fields: dict, nouns: list[str]):
        self._clear_data_table()
        self._data_table_label.pack(anchor="w", padx=2, pady=(8, 4))
        self._data_table_scroll.pack(fill="both", expand=True, padx=0, pady=(0, 6))

        rows: list[tuple[str, str]] = [
            ("Case Style", str(fields.get("case_style", "") or "")),
            ("Cause Number", str(fields.get("cause_number", "") or "")),
            ("Court", str(fields.get("court", "") or "")),
            ("County", str(fields.get("county", "") or "")),
            ("Judicial District", str(fields.get("judicial_district", "") or "")),
            ("Proceeding Type", str(fields.get("proceeding_type", "") or "")),
            ("Depo Date", str(fields.get("depo_date", "") or "")),
            ("Start Time", str(fields.get("depo_start_time", "") or "")),
            ("End Time", str(fields.get("depo_end_time", "") or "")),
            ("Location", str(fields.get("location_city", "") or "")),
            ("Method", str(fields.get("method", "") or "")),
            ("Volume", str(fields.get("volume_number", "") or "")),
            ("Plaintiff(s)", str(fields.get("plaintiff_name", "") or "")),
            ("Defendant(s)", "; ".join(fields.get("defendant_names", []))
             if isinstance(fields.get("defendant_names"), list)
             else str(fields.get("defendant_names", "") or "")),
            ("Witness / Deponent", str(fields.get("witness_name", "") or "")),
            ("Judge", str(fields.get("judge_name", "") or "")),
            ("Reporter Name", str(fields.get("reporter_name", "") or "")),
            ("CSR No.", str(fields.get("reporter_csr", "") or "")),
            ("Reporter Firm", str(fields.get("reporter_firm", "") or "")),
            ("Reporter Phone", str(fields.get("reporter_phone", "") or "")),
            ("Also Present", "; ".join(fields.get("also_present", []))
             if isinstance(fields.get("also_present"), list)
             else str(fields.get("also_present", "") or "")),
            ("Extracted Names", ", ".join(nouns[:20]) + ("..." if len(nouns) > 20 else "")),
        ]

        counsel_rows = {
            "Plaintiff Counsel": fields.get("plaintiff_counsel", []),
            "Defense Counsel": fields.get("defense_counsel", []),
        }
        for label, raw in counsel_rows.items():
            if raw and isinstance(raw, list):
                names = [c.get("name", "").strip() for c in raw if isinstance(c, dict) and c.get("name")]
                firms = [c.get("firm", "").strip() for c in raw if isinstance(c, dict) and c.get("firm")]
                combined = names + [f for f in firms if f and f not in names]
                rows.append((label, "; ".join(combined)))

        visible_rows = [(label, value) for label, value in rows if value]
        for row_idx, (label, value) in enumerate(visible_rows):
            bg = BG_CARD if row_idx % 2 == 0 else BG_INPUT
            ctk.CTkLabel(
                self._data_table_scroll,
                text=label,
                font=("Segoe UI", 10, "bold"),
                text_color=TEXT_MID,
                anchor="w",
                fg_color=bg,
                width=150,
            ).grid(row=row_idx, column=0, sticky="w", padx=(8, 4), pady=2, ipadx=4, ipady=3)
            ctk.CTkLabel(
                self._data_table_scroll,
                text=value,
                font=("Segoe UI", 10),
                text_color=TEXT_DARK,
                anchor="w",
                fg_color=bg,
                wraplength=260,
                justify="left",
            ).grid(row=row_idx, column=1, sticky="ew", padx=(4, 8), pady=2, ipadx=4, ipady=3)

    def _populate_ufm_table(self, raw_nouns: list[str], field_vars: dict):
        """
        Classify each extracted proper noun into the best-fit UFM field.
        Uses pattern matching — not AI — to sort into the field map.
        """
        cause_re  = re.compile(r'\b\d{4}-[A-Z]{2}-\d{4,}\b')
        date_re   = re.compile(
            r'\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|'
            r'May|June?|July?|Aug(?:ust)?|Sep(?:tember)?|'
            r'Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b',
            re.IGNORECASE)
        street_re = re.compile(
            r'\b\d+\s+\w+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Court|Ct|'
            r'Plaza|Pkwy|Highway|Hwy)\b', re.IGNORECASE)
        csr_re    = re.compile(r'CSR\s*No\.?\s*\d+', re.IGNORECASE)
        vs_re     = re.compile(r'\bv(?:s|ersus)?\.?\s+\w', re.IGNORECASE)
        court_re  = re.compile(r'\b\d+(?:st|nd|rd|th)\s+Judicial\b',
                               re.IGNORECASE)
        atty_re   = re.compile(
            r'^(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$')
        firm_re   = re.compile(
            r'\b(?:Law|Legal|Associates|P\.C\.|LLP|LLC|PLLC|Firm|Office|'
            r'Group|Solutions|Services)\b', re.IGNORECASE)
        witness_title_re = re.compile(
            r',\s*(?:M\.D\.|Ph\.D\.|RN|CPA|P\.E\.)$', re.IGNORECASE)

        tx_cities = {
            'San Antonio', 'Austin', 'Houston', 'Dallas', 'Fort Worth',
            'El Paso', 'Laredo', 'Corpus Christi', 'Harlingen', 'Encinal',
            'Uvalde', 'Bexar', 'McAllen', 'Lubbock', 'Amarillo',
        }

        buckets = {k: [] for k in field_vars}
        for var in field_vars.values():
            var.set("")

        atty_nouns = []
        firm_nouns = []

        for noun in raw_nouns:
            noun = noun.strip()
            if not noun:
                continue
            if cause_re.search(noun):
                buckets["Cause Number"].append(noun)
            elif vs_re.search(noun):
                buckets["Case Style"].append(noun)
            elif court_re.search(noun):
                buckets["Court"].append(noun)
            elif date_re.search(noun):
                buckets["Depo Date"].append(noun)
            elif street_re.search(noun):
                buckets["Streets/Addresses"].append(noun)
            elif csr_re.search(noun):
                buckets["Reporter Name"].append(noun)
            elif firm_re.search(noun):
                firm_nouns.append(noun)
            elif atty_re.match(noun):
                atty_nouns.append(noun)
            elif witness_title_re.search(noun):
                buckets["Proper Nouns"].append(noun)
            elif any(city.lower() in noun.lower() for city in tx_cities):
                buckets["Cities"].append(noun)
            else:
                buckets["Proper Nouns"].append(noun)

        if atty_nouns:
            mid = max(1, len(atty_nouns) // 2)
            buckets["Plaintiff Counsel"].extend(atty_nouns[:mid])
            buckets["Defense Counsel"].extend(atty_nouns[mid:])

        if firm_nouns:
            buckets["Firm Name(s)"].extend(firm_nouns)

        first_populated = None
        for idx, (field, items) in enumerate(buckets.items()):
            if items and field in field_vars:
                field_vars[field].set(";  ".join(items))
                if first_populated is None:
                    first_populated = idx

        if first_populated is not None and hasattr(self._ufm_table_frame, "_parent_canvas"):
            total = max(len(field_vars), 1)
            self._ufm_table_frame._parent_canvas.yview_moveto(first_populated / total)

    def _build_keyterms(self) -> list[str]:
        from pipeline.keywords import build_keyterms, parse_dynamic_terms_from_text
        pasted = self._kw_textbox.get("1.0", "end").strip()
        pasted_terms = parse_dynamic_terms_from_text(pasted) if pasted else []
        combined = list(dict.fromkeys(self._proper_nouns + pasted_terms))
        return build_keyterms(combined)

    def _get_keyword_doc_paths(self) -> list[str]:
        """Return uploaded keyword document paths."""
        return list(self._kw_doc_paths)

    def _get_manual_keyterms(self) -> list[str]:
        """Return manually typed keyterms from the UI textbox."""
        raw = self._kw_textbox.get("1.0", "end").strip()
        return [term.strip() for term in raw.splitlines() if term.strip()]

    def _default_speaker_map(self, assembled: dict) -> dict:
        """
        Fallback speaker mapping based on word count heuristic.
        Speaker with most words = THE WITNESS.
        Speaker with second most = EXAMINING ATTORNEY.
        """
        from collections import Counter

        word_counts = Counter()
        for utt in assembled.get("utterances", []):
            sid = utt.get("speaker", 0)
            words = len(utt.get("transcript", "").split())
            word_counts[sid] += words

        roles = [
            "THE WITNESS",
            "EXAMINING ATTORNEY",
            "OPPOSING COUNSEL",
            "THE REPORTER",
            "THE VIDEOGRAPHER",
        ]
        speaker_map = {}
        for i, (sid, _) in enumerate(word_counts.most_common()):
            speaker_map[sid] = roles[i] if i < len(roles) else "OTHER COUNSEL"
        return speaker_map

    def _verify_speakers(self, assembled: dict) -> dict:
        """Open a modal dialog to confirm speaker roles for assembled utterances."""
        import threading
        from pipeline.assembler import build_transcript_text

        speaker_samples = {}
        for utt in assembled.get("utterances", []):
            sid = utt.get("speaker", 0)
            text = utt.get("transcript", "").strip()
            if text and len(text) > 10:
                speaker_samples.setdefault(sid, [])
                if len(speaker_samples[sid]) < 3:
                    speaker_samples[sid].append(text)

        if not speaker_samples:
            return self._default_speaker_map(assembled)

        done = threading.Event()
        result: dict[str, dict | bool] = {"speaker_map": {}, "confirmed": False}

        def _open_dialog():
            default_map = self._default_speaker_map(assembled)
            dialog = SpeakerVerifyDialog(self, speaker_samples, default_map=default_map)
            result["confirmed"] = dialog.confirmed
            result["speaker_map"] = dialog.speaker_map if dialog.confirmed else self._default_speaker_map(assembled)
            done.set()

        self._ui(_open_dialog)
        done.wait()

        speaker_map = result["speaker_map"] or self._default_speaker_map(assembled)
        assembled["speaker_map"] = speaker_map
        assembled["transcript"] = build_transcript_text(
            assembled.get("utterances", []),
            speaker_map=speaker_map,
        )
        self._save_session("transcript", assembled["transcript"])
        self._save_session("speaker_map", {str(k): v for k, v in speaker_map.items()})
        for utt in assembled.get("utterances", []):
            sid = utt.get("speaker", 0)
            utt["speaker_label"] = speaker_map.get(sid, f"Speaker {sid}")

        if result["confirmed"]:
            self._log_msg(
                "Speakers confirmed: " +
                ", ".join(f"Speaker {k}={v}" for k, v in speaker_map.items())
            )
        else:
            self._log_msg("Speaker verification cancelled — using default mapping.")

        return speaker_map

    def _start_transcription(self):
        audio_path = self._audio_var.get().strip()
        if not audio_path:
            messagebox.showerror(
                "No File", "Please select an audio or video file.")
            return
        if not os.getenv("DEEPGRAM_API_KEY", "").strip():
            messagebox.showerror(
                "API Key Missing",
                "DEEPGRAM_API_KEY is not set.\n\n"
                "Add it to the .env file:\nDEEPGRAM_API_KEY=your_key_here")
            return

        for key, var in self._case_vars.items():
            self._save_session(f"case_{key}", var.get())
        self._save_session("utt_split", self._utt_var.get())
        self._save_session("conf_threshold", self._conf_var.get())
        for key, var in self._dg_vars.items():
            self._save_session(f"dg_{key}", var.get())

        self._start_btn.configure(state="disabled")
        self._open_folder_btn.configure(state="disabled")
        self._open_txt_btn.configure(state="disabled")
        self._output_paths = {}
        self._log.clear()
        self._set_progress(0, "Starting\u2026")
        self._top_badge.set("processing")

        threading.Thread(
            target=self._pipeline_worker,
            args=(audio_path,), daemon=True).start()

    def _pipeline_worker(self, audio_path: str):
        chunks = []
        normalized_path = None

        try:
            from pipeline.preprocessor import (
                validate_audio_file, normalize_audio,
                QUALITY_CONFIGS, check_ffmpeg)
            from pipeline.chunker import chunk_audio, cleanup_chunks
            from pipeline.transcriber import transcribe_chunk
            from pipeline.assembler import reassemble_chunks
            from pipeline.exporter import export_results
            from pipeline.keywords import build_keyterms, get_static_keyterms
            from pipeline.processor import run_pipeline

            if not check_ffmpeg():
                raise RuntimeError(
                    "FFmpeg is not installed or not on the PATH.\n"
                    "Download from https://ffmpeg.org/download.html "
                    "and add to Windows PATH.")

            self._log_msg("Reading keyword documents\u2026")
            static_terms = get_static_keyterms()
            doc_terms: list[str] = []
            for doc_path in self._get_keyword_doc_paths():
                try:
                    ext = Path(doc_path).suffix.lower()
                    basename = os.path.basename(doc_path)
                    if ext == ".pdf":
                        terms = extract_proper_nouns_from_pdf(doc_path)
                    elif ext == ".docx":
                        terms = extract_proper_nouns_from_docx(doc_path)
                    else:
                        text = load_transcript(doc_path).text
                        terms = self._fallback_noun_extract(text)
                    doc_terms.extend(terms)
                    self._log_msg(f"Extracted {len(terms)} keyterms from {basename}")
                    LOGGER.info("Keyterm extraction complete doc=%s terms=%s", basename, len(terms))
                except Exception as exc:
                    LOGGER.warning(
                        "Failed to extract keyterms from %s: %s",
                        os.path.basename(doc_path),
                        exc,
                    )

            seen_doc_terms: set[str] = set()
            deduped_doc_terms = [
                term for term in doc_terms
                if term and term.lower() not in seen_doc_terms
                and not seen_doc_terms.add(term.lower())
            ]
            self._proper_nouns = deduped_doc_terms
            self._save_session("proper_nouns", deduped_doc_terms)

            def _update_pn_box():
                try:
                    self._pn_box.configure(state="normal")
                    self._pn_box.delete("1.0", "end")
                    if deduped_doc_terms:
                        self._pn_box.insert("1.0", "\n".join(deduped_doc_terms))
                except Exception:
                    pass

            self._ui(_update_pn_box)
            manual_terms = self._get_manual_keyterms()
            keyterms = build_keyterms(deduped_doc_terms + manual_terms)
            model = self._dg_vars["model"].get()
            is_nova3 = "nova-3" in (model or "").lower()
            self._log_msg(
                f"Keyterms: {len(keyterms)} total "
                f"({len(deduped_doc_terms)} from docs + {len(static_terms)} static)"
                + (" \u2014 sending via keyterm (nova-3 direct HTTP)" if is_nova3
                   else " \u2014 sending to Deepgram")
            )
            LOGGER.info("Final keyterm list count=%s preview=%s", len(keyterms), keyterms[:20])

            self._log_msg("Validating file\u2026")
            self._set_progress(3, "Validating\u2026")
            v = validate_audio_file(audio_path)
            if not v["valid"]:
                raise ValueError(v["error"])
            self._log_msg(
                f"Valid: {v['format'].upper()}  {v['duration']:.1f}s "
                f"({v['duration']/60:.1f} min)")

            # Auto-save original audio to output directory
            import shutil as _shutil
            _out_dir = Path(self._save_dir_var.get() or "output")
            _out_dir.mkdir(parents=True, exist_ok=True)
            _audio_dest = _out_dir / Path(audio_path).name
            if not _audio_dest.exists():
                try:
                    _shutil.copy2(audio_path, _audio_dest)
                    self._output_paths["audio"] = str(_audio_dest)
                    self._save_session("output_paths", self._output_paths)
                    self._log_msg(f"Audio saved: {_audio_dest.name}")
                except Exception as _ae:
                    LOGGER.warning("Could not copy audio file: %s", _ae)

            self._set_progress(8, "Normalizing audio\u2026")
            quality_cfg = QUALITY_CONFIGS[self._dg_vars["quality"].get()]
            normalized_path = normalize_audio(
                audio_path, config=quality_cfg,
                progress_callback=self._log_msg)
            self._set_progress(20, "Normalized")

            self._set_progress(22, "Chunking\u2026")
            chunks = chunk_audio(
                normalized_path, total_duration=v["duration"],
                progress_callback=self._log_msg)

            try:
                utt_split = max(0.1, min(2.0, float(self._utt_var.get())))
            except ValueError:
                utt_split = 0.9
            try:
                conf_threshold = max(0.0, min(1.0,
                                              float(self._conf_var.get())))
            except ValueError:
                conf_threshold = 0.85

            model = self._dg_vars["model"].get()
            chunk_results, chunk_offsets = [], []

            for i, chunk in enumerate(chunks):
                self._set_progress(
                    25 + int((i / len(chunks)) * 50),
                    f"Transcribing chunk {i+1}/{len(chunks)}\u2026")
                self._log_msg(
                    f"Chunk {i+1}/{len(chunks)}: "
                    f"{chunk.start_seconds:.0f}s \u2013 "
                    f"{chunk.end_seconds:.0f}s")
                result = transcribe_chunk(
                    chunk.file_path, keyterms=keyterms,
                    model=model, utt_split=utt_split,
                    progress_callback=self._log_msg)
                chunk_results.append(result)
                chunk_offsets.append(chunk.start_seconds)

            self._set_progress(80, "Assembling\u2026")
            assembled = reassemble_chunks(chunk_results, chunk_offsets)
            self._log_msg(
                f"Assembly: {len(assembled['words'])} words, "
                f"{len(assembled['utterances'])} utterances")
            LOGGER.info(
                "Transcription complete speakers_detected=%s total_utterances=%s",
                len(set(u.get("speaker") for u in assembled["utterances"])),
                len(assembled["utterances"]),
            )

            # Use Deepgram speaker labels as-is (Speaker 0, Speaker 1, etc.)
            self._set_progress(85, "Using Deepgram speaker labels\u2026")
            speaker_ids = sorted(set(
                u.get("speaker", 0) for u in assembled.get("utterances", [])
            ))
            speaker_map = {sid: f"Speaker {sid}" for sid in speaker_ids}
            self._log_msg(
                f"Deepgram speakers preserved: {len(speaker_map)} speaker(s) detected"
            )
            self._save_session("speaker_map", {str(k): v for k, v in speaker_map.items()})

            # Build transcript text directly from Deepgram output (no rules engine)
            self._set_progress(88, "Building transcript\u2026")
            from pipeline.assembler import build_transcript_text
            formatted = build_transcript_text(
                assembled.get("utterances", []),
                speaker_map=speaker_map,
            )
            self._last_blocks = []
            self._save_session("transcript", formatted)

            self._set_progress(93, "Exporting corrected transcript\u2026")
            case_info = {k: v.get() for k, v in self._case_vars.items()}
            self._output_paths = export_results(
                assembled,
                audio_path,
                case_info,
                confidence_threshold=conf_threshold,
                progress_callback=self._log_msg,
                formatted_transcript=formatted,
                speaker_map=speaker_map,
            )

            corrected_txt_path = self._output_paths.get("transcript")
            if corrected_txt_path and formatted:
                try:
                    with open(corrected_txt_path, "w", encoding="utf-8") as f:
                        f.write(formatted)
                    LOGGER.info("Corrected transcript written to disk: %s", corrected_txt_path)
                except OSError as e:
                    LOGGER.warning("Could not write corrected transcript to disk: %s", e)
            self._output_paths["transcript_corrected"] = corrected_txt_path
            self._save_session("output_paths", self._output_paths)
            self._save_session("deepgram_raw_path", self._output_paths.get("json", ""))
            self._save_session("deepgram_transcript_path", corrected_txt_path or "")
            try:
                if corrected_txt_path:
                    raw_txt_path = str(Path(corrected_txt_path).with_name(
                        Path(corrected_txt_path).stem.replace("_transcript", "_raw_transcript") + ".txt"
                    ))
                    with open(raw_txt_path, "w", encoding="utf-8") as f:
                        f.write(assembled.get("transcript", ""))
                    self._output_paths["transcript_raw"] = raw_txt_path
                    self._save_session("deepgram_raw_transcript_path", raw_txt_path)
                    LOGGER.info("Raw Deepgram transcript written to disk: %s", raw_txt_path)
            except Exception as exc:
                LOGGER.warning("Could not write raw Deepgram transcript to disk: %s", exc)
            self._log_msg("Deepgram transcript saved to disk (speaker labels preserved)")

            try:
                _case = {k: v.get() for k, v in self._case_vars.items()}
                _safe_cause = ((_case.get("cause_number", "") or "transcript")
                               .replace("/", "-").replace("\\", "-"))
                _safe_deponent = (_case.get("deponent_name", "") or "").replace(" ", "_")
                _auto_name = (
                    f"{_safe_cause}_{_safe_deponent}_auto.docx"
                    if _safe_deponent else f"{_safe_cause}_auto.docx"
                )
                _auto_docx_path = os.path.join(self._save_dir_var.get() or ".", _auto_name)
                export_to_docx(
                    text=formatted,
                    output_path=_auto_docx_path,
                    show_format_box=False,
                    case_style=_case.get("case_name", ""),
                    cause_number=_case.get("cause_number", ""),
                )
                self._output_paths["auto_docx"] = _auto_docx_path
                self._save_session("output_paths", self._output_paths)
                self._save_session("last_auto_docx_path", _auto_docx_path)
                self._log_msg(f"Auto-DOCX created: {os.path.basename(_auto_docx_path)}")
                LOGGER.info("Auto-DOCX ready for Spec Process: %s", _auto_docx_path)
            except Exception as _exc:
                LOGGER.warning("Auto-DOCX export skipped: %s", _exc)
                self._log_msg(f"Note: auto-DOCX skipped — {_exc}")

            self._set_progress(100, "Complete")
            self._log_msg("\u2713  Transcription and formatting complete")

            flagged = sum(1 for w in assembled["words"]
                         if w.get("confidence", 1.0) < conf_threshold)

            def _done():
                self._load_preview(formatted)
                self._top_badge.set("draft")
                self._fmt_badge.set("draft")
                self._open_folder_btn.configure(state="normal")
                self._open_txt_btn.configure(state="normal")
                self._start_btn.configure(state="normal")
                _auto = self._output_paths.get("auto_docx", "")
                if _auto and os.path.exists(_auto):
                    try:
                        self._auto_docx_lbl.configure(
                            text=f"✓ DOCX ready: {os.path.basename(_auto)}",
                            text_color=GREEN,
                        )
                    except Exception:
                        pass
                run_ai = messagebox.askyesno(
                    "Transcription Complete",
                    f"Transcription complete (Deepgram output preserved).\n\n"
                    f"Words: {len(assembled['words'])}\n"
                    f"Utterances: {len(assembled['utterances'])}\n"
                    f"Speakers: {len(speaker_map)}\n"
                    f"Flagged (low confidence): {flagged}\n\n"
                    "Run AI Legal Correction now?\n"
                    "(You can also run it later from the Format tab.)")
                if run_ai:
                    self._switch_tab(1)
                    self.after(200, lambda: self._run_ai())
                else:
                    self._switch_tab(1)

            self._ui(_done)

        except Exception as exc:
            self._log_msg(f"ERROR: {exc}")

            def _err():
                self._start_btn.configure(state="normal")
                self._top_badge.set("error")
                messagebox.showerror("Transcription Failed", str(exc))
            self._ui(_err)

        finally:
            try:
                from pipeline.chunker import cleanup_chunks as _cleanup
                if chunks:
                    _cleanup(chunks)
            except Exception:
                pass
            if normalized_path and os.path.exists(normalized_path):
                try:
                    os.remove(normalized_path)
                except OSError:
                    pass

    # ── Format actions ─────────────────────────────────────────────────────────

    def _load_recent_job(self):
        """
        Load a saved job config (.json) from the jobs/ folder.
        Shows a picker with recently modified files first.
        """
        from pathlib import Path
        jobs_dir = Path("jobs")
        if not jobs_dir.exists():
            messagebox.showinfo("No Jobs Found",
                "No saved job configs found in jobs/ folder.\n"
                "Run Spec Process first to create a job config.")
            return

        json_files = sorted(
            jobs_dir.glob("*_job.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        if not json_files:
            messagebox.showinfo("No Jobs Found",
                "No saved job configs found in jobs/ folder.")
            return

        pick_win = ctk.CTkToplevel(self)
        pick_win.title("Load Job Config")
        pick_win.geometry("500x320")
        pick_win.grab_set()

        ctk.CTkLabel(pick_win, text="Recent Job Configs",
                     font=F_HEAD, text_color=TEXT_DARK).pack(
            anchor="w", padx=16, pady=(12, 4))
        ctk.CTkLabel(pick_win,
            text="Select a job to pre-fill the Spec Process dialog.",
            font=F_SMALL, text_color=TEXT_MUTED).pack(anchor="w", padx=16)

        listbox_frame = ctk.CTkScrollableFrame(pick_win, fg_color=BG_CARD,
                                               height=180)
        listbox_frame.pack(fill="x", padx=12, pady=8)

        selected_path = [None]

        for jf in json_files[:10]:
            import datetime
            mtime = datetime.datetime.fromtimestamp(jf.stat().st_mtime)
            label = f"{jf.stem}   ({mtime.strftime('%Y-%m-%d %H:%M')})"

            def _make_pick(path: Path):
                def _inner() -> None:
                    selected_path[0] = path
                    pick_win.destroy()
                return _inner

            PrimaryBtn(
                listbox_frame, text=label, command=_make_pick(jf),
                height=32, anchor="w",
            ).pack(fill="x", padx=4, pady=2)

        def _browse():
            path = filedialog.askopenfilename(
                title="Browse Job Configs",
                initialdir="jobs",
                filetypes=[("Job Config", "*.json"), ("All files", "*.*")])
            if path:
                selected_path[0] = path
                pick_win.destroy()

        SecondaryBtn(pick_win, text="Browse...", command=_browse).pack(
            side="left", padx=12, pady=8)
        SecondaryBtn(pick_win, text="Cancel",
                     command=pick_win.destroy).pack(side="right", padx=12, pady=8)

        self.wait_window(pick_win)

        if selected_path[0]:
            try:
                from spec_engine.models import JobConfig
                cfg = JobConfig.load(str(selected_path[0]))
                dialog = JobConfigDialog(self, existing_config=cfg)
                self.wait_window(dialog)
                job_config = dialog.get_result()
                if job_config:
                    self._run_spec_process_with_config(job_config)
            except Exception as e:
                messagebox.showerror("Load Failed",
                    f"Could not load job config:\n{e}")

    def _run_spec_process_with_config(self, job_config):
        """
        Run Spec Process with a pre-loaded JobConfig (skips the dialog).
        Called by _load_recent_job after the user confirms the config.
        """
        try:
            from spec_engine.document_builder import process_transcript
            from spec_engine.models import SpeakerMapUnverifiedError
        except ImportError as e:
            messagebox.showerror("Import Error", str(e))
            return

        source_path = filedialog.askopenfilename(
            title="Select Deepgram DOCX Transcript",
            filetypes=[("Word Documents", "*.docx"), ("All files", "*.*")])
        if not source_path:
            return

        output_path = filedialog.asksaveasfilename(
            title="Save UFM Transcript As",
            defaultextension=".docx",
            filetypes=[("Word Documents", "*.docx"), ("All files", "*.*")],
            initialfile=f"transcript_{job_config.cause_number.replace('/', '-')}_UFM.docx")
        if not output_path:
            return

        self._fmt_badge.set("processing")

        def _worker():
            from spec_engine.run_logger import RunLogger
            cause = getattr(job_config, "cause_number", "") or "unknown"

            with RunLogger(cause_number=cause) as run_log:
                try:
                    result = process_transcript(
                        input_docx_path=source_path,
                        output_docx_path=output_path,
                        job_config=job_config,
                        progress_callback=lambda m: (run_log.log_step(m), LOGGER.info(f"[SPEC] {m}")),
                        run_logger=run_log,
                    )
                    self._last_run_dir = run_log.run_dir
                    summary = (
                        f"Complete!\n\n"
                        f"Blocks: {result['block_count']}\n"
                        f"Corrections: {result['correction_count']}\n"
                        f"Flags: {result['flag_count']}\n"
                        f"Saved: {output_path}"
                    )
                    self._ui(self._fmt_badge.set, "ready")
                    self._last_ufm_output_path = output_path
                    self._save_session("last_ufm_output_path", output_path)
                    self._last_spec_flags = result.get("flags", [])
                    self._ui(self._refresh_flag_panel)
                    self._ui(lambda: self._review_btn.configure(state="normal"))
                    self._ui(messagebox.showinfo, "Spec Process Complete", summary)
                    if sys.platform == "win32":
                        self._ui(os.startfile, output_path)
                except SpeakerMapUnverifiedError as exc:
                    run_log.log_error("Speaker map not verified", exc=exc)
                    self._ui(self._fmt_badge.set, "error")
                    self._ui(messagebox.showerror, "Speaker Map Error", str(exc))
                except Exception as exc:
                    run_log.log_error("Processing failed", exc=exc)
                    self._ui(self._fmt_badge.set, "error")
                    self._ui(messagebox.showerror, "Failed", str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    def _run_spec_process(self):
        """
        Spec Process (UFM) — opens JobConfigDialog, then runs the full
        spec_engine pipeline to produce a court-ready Texas UFM DOCX.
        """
        try:
            from spec_engine.document_builder import process_transcript
            from spec_engine.models import SpeakerMapUnverifiedError
        except ImportError as e:
            messagebox.showerror("spec_engine Not Found",
                f"spec_engine package is missing:\n{e}\n"
                "Complete Phases 2-3 of the implementation first.")
            return

        auto_docx = (
            self._output_paths.get("auto_docx", "")
            or self._session.get("last_auto_docx_path", "")
        )
        session_path = self._session.get("audio_path", "")
        if auto_docx and os.path.exists(auto_docx):
            source_path = auto_docx
            self._log_msg(f"Using auto-DOCX: {os.path.basename(auto_docx)}")
        elif (session_path
              and session_path.lower().endswith(".docx")
              and os.path.exists(session_path)):
            source_path = session_path
        else:
            source_path = filedialog.askopenfilename(
                title="Select Deepgram DOCX Transcript",
                filetypes=[("Word Documents", "*.docx"), ("All files", "*.*")])
            if not source_path:
                return

        # Pre-populate dialog from any extracted fields
        if self._extracted_fields:
            try:
                from spec_engine.models import JobConfig, CounselInfo
                pre_cfg = JobConfig()
                _f = self._extracted_fields
                for attr in [
                    "cause_number", "appellate_cause_number",
                    "case_style", "plaintiff_name", "defendant_names",
                    "court", "county", "judicial_district",
                    "proceeding_type", "depo_date", "depo_start_time",
                    "depo_end_time", "location_city", "method",
                    "witness_name", "witness_title", "judge_name",
                    "reporter_name", "reporter_csr", "reporter_expiration",
                    "reporter_firm", "reporter_address", "reporter_phone",
                    "firm_registration",
                ]:
                    val = _f.get(attr)
                    if val and hasattr(pre_cfg, attr):
                        setattr(pre_cfg, attr, val)
                for counsel_key, cfg_attr in [
                    ("plaintiff_counsel", "plaintiff_counsel"),
                    ("defense_counsel", "defense_counsel"),
                ]:
                    raw = _f.get(counsel_key, [])
                    if raw:
                        parsed = []
                        for c in raw:
                            if isinstance(c, dict) and c.get("name"):
                                parsed.append(CounselInfo(**{
                                    "name": c.get("name", ""),
                                    "firm": c.get("firm", ""),
                                    "sbot": c.get("sbot", ""),
                                    "address": c.get("address", ""),
                                    "city": c.get("city", ""),
                                    "state": c.get("state", "Texas"),
                                    "zip_code": c.get("zip_code", ""),
                                    "phone": c.get("phone", ""),
                                    "party": c.get("party", ""),
                                    "role": c.get("role", ""),
                                }))
                        if parsed:
                            setattr(pre_cfg, cfg_attr, parsed)
                dialog = JobConfigDialog(self, existing_config=pre_cfg)
            except Exception:
                dialog = JobConfigDialog(self)
        else:
            dialog = JobConfigDialog(self)
        try:
            dialog.title(f"Spec Process — {os.path.basename(source_path)}")
        except Exception:
            pass
        self.wait_window(dialog)
        job_config = dialog.get_result()

        if job_config is None:
            return  # User cancelled

        try:
            saved_path = job_config.save()
            LOGGER.info(f"[SPEC] JobConfig auto-saved: {saved_path}")
        except Exception as _save_err:
            LOGGER.warning(f"[SPEC] JobConfig auto-save failed (non-fatal): {_save_err}")

        # MANDATORY: Parse blocks for speaker preview, then verify map
        try:
            from spec_engine.parser import parse_blocks
            preview_blocks = parse_blocks(source_path)
        except Exception:
            preview_blocks = []

        if not preview_blocks:
            messagebox.showerror(
                "Cannot Parse Source File",
                "The source file could not be parsed into speaker blocks.\n\n"
                "Ensure the file is a Deepgram-format .docx with 'Speaker N:' labels "
                "(e.g. 'Speaker 0:', 'Speaker 1:') on their own lines.\n\n"
                "Processing aborted — no output was produced."
            )
            self._fmt_badge.set("error")
            return

        verify_dialog = SpeakerVerifyDialog(self, preview_blocks, job_config)
        self.wait_window(verify_dialog)
        if not verify_dialog.was_confirmed():
            messagebox.showinfo(
                "Processing Cancelled",
                "Speaker map was not confirmed. Processing aborted.\n\n"
                "No output was produced."
            )
            return

        if not getattr(job_config, "speaker_map_verified", False):
            messagebox.showerror(
                "Speaker Map Error",
                "Speaker map verification did not complete successfully.\n\n"
                "Processing aborted. Please try again and confirm the speaker assignments."
            )
            return

        # Ask where to save the output DOCX
        output_path = filedialog.asksaveasfilename(
            title="Save UFM Transcript As",
            defaultextension=".docx",
            filetypes=[("Word Documents", "*.docx"), ("All files", "*.*")],
            initialfile=f"transcript_{job_config.cause_number.replace('/', '-')}_UFM.docx")
        if not output_path:
            return

        # Run the pipeline in a background thread
        self._fmt_badge.set("processing")
        progress_lines = []

        def _worker():
            from spec_engine.run_logger import RunLogger
            cause = getattr(job_config, "cause_number", "") or "unknown"

            with RunLogger(cause_number=cause) as run_log:
                try:
                    def _log(msg):
                        progress_lines.append(msg)
                        run_log.log_step(msg)
                        LOGGER.info(f"[SPEC] {msg}")

                    result = process_transcript(
                        input_docx_path=source_path,
                        output_docx_path=output_path,
                        job_config=job_config,
                        progress_callback=_log,
                        run_logger=run_log,
                    )
                    self._last_run_dir = run_log.run_dir
                    summary = (
                        f"Spec Process complete!\n\n"
                        f"Blocks processed: {result['block_count']}\n"
                        f"Corrections applied: {result['correction_count']}\n"
                        f"Scopist flags: {result['flag_count']}\n"
                        f"Post-record spellings: {result['post_record_count']}\n\n"
                        f"Saved to:\n{output_path}"
                    )
                    self._ui(self._fmt_badge.set, "ready")
                    self._last_ufm_output_path = output_path
                    self._save_session("last_ufm_output_path", output_path)
                    self._last_spec_flags = result.get("flags", [])
                    try:
                        from spec_engine.models import JobConfig as _JC
                        saved_jobs = sorted(
                            Path("jobs").glob("*_job.json"),
                            key=lambda p: p.stat().st_mtime, reverse=True)
                        if saved_jobs:
                            _cfg = _JC.load(str(saved_jobs[0]))
                            _cfg.spec_flags = self._last_spec_flags
                            _cfg.save()
                    except Exception:
                        pass
                    self._ui(self._refresh_flag_panel)
                    self._ui(lambda: self._review_btn.configure(state="normal"))
                    self._ui(messagebox.showinfo, "Spec Process Complete", summary)
                    if sys.platform == "win32":
                        self._ui(os.startfile, output_path)

                except SpeakerMapUnverifiedError as e:
                    run_log.log_error("Speaker map not verified", exc=e)
                    self._ui(self._fmt_badge.set, "error")
                    self._ui(messagebox.showerror, "Speaker Map Error", str(e))
                except Exception as exc:
                    run_log.log_error("Processing failed", exc=exc)
                    self._ui(self._fmt_badge.set, "error")
                    self._ui(messagebox.showerror, "Spec Process Failed",
                             f"{type(exc).__name__}: {exc}")

        threading.Thread(target=_worker, daemon=True).start()

    def _on_format_transcript_click(self):
        use_ai = False
        if hasattr(self, "_use_ai_var"):
            try:
                use_ai = bool(self._use_ai_var.get())
            except Exception:
                use_ai = False
        self._run_format(use_ai=use_ai)

    def _open_diff_viewer(self):
        """Open the diff.txt from the last successful Spec Process run."""
        if not self._last_run_dir:
            messagebox.showinfo(
                "No Run Available",
                "No Spec Process run has completed yet in this session.",
            )
            return
        diff_path = Path(self._last_run_dir) / "diff.txt"
        if not diff_path.exists():
            messagebox.showinfo(
                "Diff Not Found",
                f"diff.txt not found in:\n{self._last_run_dir}",
            )
            return

        dlg = ctk.CTkToplevel(self)
        dlg.title("Corrections Applied — Before / After")
        dlg.geometry("860x620")
        dlg.grab_set()

        ctk.CTkLabel(
            dlg,
            text="Changes applied during Spec Process  "
                 f"(run: {Path(self._last_run_dir).name})",
            font=F_SMALL,
            text_color=TEXT_MUTED,
        ).pack(padx=16, pady=(12, 4), anchor="w")

        box = ctk.CTkTextbox(
            dlg,
            font=F_MONO_S,
            fg_color=BG_INPUT,
            text_color=TEXT_DARK,
            border_width=1,
            border_color=BORDER_LIGHT,
        )
        box.pack(fill="both", expand=True, padx=12, pady=(0, 8))

        try:
            content = diff_path.read_text(encoding="utf-8")
            box.insert("1.0", content or "(No differences detected)")
        except Exception as exc:
            box.insert("1.0", f"(Could not read diff file: {exc})")
        box.configure(state="disabled")

        SecondaryBtn(
            dlg,
            text="Open Log Folder",
            command=lambda: os.startfile(str(self._last_run_dir)),
        ).pack(padx=12, pady=(0, 12))

    def _run_format(self, use_ai: bool = False):
        text = self._get_preview_text()
        if not text and not getattr(self, "_last_blocks", None):
            messagebox.showinfo("Nothing to format", "Load a transcript first.")
            return
        if getattr(self, "_format_running", False):
            return
        self._format_running = True
        self._fmt_badge.set("processing")
        source_path = (
            self._output_paths.get("transcript_corrected")
            or self._output_paths.get("transcript")
            or self._session.get("audio_path", "")
        )
        self._log_msg("Rules Engine: starting format pass...")
        LOGGER.info(
            "Rules Engine start | chars=%s lines=%s source=%s save_dir=%s",
            len(text),
            len(text.splitlines()),
            source_path,
            self._save_dir_var.get(),
        )
        self._trace(
            f"Rules Engine start | chars={len(text)} lines={len(text.splitlines())} "
            f"source={source_path} save_dir={self._save_dir_var.get()}"
        )

        def _worker():
            try:
                if getattr(self, "_last_blocks", None):
                    blocks = list(self._last_blocks)
                    self._ui(
                        self._log_msg,
                        f"[FORMAT] Using {len(blocks)} structured block(s).",
                    )
                else:
                    raw_text = text or ""
                    if not raw_text.strip():
                        self._ui(self._log_msg, "[FORMAT] No transcript text found.")
                        return
                    from pipeline.block_builder import build_blocks_from_text

                    blocks = build_blocks_from_text(raw_text)
                    self._ui(
                        self._log_msg,
                        f"[FORMAT] Built {len(blocks)} block(s) from raw text.",
                    )

                self._ui(self._set_progress, 20, "Running Rules Engine...")
                self._ui(self._log_msg, "[FORMAT] Running spec_engine corrections...")

                from spec_engine.processor import process_blocks
                from formatter import format_blocks

                job_config = self._get_current_job_config()
                corrected = process_blocks(blocks, job_config)

                changes = sum(
                    1
                    for block in corrected
                    if block.meta.get("corrections")
                )
                self._ui(
                    self._log_msg,
                    f"[FORMAT] Spec Engine: {changes} of {len(corrected)} block(s) corrected.",
                )

                if use_ai:
                    self._ui(self._set_progress, 55, "Running AI Enhancement...")
                    self._ui(self._log_msg, "[FORMAT] Running AI block correction...")
                    from ai_tools import correct_blocks_with_ai

                    proper_nouns = [n.strip() for n in self._proper_nouns if n.strip()]
                    corrected = correct_blocks_with_ai(
                        corrected,
                        proper_nouns=proper_nouns,
                        dash_style=self._dash_var.get(),
                        job_config_fields={
                            "cause_number": getattr(job_config, "cause_number", ""),
                            "speaker_map": getattr(job_config, "speaker_map", {}),
                            "witness_name": getattr(job_config, "witness_name", ""),
                        },
                    )
                    self._ui(self._log_msg, "[FORMAT] AI Enhancement complete.")

                self._ui(self._set_progress, 80, "Rendering transcript...")
                result = format_blocks(corrected)

                try:
                    from utils.diff_viewer import diff_summary, generate_diff

                    self._last_diff = generate_diff(text or "", result)
                    self._ui(self._log_msg, f"[FORMAT] Diff: {diff_summary(text or '', result)}")
                except Exception:
                    self._last_diff = ""

                changed_lines = sum(
                    1 for a, b in zip((text or "").splitlines(), result.splitlines()) if a != b
                ) + abs(len(result.splitlines()) - len((text or "").splitlines()))
                LOGGER.info(
                    "Rules Engine complete | output_chars=%s output_lines=%s changed_lines=%s",
                    len(result),
                    len(result.splitlines()),
                    changed_lines,
                )
                self._trace(
                    f"Rules Engine complete | output_chars={len(result)} "
                    f"output_lines={len(result.splitlines())} changed_lines={changed_lines}"
                )
                self._last_blocks = corrected
                self._ui(
                    self._log_msg,
                    f"[FORMAT] ✅ Format Transcript complete — {changed_lines} line(s) changed.",
                )
                self._ui(self._store_pending_corrections, result, "Format Transcript")
                self._ui(self._fmt_badge.set, "draft")
                self._ui(self._set_progress, 100, "Format complete.")
            except Exception:
                self._trace("Format Transcript failed — see stack trace in logs.", level="error")
                LOGGER.exception("Format Transcript failed")
                self._ui(self._log_msg, "[FORMAT] ❌ Format Transcript failed — see logs for details.")
                self._ui(self._fmt_badge.set, "error")
                raise
            finally:
                self._format_running = False

        threading.Thread(target=_worker, daemon=True).start()

    def _run_ai(self):
        text = self._get_preview_text()
        if not text:
            messagebox.showinfo("Nothing to process",
                                "Load a transcript first.")
            return
        if not os.getenv("ANTHROPIC_API_KEY", "").strip():
            messagebox.showerror("API Key Missing",
                                 "ANTHROPIC_API_KEY is not set in .env file.")
            return
        if getattr(self, "_ai_running", False):
            messagebox.showinfo(
                "Already Running",
                "AI Legal Correction is already in progress.\n"
                "Please wait for it to complete."
            )
            return
        self._ai_running = True
        self._fmt_badge.set("processing")

        pn_text = self._pn_box.get("1.0", "end").strip()
        proper_nouns = [n.strip() for n in pn_text.splitlines() if n.strip()]
        if not proper_nouns and getattr(self, "_proper_nouns", []):
            proper_nouns = list(self._proper_nouns)
            LOGGER.info(
                "AI tool: using cached proper_nouns (pn_box was empty) count=%s",
                len(proper_nouns)
            )
            self._trace(
                f"AI Legal Correction using cached proper_nouns | count={len(proper_nouns)}"
            )
        dash_style = self._dash_var.get()
        cfg = self._get_current_job_config()
        source_path = (
            self._output_paths.get("transcript_corrected")
            or self._output_paths.get("transcript")
            or self._session.get("audio_path", "")
        )
        self._log_msg("AI Legal Correction: starting...")
        LOGGER.info(
            "AI Legal Correction start | chars=%s lines=%s nouns=%s source=%s witness=%s cause=%s reporter=%s",
            len(text),
            len(text.splitlines()),
            len(proper_nouns),
            source_path,
            cfg.witness_name,
            cfg.cause_number,
            cfg.reporter_name,
        )
        self._trace(
            "AI Legal Correction start | "
            f"chars={len(text)} lines={len(text.splitlines())} nouns={len(proper_nouns)} "
            f"source={source_path} witness={cfg.witness_name} "
            f"cause={cfg.cause_number} reporter={cfg.reporter_name}"
        )
        LOGGER.info(
            "AI Legal Correction inputs | keyword_docs=%s pn_box_chars=%s speaker_map_keys=%s",
            [Path(p).name for p in self._kw_doc_paths],
            len(pn_text),
            sorted(list(cfg.speaker_map.keys())) if cfg.speaker_map else [],
        )
        self._trace(
            "AI Legal Correction inputs | "
            f"keyword_docs={[Path(p).name for p in self._kw_doc_paths]} "
            f"pn_box_chars={len(pn_text)} "
            f"speaker_map_keys={sorted(list(cfg.speaker_map.keys())) if cfg.speaker_map else []}"
        )

        def _worker():
            try:
                job_fields = {
                    "reporter_name": cfg.reporter_name,
                    "cause_number": cfg.cause_number,
                    "judicial_district": cfg.judicial_district,
                    "witness_name": cfg.witness_name,
                    "plaintiff_name": cfg.plaintiff_name,
                    "defendant_names": cfg.defendant_names,
                    "speaker_map": cfg.speaker_map,
                    "plaintiff_counsel": getattr(cfg, "plaintiff_counsel", []),
                    "defense_counsel": getattr(cfg, "defense_counsel", []),
                }
                if getattr(self, "_last_blocks", None):
                    from ai_tools import correct_blocks_with_ai
                    from formatter import format_blocks

                    corrected_blocks = correct_blocks_with_ai(
                        self._last_blocks,
                        proper_nouns=proper_nouns,
                        dash_style=dash_style,
                        job_config_fields=job_fields,
                    )
                    result = format_blocks(corrected_blocks)
                    self._last_blocks = corrected_blocks
                else:
                    result = run_ai_tool(
                        transcript_text=text,
                        proper_nouns=proper_nouns,
                        dash_style=dash_style,
                        job_config_fields=job_fields,
                    )
                changed_lines = sum(
                    1 for a, b in zip(text.splitlines(), result.splitlines()) if a != b
                ) + abs(len(result.splitlines()) - len(text.splitlines()))
                LOGGER.info(
                    "AI Legal Correction complete | output_chars=%s output_lines=%s changed_lines=%s",
                    len(result),
                    len(result.splitlines()),
                    changed_lines,
                )
                self._trace(
                    f"AI Legal Correction complete | output_chars={len(result)} "
                    f"output_lines={len(result.splitlines())} changed_lines={changed_lines}"
                )
                self._ui(self._log_msg, f"AI Legal Correction complete — {changed_lines} line(s) changed.")
                self._ui(self._store_pending_corrections, result, "AI Legal Correction")
                self._ui(self._fmt_badge.set, "draft")
            except Exception as exc:
                self._trace(f"AI Legal Correction failed: {type(exc).__name__}: {exc}", level="error")
                LOGGER.exception("AI Legal Correction failed")
                self._ui(self._log_msg, f"AI Legal Correction failed: {type(exc).__name__}")
                self._ui(self._fmt_badge.set, "error")
                self._ui(messagebox.showerror,
                         "AI Correction Failed", str(exc))
            finally:
                self._ai_running = False

        threading.Thread(target=_worker, daemon=True).start()

    def _store_pending_corrections(self, corrected_text: str, source: str):
        """Hold corrected text for review — does NOT touch the live transcript."""
        self._pending_corrections = corrected_text
        self._pending_source = source
        original = self._get_preview_text()
        orig_lines = original.splitlines()
        new_lines = corrected_text.splitlines()
        changed = sum(1 for a, b in zip(orig_lines, new_lines) if a != b)
        changed += abs(len(new_lines) - len(orig_lines))
        LOGGER.info(
            "Pending corrections stored | source=%s original_lines=%s new_lines=%s changed_lines=%s",
            source,
            len(orig_lines),
            len(new_lines),
            changed,
        )
        self._trace(
            f"Pending corrections stored | source={source} original_lines={len(orig_lines)} "
            f"new_lines={len(new_lines)} changed_lines={changed}"
        )
        self._pending_count_lbl.configure(
            text=f"Source: {source}\n~{changed} line(s) differ.\n"
                 "Click Apply to commit or Discard to cancel.",
            text_color=AMBER)
        self._pending_banner.configure(fg_color="#FFF3CD", border_color=AMBER)
        self._apply_btn.configure(
            state="normal",
            fg_color=GOLD,
            text="▶  Apply Corrections  ←  Click here to apply",
        )
        self._discard_btn.configure(state="normal")

    def _apply_pending_corrections(self):
        """Commit stored corrections to the live transcript."""
        if self._pending_corrections is None:
            return
        LOGGER.info(
            "Applying pending corrections | source=%s chars=%s lines=%s",
            self._pending_source,
            len(self._pending_corrections),
            len(self._pending_corrections.splitlines()),
        )
        self._trace(
            f"Applying pending corrections | source={self._pending_source} "
            f"chars={len(self._pending_corrections)} lines={len(self._pending_corrections.splitlines())}"
        )
        self._push_undo(self._get_preview_text())
        self._load_preview(self._pending_corrections)
        self._save_session("transcript", self._pending_corrections)
        self._pending_corrections = None
        self._pending_source = ""
        self._pending_count_lbl.configure(
            text="Corrections applied successfully.",
            text_color=GREEN)
        self._pending_banner.configure(fg_color="#E8F5E9", border_color=GREEN)
        self._apply_btn.configure(
            state="disabled",
            fg_color=NAVY,
            text="Apply Corrections",
        )
        self._discard_btn.configure(state="disabled")
        self._top_badge.set("ready")
        self._fmt_badge.set("ready")
        self.after(3500, lambda: self._reset_pending_banner())

    def _discard_pending_corrections(self):
        """Throw away pending corrections — live transcript is untouched."""
        LOGGER.info("Discarding pending corrections | source=%s", self._pending_source)
        self._trace(f"Discarding pending corrections | source={self._pending_source}")
        self._pending_corrections = None
        self._pending_source = ""
        self._pending_count_lbl.configure(
            text="Changes discarded. Transcript unchanged.",
            text_color=TEXT_MUTED)
        self._pending_banner.configure(fg_color=BG_INPUT, border_color=BORDER_MID)
        self._apply_btn.configure(
            state="disabled",
            fg_color=NAVY,
            text="Apply Corrections",
        )
        self._discard_btn.configure(state="disabled")
        self.after(2500, lambda: self._reset_pending_banner())

    def _reset_pending_banner(self):
        """Return the pending-review banner to its idle state."""
        if self._pending_corrections is None:
            self._pending_count_lbl.configure(
                text="No pending corrections.", text_color=TEXT_MUTED)
            self._pending_banner.configure(
                fg_color=BG_INPUT, border_color=BORDER_MID)

    def _run_word_review(self):
        text = self._get_preview_text()
        if not text:
            return
        self._push_undo(text)
        pn_text = self._pn_box.get("1.0", "end").strip()
        proper_nouns = [n.strip() for n in pn_text.splitlines() if n.strip()]
        if not proper_nouns and getattr(self, "_proper_nouns", []):
            proper_nouns = list(self._proper_nouns)
            LOGGER.info(
                "Word review: using cached proper_nouns (pn_box was empty) count=%s",
                len(proper_nouns)
            )
            self._trace(
                f"Word Review using cached proper_nouns | count={len(proper_nouns)}"
            )
        source_path = (
            self._output_paths.get("transcript_corrected")
            or self._output_paths.get("transcript")
            or self._session.get("audio_path", "")
        )
        self._log_msg("Word Review: starting...")
        LOGGER.info(
            "Word Review start | chars=%s lines=%s nouns=%s source=%s",
            len(text),
            len(text.splitlines()),
            len(proper_nouns),
            source_path,
        )
        self._trace(
            f"Word Review start | chars={len(text)} lines={len(text.splitlines())} "
            f"nouns={len(proper_nouns)} source={source_path}"
        )

        def _worker():
            try:
                result = run_ai_review_tool(
                    transcript_text=text,
                    proper_nouns=proper_nouns,
                    dash_style=self._dash_var.get())
                LOGGER.info(
                    "Word Review complete | output_chars=%s output_lines=%s",
                    len(result),
                    len(result.splitlines()),
                )
                self._trace(
                    f"Word Review complete | output_chars={len(result)} "
                    f"output_lines={len(result.splitlines())}"
                )
                self._ui(self._log_msg, "Word Review complete.")
                self._ui(self._load_preview, result)
            except Exception as exc:
                self._trace(f"Word Review failed: {type(exc).__name__}: {exc}", level="error")
                LOGGER.exception("Word Review failed")
                self._ui(self._log_msg, f"Word Review failed: {type(exc).__name__}")
                self._ui(messagebox.showerror, "Word Review Failed", str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    def _undo_last(self):
        if self._undo_stack:
            self._load_preview(self._undo_stack.pop())
            if not self._undo_stack:
                self._undo_btn.configure(state="disabled")

    def _import_nouns_doc(self):
        """Import names from a PDF or Word doc. Updates master name list for speaker dialog."""
        path = filedialog.askopenfilename(
            title="Import Names from Document",
            filetypes=[("Documents", "*.pdf *.docx *.txt"),
                       ("All files", "*.*")])
        if not path:
            return

        def _worker():
            try:
                if path.lower().endswith(".pdf"):
                    nouns = extract_proper_nouns_from_pdf(path)
                elif path.lower().endswith(".docx"):
                    nouns = extract_proper_nouns_from_docx(path)
                else:
                    nouns = self._fallback_noun_extract(
                        load_transcript(path).text)

                def _done():
                    existing = [n for n in
                                self._pn_box.get("1.0", "end").splitlines()
                                if n.strip()]
                    seen: set = set()
                    deduped = [n for n in existing + nouns
                               if n.lower() not in seen
                               and not seen.add(n.lower())]
                    self._pn_box.delete("1.0", "end")
                    self._pn_box.insert("1.0", "\n".join(deduped))
                    self._nouns_box.delete("1.0", "end")
                    self._nouns_box.insert("1.0", "\n".join(deduped))
                    self._populate_ufm_table(deduped, self._ufm_field_vars)
                    self._proper_nouns = deduped
                    messagebox.showinfo(
                        "Import Complete",
                        f"{len(deduped)} name(s) loaded.\n"
                        "Names will appear in the Speaker Roles dropdown.")
                self._ui(_done)
            except Exception as exc:
                self._ui(messagebox.showerror, "Import Failed", str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    # ── Build actions ──────────────────────────────────────────────────────────

    def _insert_at_cursor(self, page_text: str):
        try:
            idx = self._build_preview.index("insert")
        except Exception:
            idx = "end"
        self._build_preview.insert(idx, f"\n\n{page_text}\n\n")

    def _read_ufm_table_fields(self) -> dict:
        """
        Read the current live values from the UFM field table widgets.
        """
        try:
            vars_ = getattr(self, "_ufm_field_vars", {})
        except Exception:
            return {}
        if not vars_:
            return {}

        table_to_job = {
            "Case Style": "case_style",
            "Cause Number": "cause_number",
            "Court": "court",
            "County": "county",
            "Judicial District": "judicial_district",
            "Plaintiff Name": "plaintiff_name",
            "Defendant Name(s)": "defendant_names",
            "Proceeding Type": "proceeding_type",
            "Depo Date": "depo_date",
            "Start Time": "depo_start_time",
            "End Time": "depo_end_time",
            "Location": "location_city",
            "Method": "method",
            "Volume": "volume_number",
            "Witness": "witness_name",
            "Judge": "judge_name",
            "Plaintiff Counsel": "_ufm_plaintiff_counsel",
            "Defense Counsel": "_ufm_defense_counsel",
            "Also Present": "also_present",
            "Reporter Name": "reporter_name",
            "CSR No.": "reporter_csr",
            "CSR Expiration": "reporter_expiration",
            "Reporter Firm": "reporter_firm",
            "Reporter Phone": "reporter_phone",
            "Firm Registration": "firm_registration",
            "Cost Total": "cost_total",
            "Cost Paid By": "cost_paid_by",
            "Certified Date": "certified_date",
        }

        result = {}
        try:
            for table_label, job_key in table_to_job.items():
                var = vars_.get(table_label)
                if var is None:
                    continue
                val = var.get().strip()
                if not val:
                    continue

                if job_key == "_ufm_plaintiff_counsel":
                    result["_ufm_plaintiff_names"] = val
                elif job_key == "_ufm_defense_counsel":
                    result["_ufm_defense_names"] = val
                elif job_key == "defendant_names":
                    result["defendant_names"] = [
                        n.strip() for n in val.replace(";", "\n").splitlines()
                        if n.strip()
                    ]
                elif job_key == "also_present":
                    result["also_present"] = [
                        n.strip() for n in val.replace(";", "\n").splitlines()
                        if n.strip()
                    ]
                else:
                    result[job_key] = val
        except Exception:
            return {}

        return result

    def _get_current_job_config(self):
        """
        Return a JobConfig merged from the most recent saved job,
        current extracted fields, and any in-session exhibit edits.
        """
        from pathlib import Path
        from spec_engine.models import JobConfig

        cfg = JobConfig()
        try:
            jobs_dir = Path("jobs")
            if jobs_dir.exists():
                candidates = sorted(
                    jobs_dir.glob("*_job.json"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                if candidates:
                    cfg = JobConfig.load(str(candidates[0]))
        except Exception:
            pass

        extracted = getattr(self, "_extracted_fields", {})
        if extracted:
            simple_fields = [
                "cause_number", "appellate_cause_number", "case_style",
                "plaintiff_name", "county", "judicial_district", "court",
                "court_type", "depo_date", "depo_start_time", "depo_end_time",
                "location", "location_city", "method", "witness_name",
                "judge_name", "reporter_name", "reporter_csr",
                "reporter_expiration", "reporter_firm", "reporter_address",
                "reporter_phone", "firm_registration", "cost_total",
                "cost_paid_by", "certified_date",
            ]
            for key in simple_fields:
                val = extracted.get(key, "")
                if val and not getattr(cfg, key, ""):
                    setattr(cfg, key, val)

        if hasattr(self, "_job_exhibits") and self._job_exhibits:
            cfg.exhibits = self._job_exhibits

        ufm_live = self._read_ufm_table_fields()
        if ufm_live:
            simple_ufm = [
                "case_style", "cause_number", "court", "county",
                "judicial_district", "proceeding_type", "depo_date",
                "depo_start_time", "depo_end_time", "location_city",
                "method", "witness_name", "judge_name", "reporter_name",
                "reporter_csr", "reporter_expiration", "reporter_firm",
                "reporter_phone", "firm_registration", "cost_total",
                "cost_paid_by", "certified_date",
            ]
            for key in simple_ufm:
                val = ufm_live.get(key, "")
                if val:
                    setattr(cfg, key, val)

            if ufm_live.get("defendant_names"):
                cfg.defendant_names = ufm_live["defendant_names"]
            if ufm_live.get("also_present"):
                cfg.also_present = ufm_live["also_present"]
            pn = ufm_live.get("plaintiff_name", "")
            if pn:
                cfg.plaintiff_name = pn

        return cfg

    def _insert_docx_preview(self, doc, label: str):
        """
        Extract visible text from a generated Document and insert it
        into the build preview at the cursor position.
        """
        lines = []
        for para in doc.paragraphs:
            if para.text:
                lines.append(para.text)
        for table in doc.tables:
            for row in table.rows:
                cells = row.cells
                if len(cells) == 2:
                    line_num = cells[0].text.strip()
                    content = cells[1].text
                    lines.append(f"{line_num:>3}  {content}")
        preview_text = "\n".join(lines)
        self._insert_at_cursor(f"── {label} ──\n{preview_text}\n")

    def _insert_title_page(self):
        """Insert title/caption pages from JobConfig into preview."""
        from spec_engine.pages.title_page import write_title_page
        from spec_engine.emitter import create_document, add_page_break
        from spec_engine.pages.caption import write_caption

        cfg = self._get_current_job_config()
        doc = create_document()
        write_title_page(doc, cfg)
        add_page_break(doc)
        write_caption(doc, cfg)
        self._insert_docx_preview(doc, "Title / Caption")

    def _insert_appearances(self):
        """Insert appearances page from JobConfig into preview."""
        from spec_engine.pages.caption import write_caption
        from spec_engine.emitter import create_document

        cfg = self._get_current_job_config()
        doc = create_document()
        write_caption(doc, cfg)
        self._insert_docx_preview(doc, "Appearances")

    def _insert_index(self):
        """Insert witness + exhibit index pages from JobConfig into preview."""
        from spec_engine.pages.witness_index import write_witness_index
        from spec_engine.pages.exhibit_index import write_exhibit_index
        from spec_engine.emitter import create_document, add_page_break

        cfg = self._get_current_job_config()
        if hasattr(self, "_job_exhibits") and self._job_exhibits:
            cfg.exhibits = self._job_exhibits
        doc = create_document()
        write_witness_index(doc, cfg)
        add_page_break(doc)
        write_exhibit_index(doc, cfg)
        self._insert_docx_preview(doc, "Index")

    def _open_exhibit_manager(self):
        """Open the Exhibit Manager dialog."""
        dlg = ExhibitManagerDialog(self, self._job_exhibits)
        self.wait_window(dlg)
        if dlg.result is not None:
            self._job_exhibits = dlg.result
            self._refresh_exhibit_summary()

    def _refresh_exhibit_summary(self):
        count = len([e for e in self._job_exhibits if e.number or e.description])
        if count == 0:
            text = "No exhibits added."
        elif count == 1:
            text = "1 exhibit entered."
        else:
            text = f"{count} exhibits entered."
        try:
            self._exhibit_summary_lbl.configure(text=text)
        except Exception:
            pass

    def _refresh_flag_panel(self):
        """
        Rebuild the Scopist Flag Review panel from self._last_spec_flags.
        """
        for widget in self._flag_scroll.winfo_children():
            widget.destroy()

        flags = getattr(self, "_last_spec_flags", [])
        if not flags:
            try:
                from spec_engine.models import JobConfig

                saved = sorted(
                    Path("jobs").glob("*_job.json"),
                    key=lambda p: p.stat().st_mtime, reverse=True)
                if saved:
                    cfg = JobConfig.load(str(saved[0]))
                    flags = cfg.spec_flags or []
                    self._last_spec_flags = flags
            except Exception:
                pass

        if not flags:
            ctk.CTkLabel(
                self._flag_scroll,
                text="No flags generated. Run Spec Process (UFM) first.",
                font=F_SMALL,
                text_color=TEXT_MUTED,
            ).grid(row=0, column=0, padx=8, pady=16)
            try:
                self._flag_count_lbl.configure(text="No flags", text_color=TEXT_MUTED)
            except Exception:
                pass
            return

        cfg = self._get_current_job_config()
        cause = cfg.cause_number or "_default"
        resolved_set = self._flag_resolved.get(cause, set())

        category_colors = {
            "post_record": ("#7c3aed", "#ede9fe"),
            "general": ("#b45309", "#fef3c7"),
            "date": ("#0369a1", "#e0f2fe"),
            "exhibit": ("#065f46", "#d1fae5"),
            "conflict": ("#be123c", "#ffe4e6"),
        }

        pending_count = sum(1 for f in flags if f.number not in resolved_set)
        resolved_count = len(flags) - pending_count
        try:
            if pending_count == 0:
                status_text = f"✓ All {len(flags)} flags resolved"
                status_color = GREEN
            else:
                status_text = f"{pending_count} pending · {resolved_count} resolved"
                status_color = AMBER
            self._flag_count_lbl.configure(text=status_text, text_color=status_color)
        except Exception:
            pass

        for row_idx, flag in enumerate(flags):
            is_resolved = flag.number in resolved_set
            row_bg = "#f0fdf4" if is_resolved else BG_CARD
            row_frame = ctk.CTkFrame(
                self._flag_scroll,
                fg_color=row_bg,
                border_width=1,
                border_color="#bbf7d0" if is_resolved else BORDER_LIGHT,
                corner_radius=6,
            )
            row_frame.grid(row=row_idx, column=0, sticky="ew", padx=4, pady=3)
            row_frame.columnconfigure(1, weight=1)

            cat = flag.category or "general"
            fg_col, bg_col = category_colors.get(cat, ("#374151", "#f3f4f6"))
            ctk.CTkLabel(
                row_frame,
                text=f"  {cat.upper().replace('_', ' ')}  ",
                font=("Segoe UI", 9, "bold"),
                text_color=fg_col,
                fg_color=bg_col,
                corner_radius=4,
            ).grid(row=0, column=0, padx=(8, 6), pady=(8, 2), sticky="nw")

            desc_text = f"Flag {flag.number}: {flag.description}"
            ctk.CTkLabel(
                row_frame,
                text=desc_text,
                font=("Segoe UI", 11),
                text_color=TEXT_DARK if not is_resolved else TEXT_MUTED,
                wraplength=360,
                justify="left",
                anchor="w",
            ).grid(row=0, column=1, sticky="ew", padx=(0, 8), pady=(8, 2))

            if flag.inline_text:
                preview = flag.inline_text if len(flag.inline_text) <= 80 else flag.inline_text[:77] + "..."
                ctk.CTkLabel(
                    row_frame,
                    text=preview,
                    font=("Courier New", 9),
                    text_color="#b45309",
                    wraplength=380,
                    justify="left",
                    anchor="w",
                ).grid(row=1, column=0, columnspan=2, sticky="ew", padx=8, pady=(0, 4))

            toggle_text = "✓ Resolved" if is_resolved else "Mark Resolved"
            toggle_fg = "#065f46" if is_resolved else NAVY

            def _make_toggle(fn_num=flag.number):
                def _toggle():
                    cause_key = self._get_current_job_config().cause_number or "_default"
                    rs = self._flag_resolved.setdefault(cause_key, set())
                    if fn_num in rs:
                        rs.discard(fn_num)
                    else:
                        rs.add(fn_num)
                    self._save_session(
                        "flag_resolved",
                        {k: list(v) for k, v in self._flag_resolved.items()},
                    )
                    self._refresh_flag_panel()
                return _toggle

            ctk.CTkButton(
                row_frame,
                text=toggle_text,
                command=_make_toggle(),
                width=110,
                height=26,
                fg_color="transparent",
                border_width=1,
                border_color=toggle_fg,
                text_color=toggle_fg,
                hover_color="#e0fdf4" if is_resolved else BORDER_LIGHT,
                font=("Segoe UI", 10),
            ).grid(row=0, column=2, padx=(0, 8), pady=6, sticky="e", rowspan=2)

    def _insert_changes(self):
        """Insert changes & signature pages from JobConfig into preview."""
        from spec_engine.pages.changes_signature import write_changes_signature
        from spec_engine.emitter import create_document

        cfg = self._get_current_job_config()
        doc = create_document()
        write_changes_signature(doc, cfg)
        self._insert_docx_preview(doc, "Changes & Signature")

    def _insert_certification(self):
        """Insert reporter's certification from JobConfig into preview."""
        from spec_engine.pages.certificate import write_certificate
        from spec_engine.emitter import create_document

        cfg = self._get_current_job_config()
        doc = create_document()
        write_certificate(doc, cfg)
        self._insert_docx_preview(doc, "Reporter's Certification")

    def _get_export_docx_path(self) -> str | None:
        """
        Return the path to the best available UFM DOCX to export.
        """
        save_dir = Path(self._save_dir_var.get())
        candidates = sorted(
            list(save_dir.glob("*_UFM.docx")) +
            list(save_dir.glob("transcript_*UFM*.docx")),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if candidates:
            return str(candidates[0])
        path = filedialog.askopenfilename(
            title="Select UFM Transcript DOCX",
            filetypes=[("Word Documents", "*.docx"), ("All files", "*.*")],
        )
        return path or None

    def _set_export_status(self, text: str, color: str = TEXT_MUTED):
        try:
            self._export_status_lbl.configure(text=text, text_color=color)
        except Exception:
            pass

    def _save_ufm_fields_to_job(self):
        """
        Save the current UFM table values into a JobConfig JSON and keep
        the live extracted-field cache aligned with those edits.
        """
        ufm_live = self._read_ufm_table_fields()
        if not ufm_live:
            try:
                self._save_fields_status_lbl.configure(
                    text="UFM table is empty — upload a NOD first.",
                    text_color=AMBER,
                )
            except Exception:
                pass
            return

        cfg = self._get_current_job_config()
        simple_fields = [
            "case_style", "cause_number", "court", "county",
            "judicial_district", "proceeding_type", "depo_date",
            "depo_start_time", "depo_end_time", "location_city",
            "method", "witness_name", "judge_name", "reporter_name",
            "reporter_csr", "reporter_expiration", "reporter_firm",
            "reporter_phone", "firm_registration", "cost_total",
            "cost_paid_by", "certified_date", "plaintiff_name",
        ]
        for key in simple_fields:
            val = ufm_live.get(key, "")
            if val:
                setattr(cfg, key, val)
        if ufm_live.get("defendant_names"):
            cfg.defendant_names = ufm_live["defendant_names"]
        if ufm_live.get("also_present"):
            cfg.also_present = ufm_live["also_present"]
        if hasattr(self, "_job_exhibits") and self._job_exhibits:
            cfg.exhibits = self._job_exhibits

        try:
            import dataclasses

            saved_path = cfg.save()
            self._extracted_fields.update({
                f.name: getattr(cfg, f.name)
                for f in dataclasses.fields(cfg)
                if isinstance(getattr(cfg, f.name), (str, int, float, bool))
                and getattr(cfg, f.name)
            })
            try:
                self._save_fields_status_lbl.configure(
                    text=f"Saved → {Path(saved_path).name}",
                    text_color=GREEN,
                )
            except Exception:
                pass
        except Exception as exc:
            try:
                self._save_fields_status_lbl.configure(
                    text=f"Save failed: {exc}",
                    text_color=RED,
                )
            except Exception:
                pass

    def _extract_data_to_session(self, retry_count: int = 0):
        """
        Copy the current UFM table values into the left-side Case Information
        fields and persist those extracted values for the rest of the workflow.
        """
        ufm_live = self._read_ufm_table_fields()
        if not ufm_live:
            if self._kw_doc_paths:
                if not self._doc_extraction_in_progress:
                    self._extract_nouns_from_docs()
                if retry_count < 5:
                    try:
                        self._extract_status_lbl.configure(
                            text="Extracting - please wait...",
                            text_color=AMBER,
                        )
                    except Exception:
                        pass
                    self.after(4000, lambda: self._extract_data_to_session(retry_count + 1))
                    return
                try:
                    self._extract_status_lbl.configure(
                        text="Extraction did not complete in time. Check the loaded documents or API key.",
                        text_color=RED,
                    )
                except Exception:
                    pass
                return
            try:
                self._extract_status_lbl.configure(
                    text="No extracted UFM data found — upload a PDF or DOCX first.",
                    text_color=AMBER,
                )
            except Exception:
                pass
            return

        case_field_map = {
            "case_style": "case_name",
            "cause_number": "cause_number",
            "witness_name": "deponent_name",
            "depo_date": "deposition_date",
        }

        applied_count = 0
        for source_key, case_key in case_field_map.items():
            value = ufm_live.get(source_key, "")
            if not value:
                continue
            text_value = str(value)
            try:
                if case_key in self._case_vars:
                    self._case_vars[case_key].set(text_value)
                self._save_session(f"case_{case_key}", text_value)
                applied_count += 1
            except Exception:
                pass

        merged_fields = dict(getattr(self, "_extracted_fields", {}) or {})
        merged_fields.update(ufm_live)
        self._extracted_fields = merged_fields
        self._save_session("extracted_fields", merged_fields)
        self._populate_data_table(merged_fields, getattr(self, "_proper_nouns", []))

        self._save_ufm_fields_to_job()

        try:
            self._extract_status_lbl.configure(
                text=f"Data extracted and stored — {applied_count} case field(s) applied.",
                text_color=GREEN,
            )
            self._save_case_btn.configure(state="normal")
        except Exception:
            pass

    def _build_case_folder_path(self) -> Path:
        """
        Build the filing path:
        SaveDir / YYYY / Mon / CauseNumber_WitnessLastname
        """
        save_dir = Path(self._save_dir_var.get().strip() or ".")
        fields = dict(getattr(self, "_extracted_fields", {}) or {})
        if not fields:
            fields = self._read_ufm_table_fields()

        depo_date_str = str(fields.get("depo_date", "") or "").strip()
        dt = None
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%m/%d/%y"):
            try:
                dt = datetime.strptime(depo_date_str, fmt)
                break
            except Exception:
                continue
        if dt is None:
            dt = datetime.now()

        cause = str(
            fields.get("cause_number")
            or self._case_vars.get("cause_number", ctk.StringVar()).get()
            or "UnknownCause"
        ).strip()
        cause_safe = "".join(c for c in cause if c.isalnum() or c in "-_") or "UnknownCause"

        witness = str(
            fields.get("witness_name")
            or self._case_vars.get("deponent_name", ctk.StringVar()).get()
            or "UnknownWitness"
        ).strip()
        witness_parts = witness.split()
        last_name = witness_parts[-1] if witness_parts else "UnknownWitness"
        last_name_safe = "".join(c for c in last_name if c.isalnum() or c in "-_") or "UnknownWitness"

        return save_dir / dt.strftime("%Y") / dt.strftime("%b") / f"{cause_safe}_{last_name_safe}"

    def _resolve_audio_path(self) -> tuple:
        """
        Attempt to locate the source audio file.
        Returns (Path, "") on success or (None, reason) on failure.
        """
        candidates = [
            self._audio_var.get().strip(),
            self._session.get("audio_path", ""),
        ]
        for raw in candidates:
            if raw:
                p = Path(raw)
                if p.exists():
                    return p, ""

        # Prompt user to locate the missing file
        located = filedialog.askopenfilename(
            title="Locate Missing Audio File",
            filetypes=[
                ("Audio files", "*.mp3 *.wav *.m4a *.mp4 *.mov"),
                ("All files", "*.*"),
            ],
        )
        if not located:
            return None, "User cancelled audio file selection"

        resolved = Path(located)
        if resolved.exists():
            self._audio_var.set(str(resolved))
            self._save_session("audio_path", str(resolved))
            return resolved, ""

        return None, f"Located file does not exist: {located}"

    def _save_case_files(self):
        """
        Copy source documents and generated outputs into the filing structure.
        """
        import shutil

        case_dir = self._build_case_folder_path()
        source_dir = case_dir / "source_docs"
        deepgram_dir = case_dir / "Deepgram"

        try:
            source_dir.mkdir(parents=True, exist_ok=True)
            deepgram_dir.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            messagebox.showerror("Save Failed", f"Could not create case folders:\n{exc}")
            return

        copied: list[str] = []
        errors: list[str] = []

        def _copy_if_exists(src_path: str, dest_path: Path):
            if not src_path:
                return
            src = Path(src_path)
            if not src.exists():
                errors.append(f"File not found — could not copy: {src.name}\n  Expected at: {src}")
                return
            try:
                shutil.copy2(src, dest_path)
                copied.append(dest_path.name)
            except Exception as exc:
                errors.append(f"{src.name}: {exc}")

        audio_path_raw = self._audio_var.get().strip()
        if audio_path_raw:
            resolved_audio, audio_err = self._resolve_audio_path()
            if resolved_audio:
                _copy_if_exists(str(resolved_audio), source_dir / resolved_audio.name)
            else:
                errors.append(f"Audio file not saved: {audio_err}")

        for doc_path in self._kw_doc_paths:
            _copy_if_exists(doc_path, source_dir / Path(doc_path).name)

        _copy_if_exists(self._output_paths.get("json", ""), deepgram_dir / "deepgram_raw.json")
        transcript_corrected = self._output_paths.get("transcript_corrected") or self._output_paths.get("transcript", "")
        transcript_raw = self._output_paths.get("transcript_raw") or self._session.get("deepgram_raw_transcript_path", "")
        _copy_if_exists(transcript_corrected, deepgram_dir / "transcript_corrected.txt")
        if transcript_raw:
            _copy_if_exists(transcript_raw, deepgram_dir / "deepgram_raw_transcript.txt")
        else:
            errors.append("Raw Deepgram transcript was not separately preserved.")

        jobs_dir = Path("jobs")
        job_json_path = None
        if jobs_dir.exists():
            cfg = self._get_current_job_config()
            safe_cause = (cfg.cause_number or "").replace("/", "-").replace("\\", "-").strip()
            matched = [p for p in jobs_dir.glob("*_job.json")
                       if safe_cause and safe_cause in p.stem]
            if matched:
                job_json_path = str(max(matched, key=lambda p: p.stat().st_mtime))
            else:
                all_jobs = sorted(
                    jobs_dir.glob("*_job.json"),
                    key=lambda p: p.stat().st_mtime,
                    reverse=True,
                )
                job_json_path = str(all_jobs[0]) if all_jobs else None
        if job_json_path:
            _copy_if_exists(job_json_path, deepgram_dir / "job_config.json")

        transcript_txt = self._output_paths.get("transcript_corrected") or self._output_paths.get("transcript", "")
        _copy_if_exists(transcript_txt, case_dir / "transcript.txt")

        if self._last_ufm_output_path:
            _copy_if_exists(self._last_ufm_output_path, case_dir / "transcript_UFM.docx")
        if self._last_pdf_output_path:
            _copy_if_exists(self._last_pdf_output_path, case_dir / "transcript_UFM.pdf")
        if self._last_ascii_output_path:
            _copy_if_exists(self._last_ascii_output_path, case_dir / "transcript_ASCII.txt")

        try:
            merged = dict(getattr(self, "_extracted_fields", {}) or {})
            merged.update(self._read_ufm_table_fields())
            merged["_saved_at"] = datetime.now().isoformat()
            merged["_case_folder"] = str(case_dir)
            with open(case_dir / "extracted_data_table.json", "w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2, ensure_ascii=False)
            copied.append("extracted_data_table.json")
        except Exception as exc:
            errors.append(f"extracted_data_table.json: {exc}")

        summary = f"Saved to:\n{case_dir}\n\nCopied {len(copied)} item(s)."
        if errors:
            summary += "\n\nIssues:\n" + "\n".join(errors[:10])
        messagebox.showinfo("Case Files Saved", summary)
        try:
            self._save_fields_status_lbl.configure(
                text=f"Saved case files → {case_dir.name}",
                text_color=GREEN if not errors else AMBER,
            )
        except Exception:
            pass

    def _export_ufm_docx(self):
        """
        Export UFM-compliant Word document.

        Priority:
          1. Copy the real spec_engine output if Spec Process already ran.
          2. Otherwise render from the Build-tab preview text.
        """
        import shutil

        cfg = self._get_current_job_config()
        save_dir = Path(self._save_dir_var.get())
        save_dir.mkdir(parents=True, exist_ok=True)

        safe_cause = (cfg.cause_number.replace("/", "-").replace("\\", "-")
                      or "transcript")
        dest = save_dir / f"{safe_cause}_UFM.docx"

        last_path = getattr(self, "_last_ufm_output_path", "")
        if last_path and Path(last_path).exists():
            self._set_export_status("Copying UFM transcript...", AMBER)

            def _worker_copy():
                try:
                    if Path(last_path).resolve() != dest.resolve():
                        shutil.copy2(last_path, dest)
                    self._last_ufm_output_path = str(dest)
                    self._save_session("last_ufm_output_path", str(dest))
                    self._ui(self._set_export_status, f"Word saved: {dest.name}", GREEN)
                    self._ui(
                        messagebox.showinfo,
                        "Export Complete",
                        f"UFM Word document saved to:\n{dest}\n\n(Source: Spec Process output)",
                    )
                    if sys.platform == "win32":
                        self._ui(os.startfile, str(dest))
                except Exception as exc:
                    self._ui(self._set_export_status, f"Copy failed: {exc}", RED)
                    self._ui(messagebox.showerror, "Export Failed", str(exc))

            threading.Thread(target=_worker_copy, daemon=True).start()
            return

        text = self._build_preview.get("1.0", "end").strip()
        if not text:
            messagebox.showwarning(
                "Nothing to Export",
                "No content in the preview and no Spec Process output found.\n"
                "Run Spec Process (UFM) from the Format tab first, or insert "
                "pages in the Build tab.",
            )
            return

        self._set_export_status("Exporting Word document...", AMBER)

        def _worker_text():
            try:
                export_to_docx(
                    text=text,
                    output_path=str(dest),
                    show_format_box=True,
                    case_style=cfg.case_style or cfg.plaintiff_name,
                    cause_number=cfg.cause_number,
                    reporter_name=cfg.reporter_name,
                    reporter_csr=cfg.reporter_csr,
                    certified_date=cfg.certified_date,
                )
                self._last_ufm_output_path = str(dest)
                self._save_session("last_ufm_output_path", str(dest))
                self._ui(self._set_export_status, f"Word saved: {dest.name}", GREEN)
                self._ui(messagebox.showinfo, "Export Complete", f"UFM Word document saved to:\n{dest}")
                if sys.platform == "win32":
                    self._ui(os.startfile, str(dest))
            except Exception as exc:
                self._ui(self._set_export_status, f"Export failed: {exc}", RED)
                self._ui(messagebox.showerror, "Export Failed", str(exc))

        threading.Thread(target=_worker_text, daemon=True).start()

    def _export_ufm_pdf(self):
        """
        Export UFM PDF.
        If Spec Process output exists, convert that directly.
        Otherwise generate a DOCX from preview text first.
        """
        cfg = self._get_current_job_config()
        save_dir = Path(self._save_dir_var.get())
        save_dir.mkdir(parents=True, exist_ok=True)

        safe_cause = (cfg.cause_number.replace("/", "-").replace("\\", "-")
                      or "transcript")
        docx_dest = save_dir / f"{safe_cause}_UFM.docx"
        pdf_dest = save_dir / f"{safe_cause}_UFM.pdf"
        last_path = getattr(self, "_last_ufm_output_path", "")
        source_docx = last_path if (last_path and Path(last_path).exists()) else None

        if source_docx is None:
            text = self._build_preview.get("1.0", "end").strip()
            if not text:
                messagebox.showwarning(
                    "Nothing to Export",
                    "No content in preview and no Spec Process output found.\n"
                    "Run Spec Process (UFM) first, or insert pages in Build tab.",
                )
                return
            source_docx = str(docx_dest)
        else:
            text = None

        self._set_export_status("Generating PDF...", AMBER)

        def _worker():
            try:
                if text is not None:
                    export_to_docx(
                        text=text,
                        output_path=source_docx,
                        show_format_box=True,
                        case_style=cfg.case_style or cfg.plaintiff_name,
                        cause_number=cfg.cause_number,
                        reporter_name=cfg.reporter_name,
                        reporter_csr=cfg.reporter_csr,
                        certified_date=cfg.certified_date,
                    )
                from spec_engine.pdf_exporter import export_pdf

                export_pdf(source_docx, str(pdf_dest))
                self._last_pdf_output_path = str(pdf_dest)
                self._save_session("last_pdf_output_path", str(pdf_dest))
                self._ui(self._set_export_status, f"PDF saved: {pdf_dest.name}", GREEN)
                self._ui(messagebox.showinfo, "Export Complete", f"UFM PDF saved to:\n{pdf_dest}")
                if sys.platform == "win32":
                    self._ui(os.startfile, str(pdf_dest))
            except Exception as exc:
                self._ui(self._set_export_status, f"PDF failed: {exc}", RED)
                self._ui(messagebox.showerror, "PDF Export Failed", str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    def _export_ascii_txt(self):
        """Export clean ASCII transcript (.txt)."""
        cfg = self._get_current_job_config()
        save_dir = Path(self._save_dir_var.get())
        save_dir.mkdir(parents=True, exist_ok=True)

        safe_cause = cfg.cause_number.replace("/", "-").replace("\\", "-") or "transcript"
        path = filedialog.asksaveasfilename(
            title="Save ASCII Transcript As",
            defaultextension=".txt",
            filetypes=[("Text Files", "*.txt"), ("All Files", "*.*")],
            initialdir=str(save_dir),
            initialfile=f"{safe_cause}_transcript.txt",
        )
        if not path:
            return

        text = self._build_preview.get("1.0", "end").strip()
        if not text:
            messagebox.showwarning(
                "Nothing to Export",
                "No content in the preview. Insert pages first.",
            )
            return

        self._set_export_status("Writing ASCII file...", AMBER)

        def _worker():
            try:
                from spec_engine.exporter import export_ascii

                out = export_ascii(source=text, output_path=path, is_docx=False)
                self._last_ascii_output_path = str(out)
                self._save_session("last_ascii_output_path", str(out))
                self._ui(self._set_export_status, f"ASCII saved: {Path(out).name}", GREEN)
                self._ui(messagebox.showinfo, "Export Complete", f"ASCII transcript saved to:\n{out}")
            except Exception as exc:
                self._ui(self._set_export_status, f"Export failed: {exc}", RED)
                self._ui(messagebox.showerror, "ASCII Export Failed", str(exc))

        threading.Thread(target=_worker, daemon=True).start()

    def _view_corrections_log(self):
        """Show the corrections log from the most recent spec_engine job."""
        from pathlib import Path

        jobs_dir = Path("jobs")
        if not jobs_dir.exists():
            messagebox.showinfo("No Log Found",
                "No spec_engine jobs found yet.\n"
                "Run Spec Process (UFM) first.")
            return

        json_files = sorted(
            jobs_dir.glob("*_job.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not json_files:
            messagebox.showinfo("No Log Found",
                "No saved job configs found in jobs/ folder.")
            return

        log_win = ctk.CTkToplevel(self)
        log_win.title("Last Corrections Log")
        log_win.geometry("780x560")

        ctk.CTkLabel(log_win, text="Corrections Log — Most Recent Job",
                     font=F_HEAD, text_color=TEXT_DARK).pack(
            anchor="w", padx=16, pady=(12, 4))

        text_box = ctk.CTkTextbox(
            log_win, font=F_MONO_S, fg_color=BG_CARD, text_color=TEXT_DARK,
            border_width=1, border_color=BORDER_LIGHT, corner_radius=8,
            wrap="word")
        text_box.pack(fill="both", expand=True, padx=12, pady=(4, 8))

        try:
            from spec_engine.models import JobConfig
            cfg = JobConfig.load(str(json_files[0]))
            lines = [
                f"Job:             {json_files[0].name}",
                f"Witness:         {cfg.witness_name}",
                f"Cause Number:    {cfg.cause_number}",
                f"Court:           {cfg.court}",
                f"Date:            {cfg.depo_date}",
                f"Time:            {cfg.depo_start_time} – {cfg.depo_end_time}",
                f"Method:          {cfg.method}",
                f"Reporter:        {cfg.reporter_name}, {cfg.reporter_csr}",
                "",
                "SPEAKER MAP (verified):",
            ]
            for sid, role in sorted(cfg.speaker_map.items()):
                lines.append(f"  Speaker {sid}: {role}")
            lines.append("")
            lines.append(f"CONFIRMED SPELLINGS ({len(cfg.confirmed_spellings)}):")
            for wrong, correct in cfg.confirmed_spellings.items():
                lines.append(f"  {wrong!r} → {correct!r}")
            if cfg.post_record_spellings:
                lines.append("")
                lines.append(f"POST-RECORD SPELLINGS ({len(cfg.post_record_spellings)}):")
                for prs in cfg.post_record_spellings:
                    lines.append(
                        f"  {prs.name} → {prs.correct_spelling or '[unconfirmed]'}"
                        f"  (spelled: {prs.letters_as_given})")
            if cfg.time_used:
                lines.append("")
                lines.append("TIME USED:")
                for atty, t in cfg.time_used.items():
                    lines.append(f"  {atty}: {t}")
            text_box.insert("1.0", "\n".join(lines))
        except Exception as e:
            text_box.insert("1.0", f"Error loading log:\n{e}")

        SecondaryBtn(log_win, text="Close",
                     command=log_win.destroy).pack(pady=(0, 12))

    # ── Train actions ──────────────────────────────────────────────────────────

    def _run_training_analysis(self):
        bad  = self._train_bad.get("1.0", "end").strip()
        good = self._train_good.get("1.0", "end").strip()
        if not bad or not good:
            messagebox.showinfo("Missing Input",
                                "Paste both the incorrect and corrected text.")
            return
        self._accept_btn.configure(state="disabled")
        self._result_box.configure(state="normal")
        self._result_box.delete("1.0", "end")
        self._result_box.insert("1.0", "Analyzing\u2026")
        self._result_box.configure(state="disabled")

        def _worker():
            try:
                result = analyze_training_example(bad, good)
                self._pending_rule = result
                lines = [
                    f"Layer:    {result.get('recommended_layer', '').upper()}",
                    f"Summary:  {result.get('summary', '')}",
                    "",
                ]
                fr = result.get("formatter_rule")
                ar = result.get("ai_rule")
                if fr:
                    lines += [
                        "FORMATTER RULE:",
                        f"  Name:        {fr.get('name', '')}",
                        f"  Pattern:     {fr.get('pattern', '')}",
                        f"  Replacement: {fr.get('replacement', '')}",
                        f"  Flags:       {', '.join(fr.get('flags', []))}",
                    ]
                if ar:
                    lines += ["", "AI RULE:", f"  {ar}"]

                def _done():
                    self._result_box.configure(state="normal")
                    self._result_box.delete("1.0", "end")
                    self._result_box.insert("1.0", "\n".join(lines))
                    self._result_box.configure(state="disabled")
                    self._accept_btn.configure(state="normal")
                self._ui(_done)
            except Exception as exc:
                def _err():
                    self._result_box.configure(state="normal")
                    self._result_box.delete("1.0", "end")
                    self._result_box.insert("1.0", f"Error: {exc}")
                    self._result_box.configure(state="disabled")
                self._ui(_err)

        threading.Thread(target=_worker, daemon=True).start()

    def _accept_rule(self):
        if not self._pending_rule:
            return
        rule  = self._pending_rule
        layer = rule.get("recommended_layer", "")
        try:
            if layer == "formatter" and rule.get("formatter_rule"):
                fr = rule["formatter_rule"]
                rules_path = CUSTOM_FORMATTER_RULES_PATH
                existing = (json.loads(rules_path.read_text(encoding="utf-8"))
                            if rules_path.exists() else [])
                existing.append(fr)
                rules_path.write_text(
                    json.dumps(existing, indent=2), encoding="utf-8")
                messagebox.showinfo("Rule Saved",
                                    "Formatter rule added successfully.")
            elif layer == "ai" and rule.get("ai_rule"):
                ai_path  = CUSTOM_AI_RULES_PATH
                existing = (ai_path.read_text(encoding="utf-8")
                            if ai_path.exists() else "")
                ai_text = str(rule["ai_rule"])
                ai_path.write_text(
                    (existing.strip() + "\n\n" + ai_text).strip(),
                    encoding="utf-8")
                messagebox.showinfo("Rule Saved",
                                    "AI rule added successfully.")
            else:
                messagebox.showwarning("No Rule", "No applicable rule to save.")
        except Exception as exc:
            messagebox.showerror("Save Failed", str(exc))
        self._pending_rule = None
        self._accept_btn.configure(state="disabled")

    def _discard_rule(self):
        self._pending_rule = None
        self._accept_btn.configure(state="disabled")
        self._result_box.configure(state="normal")
        self._result_box.delete("1.0", "end")
        self._result_box.configure(state="disabled")

    # ── Save / Export ──────────────────────────────────────────────────────────

    def _save_docx(self):
        text = self._get_preview_text()
        if not text:
            return
        save_dir = Path(self._save_dir_var.get())
        save_dir.mkdir(parents=True, exist_ok=True)
        dest = save_dir / "transcript_completed.docx"
        try:
            export_to_docx(text, str(dest))
            messagebox.showinfo("Saved", f"DOCX saved to:\n{dest}")
        except Exception as exc:
            messagebox.showerror("Save Failed", str(exc))

    def _save_text(self):
        text = self._get_preview_text()
        if not text:
            return
        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            initialfile="transcript.txt")
        if path:
            Path(path).write_text(text, encoding="utf-8")
            messagebox.showinfo("Saved", f"Text saved to:\n{path}")

    # ── Misc ───────────────────────────────────────────────────────────────────

    def _browse_save_dir(self):
        path = filedialog.askdirectory(title="Select Save Location")
        if path:
            self._save_dir_var.set(path)
            self._save_session("save_dir", path)

    def _open_output_folder(self):
        folder = str(Path(_HERE / "output")
                     if (Path(_HERE / "output")).exists()
                     else Path(self._save_dir_var.get()))
        if sys.platform == "win32":
            os.startfile(folder)
        else:
            import subprocess
            subprocess.run(["open" if sys.platform == "darwin"
                            else "xdg-open", folder])

    def _open_transcript_file(self):
        path = (self._output_paths.get("transcript_corrected")
                or self._output_paths.get("transcript"))
        if path and os.path.exists(path):
            if sys.platform == "win32":
                os.startfile(path)
            else:
                import subprocess
                subprocess.run(["open" if sys.platform == "darwin"
                                else "xdg-open", path])
        else:
            messagebox.showwarning(
                "File Not Found",
                "No transcript file found. Run the pipeline first.",
            )

# ═══════════════════════════════════════════════════════════════════
# SPEC ENGINE — Job Configuration Dialog
# ═══════════════════════════════════════════════════════════════════

class CounselEditor(ctk.CTkFrame):
    """
    Inline scrollable editor for a list of CounselInfo records.
    """

    def __init__(self, parent, label: str, initial: list, **kw):
        super().__init__(parent, fg_color="transparent", **kw)
        self.columnconfigure(0, weight=1)

        self._label = label
        self._rows: list[dict] = []

        hdr = ctk.CTkFrame(self, fg_color="#f1f5f9", corner_radius=4)
        hdr.grid(row=0, column=0, sticky="ew", pady=(0, 2))
        for col, (txt, width) in enumerate([
            ("Name", 160), ("Firm", 140), ("SBOT", 80),
            ("Address", 120), ("City", 90), ("ZIP", 55), ("Phone", 90),
        ]):
            ctk.CTkLabel(
                hdr,
                text=txt,
                font=("Segoe UI", 9, "bold"),
                text_color="#1a2744",
                width=width,
            ).grid(row=0, column=col, padx=(6 if col == 0 else 2, 2), pady=4, sticky="w")

        self._scroll = ctk.CTkScrollableFrame(
            self,
            height=100,
            fg_color="#ffffff",
            border_width=1,
            border_color="#e2e8f0",
            corner_radius=6,
        )
        self._scroll.grid(row=1, column=0, sticky="ew", pady=(0, 4))
        self._scroll.columnconfigure(1, weight=1)

        for item in (initial or []):
            self._add_row(item)
        if not self._rows:
            self._add_row(None)

        ctk.CTkButton(
            self,
            text="＋  Add Attorney",
            command=lambda: self._add_row(None),
            width=130,
            height=28,
            fg_color="transparent",
            border_width=1,
            border_color="#1a2744",
            text_color="#1a2744",
            hover_color="#e8edf5",
            font=("Segoe UI", 11),
        ).grid(row=2, column=0, sticky="w")

    def _add_row(self, existing=None):
        idx = len(self._rows)
        row_vars = {}
        cols = [
            ("name", 160, "Attorney Name"),
            ("firm", 140, "Firm / Office"),
            ("sbot", 80, "SBOT #"),
            ("address", 120, "Street Address"),
            ("city", 90, "City"),
            ("zip_code", 55, "ZIP"),
            ("phone", 90, "(###) ###-####"),
        ]

        for col, (key, width, placeholder) in enumerate(cols):
            val = getattr(existing, key, "") if existing else ""
            var = ctk.StringVar(value=val or "")
            row_vars[key] = var
            ctk.CTkEntry(
                self._scroll,
                textvariable=var,
                width=width,
                height=26,
                font=("Segoe UI", 10),
                fg_color="#f8fafc",
                border_color="#cbd5e1",
                placeholder_text=placeholder,
            ).grid(row=idx, column=col, padx=(4 if col == 0 else 2, 2), pady=2, sticky="w")

        row_vars["party"] = ctk.StringVar(
            value="Plaintiff" if "Plaintiff" in self._label else "Defendant"
        )

        ctk.CTkButton(
            self._scroll,
            text="✕",
            command=lambda i=idx: self._clear_row(i),
            width=26,
            height=26,
            fg_color="transparent",
            text_color="#ef4444",
            hover_color="#fee2e2",
            font=("Segoe UI", 12),
        ).grid(row=idx, column=len(cols), padx=(2, 4), pady=2)

        self._rows.append(row_vars)

    def _clear_row(self, idx: int):
        try:
            for var in self._rows[idx].values():
                if isinstance(var, ctk.StringVar):
                    var.set("")
        except IndexError:
            pass

    def get_counsel_list(self) -> list:
        from spec_engine.models import CounselInfo

        result = []
        for row_vars in self._rows:
            name = row_vars.get("name", ctk.StringVar()).get().strip()
            firm = row_vars.get("firm", ctk.StringVar()).get().strip()
            if not name and not firm:
                continue
            result.append(CounselInfo(
                name=name,
                firm=firm,
                sbot=row_vars.get("sbot", ctk.StringVar()).get().strip(),
                address=row_vars.get("address", ctk.StringVar()).get().strip(),
                city=row_vars.get("city", ctk.StringVar()).get().strip(),
                zip_code=row_vars.get("zip_code", ctk.StringVar()).get().strip(),
                phone=row_vars.get("phone", ctk.StringVar()).get().strip(),
                party=row_vars.get("party", ctk.StringVar()).get().strip(),
                state="Texas",
            ))
        return result

    def load(self, counsel_list: list):
        self._rows.clear()
        for widget in self._scroll.winfo_children():
            widget.destroy()
        for item in (counsel_list or []):
            self._add_row(item)
        if not self._rows:
            self._add_row(None)


class JobConfigDialog(ctk.CTkToplevel):
    """
    Modal dialog for per-deposition job configuration.
    Opened before Spec Process (UFM) runs.
    Collects JobConfig fields from Miah before processing begins.
    """

    def __init__(self, parent, existing_config=None):
        super().__init__(parent)
        self.title("Spec Process — Job Configuration")
        self.geometry("820x760")
        self.resizable(True, True)
        self.grab_set()  # Modal

        self._result: "JobConfig | None" = None
        self._fields = {}

        # Import spec_engine here to avoid startup cost
        try:
            from spec_engine.models import JobConfig
            self._JobConfig  = JobConfig
        except ImportError as e:
            messagebox.showerror("Import Error",
                f"spec_engine not found:\n{e}\nRun Phase 2-3 first.")
            self.destroy()
            return

        cfg = existing_config or self._JobConfig()
        self._base_cfg = cfg
        self._build_ui(cfg)

    def _build_ui(self, cfg):
        from spec_engine.models import JobConfig

        # Scrollable frame
        scroll = ctk.CTkScrollableFrame(self, fg_color=BG_APP)
        scroll.pack(fill="both", expand=True, padx=12, pady=12)
        scroll.columnconfigure(1, weight=1)

        row = [0]

        def section(title):
            ctk.CTkFrame(scroll, fg_color=BORDER_LIGHT, height=1).grid(
                row=row[0], column=0, columnspan=2, sticky="ew",
                padx=4, pady=(14, 4))
            row[0] += 1
            ctk.CTkLabel(scroll, text=title.upper(), font=("Segoe UI", 9, "bold"),
                         text_color=TEXT_MUTED, anchor="w").grid(
                row=row[0], column=0, columnspan=2, sticky="w", padx=8, pady=(0, 4))
            row[0] += 1

        def field(label, key, default="", width=340):
            ctk.CTkLabel(scroll, text=label, font=F_LABEL,
                         text_color=TEXT_MID, anchor="e").grid(
                row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
            var = ctk.StringVar(value=default)
            entry = ctk.CTkEntry(scroll, textvariable=var, width=width,
                                 fg_color=BG_INPUT, font=F_LABEL)
            entry.grid(row=row[0], column=1, sticky="w", padx=4, pady=3)
            self._fields[key] = var
            row[0] += 1
            return var

        def checkbox(label, key, default=False):
            var = ctk.BooleanVar(value=default)
            ctk.CTkCheckBox(scroll, text=label, variable=var,
                            font=F_LABEL, text_color=TEXT_DARK).grid(
                row=row[0], column=0, columnspan=2, sticky="w",
                padx=12, pady=3)
            self._fields[key] = var
            row[0] += 1
            return var

        section("Case Information")
        field("Case Style",      "case_style",      cfg.case_style)
        field("Cause Number",    "cause_number",    cfg.cause_number)
        field("Appellate No.",   "appellate_cause_number", cfg.appellate_cause_number)
        field("Court",           "court",           cfg.court)
        field("County",          "county",          cfg.county)
        field("Judicial District","judicial_district", cfg.judicial_district, width=100)
        field("Judge Name",      "judge_name",      cfg.judge_name)

        section("Proceeding")
        field("Witness Name",    "witness_name",    cfg.witness_name)
        field("Witness Title",   "witness_title",   cfg.witness_title,   width=160)
        field("Depo Date",       "depo_date",       cfg.depo_date)
        field("Start Time",      "depo_start_time", cfg.depo_start_time, width=160)
        field("End Time",        "depo_end_time",   cfg.depo_end_time,   width=160)
        field("Location City",   "location_city",   cfg.location_city)
        field("Location Address","location_address",cfg.location_address)
        field("Venue / Office",  "location",        cfg.location)

        ctk.CTkLabel(scroll, text="Proceeding Type", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        proc_var = ctk.StringVar(value=cfg.proceeding_type)
        ctk.CTkComboBox(scroll,
                        values=["Deposition", "Hearing", "Trial",
                                "Arbitration", "Examination"],
                        variable=proc_var, state="readonly",
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32, width=200).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["proceeding_type"] = proc_var
        row[0] += 1

        ctk.CTkLabel(scroll, text="Court Type", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        court_type_var = ctk.StringVar(value=cfg.court_type)
        ctk.CTkComboBox(scroll,
                        values=["District Court", "County Court",
                                "Federal Court", "Appellate Court",
                                "Justice of the Peace"],
                        variable=court_type_var, state="readonly",
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32, width=220).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["court_type"] = court_type_var
        row[0] += 1

        checkbox("Videotaped Deposition", "is_videotaped", cfg.is_videotaped)

        ctk.CTkLabel(scroll, text="Volume No.", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        vol_row = ctk.CTkFrame(scroll, fg_color="transparent")
        vol_row.grid(row=row[0], column=1, sticky="w", padx=4, pady=3)
        vol_var = ctk.StringVar(value=str(cfg.volume_number))
        ctk.CTkEntry(vol_row, textvariable=vol_var, width=60,
                     fg_color=BG_INPUT, font=F_LABEL).pack(side="left")
        ctk.CTkLabel(vol_row, text=" of ", font=F_LABEL,
                     text_color=TEXT_MID).pack(side="left", padx=4)
        tot_var = ctk.StringVar(value=str(cfg.total_volumes))
        ctk.CTkEntry(vol_row, textvariable=tot_var, width=60,
                     fg_color=BG_INPUT, font=F_LABEL).pack(side="left")
        self._fields["volume_number"] = vol_var
        self._fields["total_volumes"] = tot_var
        row[0] += 1

        # Method dropdown
        ctk.CTkLabel(scroll, text="Method", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        method_var = ctk.StringVar(value=cfg.method)
        ctk.CTkComboBox(scroll, values=["In Person", "Via Zoom", "Via Teams"],
                        variable=method_var, state="readonly",
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32, width=200).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["method"] = method_var
        row[0] += 1

        checkbox("Subpoena Duces Tecum", "subpoena_duces_tecum", cfg.subpoena_duces_tecum)

        # ── Parties ────────────────────────────────────────────────────────────
        section("Parties")
        field("Plaintiff Name",  "plaintiff_name",  cfg.plaintiff_name)
        field("Defendant Names", "defendant_names",
              "\n".join(cfg.defendant_names), width=340)
        ctk.CTkLabel(scroll,
            text="  Enter one defendant per line in the field above",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=28)
        row[0] += 1

        section("Plaintiff Counsel")
        ctk.CTkLabel(scroll,
            text="Add one row per plaintiff attorney. "
                 "SBOT and phone appear on the Appearances page.",
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 4))
        row[0] += 1

        self._plaintiff_editor = CounselEditor(
            scroll,
            label="Plaintiff Counsel",
            initial=cfg.plaintiff_counsel)
        self._plaintiff_editor.grid(
            row=row[0], column=0, columnspan=2,
            sticky="ew", padx=8, pady=(0, 8))
        row[0] += 1

        section("Defense Counsel")
        ctk.CTkLabel(scroll,
            text="Add one row per defense attorney. "
                 "Include party designation if multiple defendants.",
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 4))
        row[0] += 1

        self._defense_editor = CounselEditor(
            scroll,
            label="Defense Counsel",
            initial=cfg.defense_counsel)
        self._defense_editor.grid(
            row=row[0], column=0, columnspan=2,
            sticky="ew", padx=8, pady=(0, 8))
        row[0] += 1

        # ── Speaker Map ────────────────────────────────────────────────────────
        section("Speaker Map  (VERIFY BEFORE PROCESSING)")

        ctk.CTkLabel(scroll,
            text="Assign each Speaker ID to the correct role.\n"
                 "Deepgram does NOT guarantee consistent ID assignment.",
            font=F_SMALL, text_color=AMBER, justify="left").grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 6))
        row[0] += 1

        self._speaker_vars: dict = {}
        speaker_roles = ["THE VIDEOGRAPHER", "THE WITNESS", "MR./MS. SALAZAR",
                         "MS. DURBIN", "THE COURT REPORTER", "OTHER"]

        for sid in range(6):
            existing_role = cfg.speaker_map.get(sid, "")
            ctk.CTkLabel(scroll, text=f"Speaker {sid}:", font=F_LABEL,
                         text_color=TEXT_MID, anchor="e").grid(
                row=row[0], column=0, sticky="e", padx=(8, 6), pady=2)
            role_var = ctk.StringVar(value=existing_role)
            entry = ctk.CTkEntry(scroll, textvariable=role_var, width=280,
                                 fg_color=BG_INPUT, font=F_LABEL,
                                 placeholder_text="e.g. MR. SALAZAR or leave blank if unused")
            entry.grid(row=row[0], column=1, sticky="w", padx=4, pady=2)
            self._speaker_vars[sid] = role_var
            row[0] += 1

        # Witness ID and examining attorney ID
        ctk.CTkLabel(scroll, text="Witness Speaker ID:", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        witness_id_var = ctk.StringVar(value=str(cfg.witness_id))
        ctk.CTkEntry(scroll, textvariable=witness_id_var, width=80,
                     fg_color=BG_INPUT, font=F_LABEL).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["witness_id"] = witness_id_var
        row[0] += 1

        ctk.CTkLabel(scroll, text="Examining Attorney ID:", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        atty_id_var = ctk.StringVar(value=str(cfg.examining_attorney_id))
        ctk.CTkEntry(scroll, textvariable=atty_id_var, width=80,
                     fg_color=BG_INPUT, font=F_LABEL).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["examining_attorney_id"] = atty_id_var
        row[0] += 1

        section("Also Present")
        ctk.CTkLabel(scroll,
            text="One name per line (paralegals, interpreters, videographers not listed above)",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 4))
        row[0] += 1

        self._also_present_box = ctk.CTkTextbox(
            scroll, height=80, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._also_present_box.grid(row=row[0], column=0, columnspan=2,
                                    sticky="ew", padx=8, pady=4)
        if cfg.also_present:
            self._also_present_box.insert("1.0", "\n".join(cfg.also_present))
        row[0] += 1

        section("Time Used  (Spec §7 — per attorney)")
        ctk.CTkLabel(scroll,
            text='One per line:  Attorney Name = 2 hours 15 minutes\n'
                 'Use "Reserved at time of trial" if time not tracked.',
            font=F_SMALL, text_color=TEXT_MUTED, justify="left").grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 4))
        row[0] += 1

        self._time_used_box = ctk.CTkTextbox(
            scroll, height=80, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._time_used_box.grid(row=row[0], column=0, columnspan=2,
                                 sticky="ew", padx=8, pady=4)
        if cfg.time_used:
            tu_text = "\n".join(f"{k} = {v}" for k, v in cfg.time_used.items())
            self._time_used_box.insert("1.0", tu_text)
        row[0] += 1

        # ── Confirmed Spellings ────────────────────────────────────────────────
        section("Confirmed Spellings  (from NOD or Job Sheet)")
        ctk.CTkLabel(scroll,
            text="One per line:   wrong spelling = correct spelling",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=12, pady=(0, 4))
        row[0] += 1

        spellings_text = "\n".join(
            f"{k} = {v}" for k, v in cfg.confirmed_spellings.items()
        )
        self._spellings_box = ctk.CTkTextbox(
            scroll, height=120, font=F_SMALL, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_LIGHT, text_color=TEXT_DARK)
        self._spellings_box.grid(row=row[0], column=0, columnspan=2,
                                  sticky="ew", padx=8, pady=4)
        if spellings_text:
            self._spellings_box.insert("1.0", spellings_text)
        row[0] += 1

        ctk.CTkButton(
            scroll,
            text="Auto-Fill from Witness & Reporter Names",
            font=F_SMALL,
            height=28,
            fg_color="transparent",
            border_width=1,
            border_color=BORDER_MID,
            text_color=TEXT_DARK,
            hover_color=BG_INPUT,
            corner_radius=6,
            command=self._auto_fill_spellings,
        ).grid(row=row[0], column=0, columnspan=2, sticky="w", padx=8, pady=(0, 4))
        row[0] += 1

        # ── Reporter Information ───────────────────────────────────────────────
        section("Court Reporter")
        field("Reporter Name",    "reporter_name",       cfg.reporter_name)
        field("CSR Number",       "reporter_csr",        cfg.reporter_csr,        width=200)
        field("CSR Expiration",   "reporter_expiration", cfg.reporter_expiration, width=160)
        field("Firm Name",        "reporter_firm",       cfg.reporter_firm)
        field("Firm Registration","firm_registration",   cfg.firm_registration,   width=200)
        field("Reporter Address", "reporter_address",    cfg.reporter_address)
        field("Reporter Phone",   "reporter_phone",      cfg.reporter_phone,      width=180)

        section("Financial / Certification")
        field("Total Cost ($)",  "cost_total",      cfg.cost_total,      width=160)
        field("Cost Paid By",    "cost_paid_by",    cfg.cost_paid_by)
        field("Certified Date",  "certified_date",  cfg.certified_date,  width=200)
        field("Notary Name",     "notary_name",     cfg.notary_name)
        field("Notary County",   "notary_county",   cfg.notary_county,   width=200)
        field("ID Method",       "identification_method",
              cfg.identification_method,
              width=340)
        ctk.CTkLabel(scroll,
            text="  Used on changes page: 'proved to me through [ID method]'",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=28)
        row[0] += 1
        checkbox("Official Court Reporter (not Freelance)",
                 "is_official_reporter", cfg.is_official_reporter)

        # ── Processing Options ─────────────────────────────────────────────────
        section("Processing Options")
        checkbox("Split embedded answers (Q+A in one block)",
                 "split_embedded_answers", cfg.split_embedded_answers)
        ctk.CTkLabel(scroll,
            text="  Disable if attorney reads answers back: 'And you said yes, correct?'",
            font=F_SMALL, text_color=TEXT_MUTED).grid(
            row=row[0], column=0, columnspan=2, sticky="w", padx=28)
        row[0] += 1

        # Audio quality
        ctk.CTkLabel(scroll, text="Audio Quality", font=F_LABEL,
                     text_color=TEXT_MID, anchor="e").grid(
            row=row[0], column=0, sticky="e", padx=(8, 6), pady=3)
        quality_var = ctk.StringVar(value=cfg.audio_quality)
        ctk.CTkComboBox(scroll, values=["clean", "fair", "poor"],
                        variable=quality_var, state="readonly",
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32, width=160).grid(
            row=row[0], column=1, sticky="w", padx=4, pady=3)
        self._fields["audio_quality"] = quality_var
        row[0] += 1

        # ── Preset loader ──────────────────────────────────────────────────────
        section("Load Preset")
        preset_frame = ctk.CTkFrame(scroll, fg_color="transparent")
        preset_frame.grid(row=row[0], column=0, columnspan=2,
                          sticky="ew", padx=8, pady=4)
        row[0] += 1

        def load_preset(name):
            from spec_engine.models import JobConfig as JC
            if name == "Perez v. Ugalde (2025-CI-12281)":
                self._load_config(JC.default_perez_ugalde())
            elif name == "Garza v. Perez (2025-CI-00766)":
                self._load_config(JC.default_garza_perez())

        preset_var = ctk.StringVar(value="— Select preset —")
        ctk.CTkComboBox(preset_frame,
                        values=["Perez v. Ugalde (2025-CI-12281)",
                                "Garza v. Perez (2025-CI-00766)"],
                        variable=preset_var, command=load_preset,
                        font=F_LABEL, fg_color=BG_INPUT,
                        border_color=BORDER_LIGHT, button_color=NAVY,
                        height=32, width=320).pack(side="left", padx=(0, 8))
        SecondaryBtn(preset_frame, text="Load from jobs/ file",
                     command=self._load_from_file, height=32).pack(side="left")

        # ── Buttons ────────────────────────────────────────────────────────────
        btn_frame = ctk.CTkFrame(self, fg_color=BG_CARD,
                                  border_width=1, border_color=BORDER_LIGHT)
        btn_frame.pack(fill="x", padx=12, pady=(0, 12))

        SecondaryBtn(btn_frame, text="Cancel",
                     command=self.destroy).pack(side="right", padx=8, pady=8)
        GoldBtn(btn_frame, text="Process Transcript (UFM)",
                command=self._on_process).pack(side="right", padx=(0, 4), pady=8)

    def _load_config(self, cfg):
        """
        Reload ALL editable dialog fields from a JobConfig object.
        Called when the user selects a preset or loads from a JSON file.
        """
        simple = {
            "case_style": cfg.case_style,
            "cause_number": cfg.cause_number,
            "appellate_cause_number": cfg.appellate_cause_number,
            "court": cfg.court,
            "court_type": cfg.court_type,
            "county": cfg.county,
            "judicial_district": cfg.judicial_district,
            "judge_name": cfg.judge_name,
            "witness_name": cfg.witness_name,
            "witness_title": cfg.witness_title,
            "depo_date": cfg.depo_date,
            "depo_start_time": cfg.depo_start_time,
            "depo_end_time": cfg.depo_end_time,
            "location": cfg.location,
            "location_city": cfg.location_city,
            "location_address": cfg.location_address,
            "proceeding_type": cfg.proceeding_type,
            "plaintiff_name": cfg.plaintiff_name,
            "reporter_name": cfg.reporter_name,
            "reporter_csr": cfg.reporter_csr,
            "reporter_expiration": cfg.reporter_expiration,
            "reporter_firm": cfg.reporter_firm,
            "reporter_address": cfg.reporter_address,
            "reporter_phone": cfg.reporter_phone,
            "firm_registration": cfg.firm_registration,
            "cost_total": cfg.cost_total,
            "cost_paid_by": cfg.cost_paid_by,
            "certified_date": cfg.certified_date,
            "notary_name": cfg.notary_name,
            "notary_county": cfg.notary_county,
            "identification_method": cfg.identification_method,
            "volume_number": str(cfg.volume_number),
            "total_volumes": str(cfg.total_volumes),
            "witness_id": str(cfg.witness_id),
            "examining_attorney_id": str(cfg.examining_attorney_id),
        }
        for key, val in simple.items():
            if key in self._fields:
                self._fields[key].set(val or "")

        bools = {
            "subpoena_duces_tecum": cfg.subpoena_duces_tecum,
            "is_videotaped": cfg.is_videotaped,
            "is_official_reporter": cfg.is_official_reporter,
            "split_embedded_answers": cfg.split_embedded_answers,
        }
        for key, val in bools.items():
            if key in self._fields:
                self._fields[key].set(bool(val))

        if "method" in self._fields:
            self._fields["method"].set(cfg.method or "In Person")
        if "audio_quality" in self._fields:
            self._fields["audio_quality"].set(cfg.audio_quality or "clean")
        if "defendant_names" in self._fields:
            self._fields["defendant_names"].set("\n".join(cfg.defendant_names) if cfg.defendant_names else "")

        for sid, var in self._speaker_vars.items():
            var.set(cfg.speaker_map.get(sid, ""))

        try:
            spellings_text = "\n".join(f"{k} = {v}" for k, v in cfg.confirmed_spellings.items())
            self._spellings_box.delete("1.0", "end")
            if spellings_text:
                self._spellings_box.insert("1.0", spellings_text)
        except Exception:
            pass

        try:
            ap_text = "\n".join(cfg.also_present) if cfg.also_present else ""
            self._also_present_box.delete("1.0", "end")
            if ap_text:
                self._also_present_box.insert("1.0", ap_text)
        except Exception:
            pass

        try:
            tu_text = "\n".join(f"{k} = {v}" for k, v in cfg.time_used.items()) if cfg.time_used else ""
            self._time_used_box.delete("1.0", "end")
            if tu_text:
                self._time_used_box.insert("1.0", tu_text)
        except Exception:
            pass

        try:
            self._plaintiff_editor.load(cfg.plaintiff_counsel)
        except Exception:
            pass
        try:
            self._defense_editor.load(cfg.defense_counsel)
        except Exception:
            pass

        self._base_cfg = cfg

    def _load_from_file(self):
        """Load a saved job config JSON and populate all dialog fields."""
        from spec_engine.models import JobConfig
        path = filedialog.askopenfilename(
            title="Load Job Config",
            initialdir="jobs",
            filetypes=[("Job Config", "*.json"), ("All files", "*.*")])
        if not path:
            return
        try:
            cfg = JobConfig.load(path)
            self._load_config(cfg)
        except Exception as exc:
            messagebox.showerror("Load Failed", str(exc))

    def _parse_spellings(self) -> dict:
        """Parse the confirmed spellings text box into a dict."""
        spellings = {}
        text = self._spellings_box.get("1.0", "end").strip()
        for line in text.splitlines():
            if "=" in line:
                parts = line.split("=", 1)
                wrong   = parts[0].strip()
                correct = parts[1].strip()
                if wrong and correct:
                    spellings[wrong] = correct
        return spellings

    def _auto_fill_spellings(self):
        """
        Pre-populate the confirmed spellings box with likely ASR garbles.
        """
        existing = self._parse_spellings()
        new_entries = dict(existing)

        def _add(wrong, correct):
            if wrong and correct and wrong != correct:
                if wrong not in new_entries and wrong not in new_entries.values():
                    new_entries[wrong] = correct

        witness_raw = self._fields.get("witness_name", None)
        witness_name = (witness_raw.get() if witness_raw else "").strip()
        if witness_name:
            parts = witness_name.split()
            for part in parts:
                if len(part) < 3:
                    continue
                _add(part + "r", part)
                if len(part) > 4 and part[-1].lower() in "lnmrst":
                    _add(part + part[-1], part)
                if len(part) > 4 and part[-2].lower() in "aeiou":
                    _add(part[:-2] + part[-1] + part[-2], part)

        reporter_raw = self._fields.get("reporter_name", None)
        reporter_name = (reporter_raw.get() if reporter_raw else "").strip()
        if reporter_name and reporter_name != "Miah Bardot":
            for part in reporter_name.split():
                if len(part) >= 4:
                    _add(part + "r", part)

        _add("Miah Vardell", "Miah Bardot")
        _add("May Vardell", "Miah Bardot")
        _add("Mia Bardot", "Miah Bardot")
        _add("Mia Bardo", "Miah Bardot")

        county_raw = self._fields.get("county", None)
        county = (county_raw.get() if county_raw else "").strip()
        county_garbles = {
            "Bexar": ["Bare", "Bear", "Bexer", "Bexar County"],
            "Nueces": ["Nuesis", "Nuecis"],
            "Hidalgo": ["Hidalgo County", "Hidalga"],
            "Travis": ["Traviss"],
            "Harris": ["Harriss"],
        }
        for correct_county, garbles in county_garbles.items():
            if correct_county in county or county in correct_county:
                for garble in garbles:
                    _add(garble, county if county else correct_county)

        if new_entries == existing:
            messagebox.showinfo(
                "Auto-Fill",
                "No new spelling variants to add.\n\n"
                "Fill in the Witness Name and County fields first, then try again."
            )
            return

        spellings_text = "\n".join(f"{k} = {v}" for k, v in new_entries.items())
        self._spellings_box.delete("1.0", "end")
        self._spellings_box.insert("1.0", spellings_text)

        added_count = len(new_entries) - len(existing)
        messagebox.showinfo(
            "Auto-Fill Complete",
            f"Added {added_count} spelling variant(s).\n\n"
            "Review the list and remove any that don't apply to this deposition.\n\n"
            "Format: wrong spelling = correct spelling"
        )

    def _on_process(self):
        """Validate fields and set self._result = JobConfig."""
        from spec_engine.models import JobConfig

        # Build speaker map from entries
        speaker_map = {}
        for sid, var in self._speaker_vars.items():
            role = var.get().strip()
            if role:
                speaker_map[sid] = role

        if not speaker_map:
            messagebox.showwarning("Speaker Map Empty",
                "You must assign at least one speaker role before processing.")
            return

        try:
            witness_id = int(self._fields["witness_id"].get())
            atty_id    = int(self._fields["examining_attorney_id"].get())
        except ValueError:
            messagebox.showerror("Invalid Input",
                "Witness ID and Examining Attorney ID must be numbers (0-5).")
            return

        defendant_raw = self._fields.get("defendant_names", ctk.StringVar()).get()
        defendants = [d.strip() for d in defendant_raw.splitlines() if d.strip()]

        cfg = JobConfig(
            witness_name          = self._fields["witness_name"].get().strip(),
            witness_title         = self._fields["witness_title"].get().strip(),
            depo_date             = self._fields["depo_date"].get().strip(),
            depo_start_time       = self._fields["depo_start_time"].get().strip(),
            depo_end_time         = self._fields["depo_end_time"].get().strip(),
            cause_number          = self._fields["cause_number"].get().strip(),
            court                 = self._fields["court"].get().strip(),
            method                = self._fields["method"].get(),
            subpoena_duces_tecum  = self._fields["subpoena_duces_tecum"].get(),
            plaintiff_name        = self._fields["plaintiff_name"].get().strip(),
            defendant_names       = defendants,
            reporter_name         = self._fields["reporter_name"].get().strip(),
            reporter_csr          = self._fields["reporter_csr"].get().strip(),
            reporter_firm         = self._fields["reporter_firm"].get().strip(),
            reporter_address      = self._fields["reporter_address"].get().strip(),
            speaker_map           = speaker_map,
            examining_attorney_id = atty_id,
            witness_id            = witness_id,
            confirmed_spellings   = self._parse_spellings(),
            split_embedded_answers= self._fields["split_embedded_answers"].get(),
            audio_quality         = self._fields["audio_quality"].get(),
            speaker_map_verified  = True,  # User confirmed via this dialog
        )

        base_cfg = getattr(self, "_base_cfg", None)
        if base_cfg is not None:
            cfg.plaintiff_counsel = list(getattr(base_cfg, "plaintiff_counsel", []))
            cfg.defense_counsel = list(getattr(base_cfg, "defense_counsel", []))
            cfg.also_present = list(getattr(base_cfg, "also_present", []))
            cfg.time_used = dict(getattr(base_cfg, "time_used", {}))
            cfg.witnesses = list(getattr(base_cfg, "witnesses", []))
            cfg.exhibits = list(getattr(base_cfg, "exhibits", []))
            cfg.changes = list(getattr(base_cfg, "changes", []))
            cfg.cost_total = getattr(base_cfg, "cost_total", "")
            cfg.reporter_city = getattr(base_cfg, "reporter_city", "")
            cfg.is_videotaped = getattr(base_cfg, "is_videotaped", False)
            cfg.total_volumes = getattr(base_cfg, "total_volumes", 1)
            cfg.volume_number = getattr(base_cfg, "volume_number", 1)
            cfg.proceeding_type = getattr(base_cfg, "proceeding_type", cfg.proceeding_type)
            cfg.location = getattr(base_cfg, "location", "")
            cfg.notary_name = getattr(base_cfg, "notary_name", "")
            cfg.notary_county = getattr(base_cfg, "notary_county", "")
            cfg.identification_method = getattr(base_cfg, "identification_method", "")
            cfg.is_official_reporter = getattr(base_cfg, "is_official_reporter", False)

        cfg.case_style             = self._fields.get("case_style", ctk.StringVar()).get().strip()
        cfg.appellate_cause_number = self._fields.get("appellate_cause_number", ctk.StringVar()).get().strip()
        cfg.county                 = self._fields.get("county", ctk.StringVar()).get().strip()
        cfg.judicial_district      = self._fields.get("judicial_district", ctk.StringVar()).get().strip()
        cfg.judge_name             = self._fields.get("judge_name", ctk.StringVar()).get().strip()
        cfg.location_city          = self._fields.get("location_city", ctk.StringVar()).get().strip()
        cfg.location_address       = self._fields.get("location_address", ctk.StringVar()).get().strip()
        cfg.reporter_expiration    = self._fields.get("reporter_expiration", ctk.StringVar()).get().strip()
        cfg.firm_registration      = self._fields.get("firm_registration", ctk.StringVar()).get().strip()
        cfg.reporter_phone         = self._fields.get("reporter_phone", ctk.StringVar()).get().strip()
        cfg.cost_paid_by           = self._fields.get("cost_paid_by", ctk.StringVar()).get().strip()
        cfg.certified_date         = self._fields.get("certified_date", ctk.StringVar()).get().strip()
        cfg.court_type            = self._fields.get("court_type",
                                        ctk.StringVar(value="District Court")).get()
        cfg.proceeding_type       = self._fields.get("proceeding_type",
                                        ctk.StringVar(value="Deposition")).get()
        cfg.location              = self._fields.get("location",
                                        ctk.StringVar()).get().strip()
        cfg.is_official_reporter  = self._fields.get("is_official_reporter",
                                        ctk.BooleanVar()).get()
        cfg.is_videotaped         = self._fields.get("is_videotaped",
                                        ctk.BooleanVar()).get()
        cfg.notary_name           = self._fields.get("notary_name",
                                        ctk.StringVar()).get().strip()
        cfg.notary_county         = self._fields.get("notary_county",
                                        ctk.StringVar()).get().strip()
        cfg.identification_method = self._fields.get("identification_method",
                                        ctk.StringVar()).get().strip()
        cfg.cost_total            = self._fields.get("cost_total",
                                        ctk.StringVar()).get().strip()

        try:
            cfg.volume_number = int(
                self._fields.get("volume_number", ctk.StringVar(value="1")).get())
        except ValueError:
            cfg.volume_number = 1
        try:
            cfg.total_volumes = int(
                self._fields.get("total_volumes", ctk.StringVar(value="1")).get())
        except ValueError:
            cfg.total_volumes = 1

        try:
            ap_raw = self._also_present_box.get("1.0", "end").strip()
            cfg.also_present = [n.strip() for n in ap_raw.splitlines() if n.strip()]
        except Exception:
            pass

        try:
            tu_raw = self._time_used_box.get("1.0", "end").strip()
            time_used = {}
            for line in tu_raw.splitlines():
                if "=" in line:
                    parts = line.split("=", 1)
                    atty = parts[0].strip()
                    time = parts[1].strip()
                    if atty:
                        time_used[atty] = time
            cfg.time_used = time_used
        except Exception:
            pass

        try:
            cfg.plaintiff_counsel = self._plaintiff_editor.get_counsel_list()
        except Exception:
            pass
        try:
            cfg.defense_counsel = self._defense_editor.get_counsel_list()
        except Exception:
            pass

        self._result = cfg
        self.destroy()

    def get_result(self):
        """Returns the JobConfig if user clicked Process, else None."""
        return self._result


class SpeakerVerifyDialog(ctk.CTkToplevel):
    """
    Two-column speaker verification dialog.

    LEFT  column: Speaker ID badge + first spoken sample line (context only)
    RIGHT column: Dropdown with standard role titles + names from uploaded docs

    The dropdown list is built dynamically from:
      1. Standard role titles (THE WITNESS, EXAMINING ATTORNEY, etc.)
      2. Names in parent._proper_nouns (populated when user uploads NOD docs)
    """

    BASE_ROLES = [
        "THE WITNESS",
        "EXAMINING ATTORNEY",
        "OPPOSING COUNSEL",
        "THE REPORTER",
        "THE VIDEOGRAPHER",
        "THE INTERPRETER",
        "OTHER COUNSEL",
        "UNKNOWN / SKIP",
    ]

    def __init__(self, parent, speaker_source, job_config=None, default_map=None):
        super().__init__(parent)
        self.title("Verify Speaker Roles")
        self.geometry("900x560")
        self.minsize(780, 440)
        self.resizable(True, True)
        self.grab_set()

        self._result = False
        self._job_config = job_config
        self._role_vars = {}
        self._speaker_map = {}
        self._speaker_source = speaker_source
        self._last_sid = 0
        self._parent_default_map = default_map or {}

        parsed_names: list[str] = []
        try:
            parsed_names = [n.strip() for n in parent._proper_nouns if n.strip()]
        except Exception:
            pass

        if parsed_names:
            self._dropdown_options = self.BASE_ROLES + sorted(set(parsed_names))
            self._dropdown_label = (
                f"Roles  +  {len(parsed_names)} name(s) from uploaded docs"
            )
        else:
            self._dropdown_options = list(self.BASE_ROLES)
            self._dropdown_label = "Standard Roles"

        if job_config is None:
            samples = {}
            for sid, texts in speaker_source.items():
                joined = " / ".join(
                    t[:55] + "..." if len(t) > 55 else t
                    for t in texts[:2]
                )
                samples[sid] = joined
        else:
            samples = {}
            for block in speaker_source[:80]:
                sid = block.speaker_id
                if sid not in samples:
                    preview = block.text[:100] + (
                        "..." if len(block.text) > 100 else "")
                    samples[sid] = preview

        self._build_ui(samples, job_config)

    def _build_ui(self, samples: dict, job_config):
        hdr = ctk.CTkFrame(self, fg_color=NAVY, corner_radius=0)
        hdr.pack(fill="x")
        ctk.CTkLabel(
            hdr,
            text="Confirm Speaker Roles Before Processing",
            font=("Segoe UI", 13, "bold"), text_color=TEXT_WHITE,
        ).pack(side="left", padx=16, pady=10)
        ctk.CTkLabel(
            hdr,
            text=self._dropdown_label,
            font=("Segoe UI", 9), text_color="#8EB4D8",
        ).pack(side="right", padx=16, pady=10)

        ctk.CTkLabel(
            self,
            text=(
                "Match each Speaker ID to the correct person or role using the dropdown.\n"
                "Upload Notice of Deposition documents on the Transcribe tab to add names."
            ),
            font=("Segoe UI", 10), text_color=TEXT_MID, justify="left",
        ).pack(anchor="w", padx=16, pady=(10, 4))

        ctk.CTkFrame(self, fg_color=BORDER_LIGHT, height=1).pack(
            fill="x", padx=16, pady=(0, 0))

        hdr_row = ctk.CTkFrame(self, fg_color=BG_INPUT, corner_radius=0)
        hdr_row.pack(fill="x", padx=16, pady=(0, 0))
        hdr_row.columnconfigure(0, weight=0, minsize=120)
        hdr_row.columnconfigure(1, weight=1)
        hdr_row.columnconfigure(2, weight=0, minsize=290)

        for col_i, col_lbl in enumerate([
            "SPEAKER ID", "FIRST SPOKEN LINE (sample)", "ASSIGN ROLE OR NAME"
        ]):
            ctk.CTkLabel(
                hdr_row, text=col_lbl,
                font=("Segoe UI", 9, "bold"), text_color=TEXT_MUTED,
            ).grid(row=0, column=col_i, sticky="w", padx=8, pady=5)

        scroll = ctk.CTkScrollableFrame(self, fg_color=BG_APP)
        scroll.pack(fill="both", expand=True, padx=12, pady=(0, 4))
        scroll.columnconfigure(0, weight=0, minsize=120)
        scroll.columnconfigure(1, weight=1)
        scroll.columnconfigure(2, weight=0, minsize=290)

        sorted_sids = sorted(samples.keys())
        if sorted_sids:
            self._last_sid = sorted_sids[-1]

        for row_i, sid in enumerate(sorted_sids):
            preview = samples[sid]
            bg = BG_CARD if row_i % 2 == 0 else BG_APP

            id_cell = ctk.CTkFrame(scroll, fg_color=bg, corner_radius=0)
            id_cell.grid(row=row_i, column=0, sticky="nsew",
                         padx=(4, 2), pady=1)
            ctk.CTkLabel(
                id_cell,
                text=f"Speaker {sid}",
                font=("Segoe UI", 11, "bold"), text_color=NAVY,
            ).pack(anchor="w", padx=10, pady=8)

            sample_cell = ctk.CTkFrame(scroll, fg_color=bg, corner_radius=0)
            sample_cell.grid(row=row_i, column=1, sticky="nsew",
                             padx=2, pady=1)
            ctk.CTkLabel(
                sample_cell,
                text=preview,
                font=("Segoe UI", 10), text_color=TEXT_MID,
                anchor="w", wraplength=360, justify="left",
            ).pack(anchor="w", padx=8, pady=8)

            drop_cell = ctk.CTkFrame(scroll, fg_color=bg, corner_radius=0)
            drop_cell.grid(row=row_i, column=2, sticky="nsew",
                           padx=(2, 4), pady=1)

            if job_config is not None:
                existing = job_config.speaker_map.get(sid, "")
            else:
                existing = self._parent_default_map.get(sid, "")

            if not existing:
                existing = self._smart_guess(sid, preview)

            if existing not in self._dropdown_options:
                existing = self.BASE_ROLES[0]

            var = ctk.StringVar(value=existing)
            self._role_vars[sid] = var

            ctk.CTkOptionMenu(
                drop_cell,
                variable=var,
                values=self._dropdown_options,
                width=272,
                font=("Segoe UI", 10),
                fg_color=BG_INPUT,
                button_color=NAVY,
                button_hover_color=NAVY_HOVER,
                dropdown_fg_color=BG_CARD,
                dropdown_hover_color=BG_INPUT,
                text_color=TEXT_DARK,
                dynamic_resizing=False,
            ).pack(anchor="w", padx=8, pady=7)

        manual_strip = ctk.CTkFrame(
            self, fg_color=BG_INPUT,
            border_width=1, border_color=BORDER_MID, corner_radius=6)
        manual_strip.pack(fill="x", padx=16, pady=(4, 4))

        ctk.CTkLabel(
            manual_strip,
            text="Type a custom name for any speaker:",
            font=("Segoe UI", 9), text_color=TEXT_MUTED,
        ).pack(side="left", padx=10, pady=6)

        self._sid_selector_var = ctk.StringVar(
            value=f"Speaker {self._last_sid}" if sorted_sids else "")
        ctk.CTkOptionMenu(
            manual_strip,
            variable=self._sid_selector_var,
            values=[f"Speaker {s}" for s in sorted_sids],
            width=120,
            font=("Segoe UI", 10),
            fg_color=BG_CARD,
            button_color=NAVY,
            button_hover_color=NAVY_HOVER,
            text_color=TEXT_DARK,
        ).pack(side="left", padx=(0, 6), pady=6)

        self._manual_entry = ctk.CTkEntry(
            manual_strip, width=210, font=("Segoe UI", 10),
            fg_color=BG_CARD,
            placeholder_text="e.g.  MR. JOHNSON",
            border_color=BORDER_LIGHT, text_color=TEXT_DARK, height=28)
        self._manual_entry.pack(side="left", padx=(0, 6), pady=6)

        SecondaryBtn(
            manual_strip, text="Apply",
            command=self._apply_manual_entry,
            height=28, width=72,
        ).pack(side="left", pady=6)

        btn_row = ctk.CTkFrame(
            self, fg_color=BG_CARD,
            border_width=1, border_color=BORDER_LIGHT, corner_radius=0)
        btn_row.pack(fill="x")

        ctk.CTkLabel(
            btn_row,
            text="Cancelling will abort processing. Speaker map must be confirmed.",
            font=("Segoe UI", 9), text_color=TEXT_MUTED,
        ).pack(side="left", padx=14, pady=10)

        SecondaryBtn(btn_row, text="Cancel",
                     command=self._on_cancel).pack(
            side="right", padx=10, pady=10)
        GoldBtn(btn_row, text="Confirm Speaker Map",
                command=self._on_confirm).pack(
            side="right", padx=(0, 6), pady=10)

    def _apply_manual_entry(self):
        """Push the typed custom name into the selected speaker's dropdown var."""
        name = self._manual_entry.get().strip()
        if not name:
            return
        try:
            sid_str = self._sid_selector_var.get()
            sid = int(sid_str.split()[-1])
            if sid in self._role_vars:
                self._role_vars[sid].set(name)
                if name not in self._dropdown_options:
                    self._dropdown_options.append(name)
        except Exception:
            pass
        self._manual_entry.delete(0, "end")

    def _smart_guess(self, sid: int, text: str) -> str:
        """
        Guess speaker role from sample text and speaker ID.
        Falls back to the parent word-count heuristic when available.
        """
        t = text.lower()
        if any(w in t for w in [
            "raise your right hand", "solemnly swear", "court reporter",
            "licensed in texas", "csr", "i am mia", "i'm mia",
            "certified shorthand", "number 12129", "reporting service",
            "you may proceed", "you can lower your hand",
        ]):
            return "THE REPORTER"
        if any(w in t for w in [
            "on the record", "off the record", "videographer",
            "going on record", "we are now on the record",
        ]):
            return "THE VIDEOGRAPHER"
        if any(w in t for w in [
            "i represent", "representing the defendant",
            "my name is raul", "my name is",
            "i'm an attorney", "i am an attorney",
            "let me ask you", "good afternoon",
            "have you ever given a deposition",
            "go ahead and give me your full name",
            "state your name for the record",
        ]):
            return "EXAMINING ATTORNEY"
        if any(w in t for w in [
            "object to form", "objection", "we'll reserve",
            "i agree pursuant", "for plaintiff", "for the plaintiff",
            "wyatt law firm", "on behalf of plaintiff",
        ]):
            return "OPPOSING COUNSEL"
        if any(w in t for w in ["interpreter", "translate", "en espanol"]):
            return "THE INTERPRETER"
        if sid in self._parent_default_map:
            return self._parent_default_map[sid]
        return "THE WITNESS"

    def _on_confirm(self):
        skip = "UNKNOWN / SKIP"
        # Commit any pending manual entry so the last typed custom role is not lost
        # when the user clicks Confirm without pressing Apply first.
        self._apply_manual_entry()
        if self._job_config is not None:
            for sid, var in self._role_vars.items():
                role = var.get().strip()
                if role and role != skip:
                    self._job_config.speaker_map[sid] = role
            self._job_config.speaker_map_verified = True
            self._speaker_map = dict(self._job_config.speaker_map)
        else:
            self._speaker_map = {
                sid: var.get()
                for sid, var in self._role_vars.items()
                if var.get().strip() and var.get() != skip
            }
        self._result = True
        self.destroy()

    def _on_cancel(self):
        self._result = False
        self.destroy()

    @property
    def confirmed(self) -> bool:
        return self._result

    @property
    def speaker_map(self) -> dict:
        return self._speaker_map

    def was_confirmed(self) -> bool:
        return self._result


def main():
    for _dir in ("temp", "output", "logs"):
        (_HERE / _dir).mkdir(parents=True, exist_ok=True)
    app = DepoProToolsApp()
    app.mainloop()


if __name__ == "__main__":
    main()
