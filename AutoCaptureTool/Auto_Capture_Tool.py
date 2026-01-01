"""
Auto Capture Tool - Full-Page Screenshot Capture
Automated full-page screenshots using Selenium and Chrome DevTools Protocol.
"""

import os
import re
import json
import time
import pathlib
import threading
import tkinter as tk
from tkinter import filedialog, messagebox
from datetime import datetime
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from PIL import Image
import io

# Configuration file path
CONFIG_FILE = "auto_capture_config.json"

# Constants
MAX_RETRIES = 2

class DarkTheme:
    """Dark theme color constants."""
    BG_MAIN = "#1e1e1e"
    BG_PANEL = "#252526"
    BG_INPUT = "#3c3c3c"
    FG_TEXT = "#cccccc"
    FG_LABEL = "#858585"
    ACCENT = "#007acc"
    SUCCESS = "#4caf50"
    ERROR = "#f44336"


class AutoCaptureTool:
    """Main application class for Auto Capture Tool."""

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Auto Capture Tool")
        self.root.geometry("800x700")
        self.root.configure(bg=DarkTheme.BG_MAIN)

        # State
        self.is_running = False
        self.driver: webdriver.Chrome | None = None
        self.items_to_process: list[dict] = []
        self.stats = {"success": 0, "failed": 0, "skipped": 0}
        self.start_time: float | None = None

        # Default save directory (dynamic)
        default_dir = str(pathlib.Path.home() / "Documents" / "AutoCapture")
        os.makedirs(default_dir, exist_ok=True)

        # UI Variables
        self.save_directory_var = tk.StringVar(value=default_dir)
        self.format_var = tk.StringVar(value="PNG")
        self.width_var = tk.StringVar(value="1920")
        self.delay_var = tk.StringVar(value="3")
        self.headless_var = tk.BooleanVar(value=False)
        self.include_domain_var = tk.BooleanVar(value=True)

        # Build UI
        self._build_ui()

        # Load saved config
        self._load_config()

    # -----------------------------------------------------------------------------
    # UI BUILDING
    # -----------------------------------------------------------------------------

    def _build_ui(self) -> None:
        """Build the main UI."""
        # Main container
        main_frame = tk.Frame(self.root, bg=DarkTheme.BG_MAIN, padx=10, pady=10)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Title
        title = tk.Label(
            main_frame,
            text="Auto Capture Tool",
            font=("Arial", 18, "bold"),
            bg=DarkTheme.BG_MAIN,
            fg=DarkTheme.FG_TEXT,
        )
        title.pack(pady=(0, 10))

        # Input section
        input_frame = tk.LabelFrame(
            main_frame,
            text="Input URLs",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_TEXT,
            padx=10,
            pady=10,
        )
        input_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        # Text area for URLs
        self.url_text = tk.Text(
            input_frame,
            height=10,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            insertbackground=DarkTheme.FG_TEXT,
            wrap=tk.WORD,
        )
        self.url_text.pack(fill=tk.BOTH, expand=True)

        # Options section
        opt_frame = tk.LabelFrame(
            main_frame,
            text="Options",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_TEXT,
            padx=10,
            pady=10,
        )
        opt_frame.pack(fill=tk.X, pady=(0, 10))

        # Save directory
        dir_frame = tk.Frame(opt_frame, bg=DarkTheme.BG_PANEL)
        dir_frame.pack(fill=tk.X, pady=5)
        tk.Label(
            dir_frame,
            text="Save Directory:",
            width=15,
            anchor="w",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_LABEL,
        ).pack(side=tk.LEFT)
        self.entry_dir = tk.Entry(
            dir_frame,
            textvariable=self.save_directory_var,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            insertbackground=DarkTheme.FG_TEXT,
        )
        self.entry_dir.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        tk.Button(
            dir_frame,
            text="Browse",
            command=self._browse_directory,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            padx=6,
        ).pack(side=tk.LEFT)

        # Format selection
        format_frame = tk.Frame(opt_frame, bg=DarkTheme.BG_PANEL)
        format_frame.pack(fill=tk.X, pady=5)
        tk.Label(
            format_frame,
            text="Format:",
            width=15,
            anchor="w",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_LABEL,
        ).pack(side=tk.LEFT)
        format_menu = tk.OptionMenu(
            format_frame,
            self.format_var,
            "PNG",
            "JPG",
            "PDF",
            *[tk.StringVar()],
        )
        format_menu.config(
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            activebackground=DarkTheme.BG_INPUT,
        )
        format_menu.pack(side=tk.LEFT)

        # Width
        width_frame = tk.Frame(opt_frame, bg=DarkTheme.BG_PANEL)
        width_frame.pack(fill=tk.X, pady=5)
        tk.Label(
            width_frame,
            text="Browser Width:",
            width=15,
            anchor="w",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_LABEL,
        ).pack(side=tk.LEFT)
        tk.Entry(
            width_frame,
            textvariable=self.width_var,
            width=10,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            insertbackground=DarkTheme.FG_TEXT,
        ).pack(side=tk.LEFT, padx=5)

        # Delay
        delay_frame = tk.Frame(opt_frame, bg=DarkTheme.BG_PANEL)
        delay_frame.pack(fill=tk.X, pady=5)
        tk.Label(
            delay_frame,
            text="Delay (seconds):",
            width=15,
            anchor="w",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_LABEL,
        ).pack(side=tk.LEFT)
        tk.Entry(
            delay_frame,
            textvariable=self.delay_var,
            width=10,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            insertbackground=DarkTheme.FG_TEXT,
        ).pack(side=tk.LEFT, padx=5)

        # Headless checkbox
        headless_chk = tk.Checkbutton(
            opt_frame,
            text="Run headless (no browser window)",
            variable=self.headless_var,
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_TEXT,
            selectcolor=DarkTheme.BG_INPUT,
            activebackground=DarkTheme.BG_PANEL,
        )
        headless_chk.pack(anchor="w", pady=5)

        # Include domain checkbox
        domain_chk = tk.Checkbutton(
            opt_frame,
            text="Include domain in filename",
            variable=self.include_domain_var,
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_TEXT,
            selectcolor=DarkTheme.BG_INPUT,
            activebackground=DarkTheme.BG_PANEL,
        )
        domain_chk.pack(anchor="w", pady=5)

        # Progress bar
        self.progress_var = tk.StringVar(value="Ready")
        progress_label = tk.Label(
            main_frame,
            textvariable=self.progress_var,
            bg=DarkTheme.BG_MAIN,
            fg=DarkTheme.FG_TEXT,
        )
        progress_label.pack(pady=5)

        self.progress_bar = tk.Canvas(
            main_frame,
            height=20,
            bg=DarkTheme.BG_INPUT,
            highlightthickness=0,
        )
        self.progress_bar.pack(fill=tk.X, pady=(0, 10))

        # Buttons
        btn_frame = tk.Frame(main_frame, bg=DarkTheme.BG_MAIN)
        btn_frame.pack(fill=tk.X)

        self.start_btn = tk.Button(
            btn_frame,
            text="Start Capture",
            command=self.start_capture,
            bg=DarkTheme.SUCCESS,
            fg="white",
            padx=15,
            pady=8,
        )
        self.start_btn.pack(side=tk.LEFT, padx=5)

        self.stop_btn = tk.Button(
            btn_frame,
            text="Stop",
            command=self.stop_capture,
            bg=DarkTheme.ERROR,
            fg="white",
            padx=15,
            pady=8,
            state=tk.DISABLED,
        )
        self.stop_btn.pack(side=tk.LEFT, padx=5)

        self.export_log_btn = tk.Button(
            btn_frame,
            text="Export Log",
            command=self.export_log,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            padx=6,
            pady=4,
        )
        self.export_log_btn.pack(side=tk.LEFT, padx=5)

        # Log area
        log_frame = tk.LabelFrame(
            main_frame,
            text="Log",
            bg=DarkTheme.BG_PANEL,
            fg=DarkTheme.FG_TEXT,
            padx=10,
            pady=10,
        )
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        scrollbar = tk.Scrollbar(log_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.log_box = tk.Text(
            log_frame,
            height=8,
            bg=DarkTheme.BG_INPUT,
            fg=DarkTheme.FG_TEXT,
            insertbackground=DarkTheme.FG_TEXT,
            yscrollcommand=scrollbar.set,
            wrap=tk.WORD,
        )
        self.log_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=self.log_box.yview)

        # Keyboard shortcuts
        self.root.bind('<Control-Return>', lambda e: self.start_capture())
        self.root.bind('<Escape>', lambda e: self.stop_capture())
        self.root.bind('<Control-l>', lambda e: self.log_box.delete(1.0, tk.END))

    # -----------------------------------------------------------------------------
    # CONFIG PERSISTENCE
    # -----------------------------------------------------------------------------

    def _load_config(self) -> None:
        """Load saved settings from config file."""
        try:
            config_path = os.path.join(os.path.dirname(__file__), CONFIG_FILE)
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    if 'save_directory' in config:
                        self.entry_dir.delete(0, tk.END)
                        self.entry_dir.insert(0, config['save_directory'])
                        self.save_directory_var.set(config['save_directory'])
                    if 'format' in config:
                        self.format_var.set(config['format'])
                    if 'width' in config:
                        self.width_var.set(config['width'])
                    if 'delay' in config:
                        self.delay_var.set(config['delay'])
                    if 'headless' in config:
                        self.headless_var.set(config['headless'])
                    if 'include_domain' in config:
                        self.include_domain_var.set(config['include_domain'])
        except Exception as e:
            print(f"Could not load config: {e}")

    def _save_config(self) -> None:
        """Save current settings to config file."""
        try:
            config = {
                'save_directory': self.save_directory_var.get(),
                'format': self.format_var.get(),
                'width': self.width_var.get(),
                'delay': self.delay_var.get(),
                'headless': self.headless_var.get(),
                'include_domain': self.include_domain_var.get(),
            }
            config_path = os.path.join(os.path.dirname(__file__), CONFIG_FILE)
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Could not save config: {e}")

    # -----------------------------------------------------------------------------
    # UI HELPERS
    # -----------------------------------------------------------------------------

    def _browse_directory(self) -> None:
        """Open directory browser."""
        dir_path = filedialog.askdirectory(initialdir=self.save_directory_var.get())
        if dir_path:
            self.save_directory_var.set(dir_path)

    def log(self, message: str) -> None:
        """Thread-safe logging - schedules UI update on main thread."""
        timestamp = datetime.now().strftime("[%H:%M:%S]")
        self.root.after(0, self._log_to_ui, f"{timestamp} {message}\n")

    def _log_to_ui(self, message: str) -> None:
        """Internal: Actually writes to log box (runs on main thread)."""
        self.log_box.insert(tk.END, message)
        self.log_box.see(tk.END)

    def _update_progress(self, msg: str, value: int) -> None:
        """Thread-safe progress update."""
        self.root.after(0, self._do_update_progress, msg, value)

    def _do_update_progress(self, msg: str, value: int) -> None:
        """Internal: Actually updates progress bar (runs on main thread)."""
        self.progress_var.set(msg)
        self.progress_bar.delete("progress")
        width = self.progress_bar.winfo_width()
        if width > 1:
            fill_width = int((value / max(len(self.items_to_process), 1)) * width)
            self.progress_bar.create_rectangle(
                0, 0, fill_width, 20,
                fill=DarkTheme.ACCENT,
                tags="progress",
                outline="",
            )

    def export_log(self) -> None:
        """Export log contents to a text file."""
        filepath = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
            initialfilename=f"capture_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        if filepath:
            try:
                with open(filepath, 'w') as f:
                    f.write(self.log_box.get(1.0, tk.END))
                self.log(f"Log exported to {filepath}")
            except Exception as e:
                self.log(f"Export failed: {e}")

    # -----------------------------------------------------------------------------
    # URL PROCESSING
    # -----------------------------------------------------------------------------

    @staticmethod
    def validate_url(url: str) -> bool:
        """Check if URL is valid and accessible."""
        try:
            result = urlparse(url)
            return all([result.scheme in ('http', 'https'), result.netloc])
        except Exception:
            return False

    @staticmethod
    def extract_urls(raw_text: str) -> list[str]:
        """Extract and validate URLs from raw text."""
        pattern = r'https?://[^\s<>"\'`]+'
        results = re.findall(pattern, raw_text)

        unique = []
        seen = set()
        for url in results:
            clean = url.rstrip(".,;:)")
            if clean not in seen:
                # Validate URL structure
                try:
                    result = urlparse(clean)
                    if result.scheme in ('http', 'https') and result.netloc:
                        seen.add(clean)
                        unique.append(clean)
                except Exception:
                    pass

        return unique

    def url_to_filepath(self, url: str) -> tuple[str, str]:
        """Convert URL to filename and subdirectory."""
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")

        # Clean path
        path_parts = [p for p in parsed.path.split("/") if p and not p.startswith("?")]
        filename_parts = []

        if self.include_domain_var.get():
            filename_parts.append(domain)

        if path_parts:
            last_part = path_parts[-1]
            if "." in last_part and len(last_part.split(".")[-1]) <= 5:
                # Has extension
                filename_parts.append("_".join(path_parts[:-1] + [last_part.split(".")[0]]))
            else:
                filename_parts.extend(path_parts)
        else:
            filename_parts.append("index")

        filename = "_".join(filename_parts)
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        filename = filename[:200]  # Limit length

        subdir = domain if len(path_parts) > 1 else None

        return filename, subdir or ""

    # -----------------------------------------------------------------------------
    # FILE OPERATIONS
    # -----------------------------------------------------------------------------

    def _get_unique_filepath(self, folder: str, filename: str) -> str:
        """Generate unique filepath, adding counter if file exists."""
        filepath = os.path.join(folder, filename)
        if not os.path.exists(filepath):
            return filepath

        base, ext = os.path.splitext(filename)
        counter = 1
        while os.path.exists(filepath):
            filepath = os.path.join(folder, f"{base}_{counter}{ext}")
            counter += 1
        return filepath

    def _save_file(self, item: dict, screenshot_bytes: bytes) -> None:
        """Save screenshot to file."""
        folder = os.path.join(self.save_directory_var.get(), item["subdir"]) if item["subdir"] else self.save_directory_var.get()
        os.makedirs(folder, exist_ok=True)

        fmt = self.format_var.get()
        ext = fmt.lower()

        filepath = self._get_unique_filepath(folder, f"{item['filename']}.{ext}")

        if fmt == "PNG":
            img = Image.open(io.BytesIO(screenshot_bytes))
            img = self.flatten_rgba(img)
            img.save(filepath, "PNG")
        elif fmt == "JPG":
            img = Image.open(io.BytesIO(screenshot_bytes))
            img = self.flatten_rgba(img)
            img.save(filepath, "JPEG", quality=95)
        elif fmt == "PDF":
            img = Image.open(io.BytesIO(screenshot_bytes))
            img = self.flatten_rgba(img)
            img.save(filepath, "PDF", resolution=100.0)

        self.log(f"Saved: {os.path.basename(filepath)}")

    def flatten_rgba(self, img: Image.Image) -> Image.Image:
        """Convert RGBA image to RGB with white background."""
        if img.mode == "RGBA":
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[3])
            return bg
        return img

    # -----------------------------------------------------------------------------
    # CAPTURE LOGIC
    # -----------------------------------------------------------------------------

    def _capture_full_page(self) -> bytes:
        """Capture full page screenshot using Chrome DevTools Protocol."""
        if not self.driver:
            raise RuntimeError("Driver not initialized")

        # Get page dimensions
        total_height = self.driver.execute_script("return document.body.scrollHeight")
        viewport_height = self.driver.execute_script("return window.innerHeight")
        viewport_width = self.driver.execute_script("return window.innerWidth")

        # Scroll and capture
        screenshots = []
        for i in range(0, total_height, viewport_height):
            self.driver.execute_script(f"window.scrollTo(0, {i});")
            time.sleep(0.2)  # Small delay for rendering

            screenshot = self.driver.get_screenshot_as_png()
            screenshots.append(Image.open(io.BytesIO(screenshot)))

        # Reset scroll
        self.driver.execute_script("window.scrollTo(0, 0);")

        # Stitch screenshots
        if len(screenshots) == 1:
            final_img = screenshots[0]
        else:
            total_width = viewport_width
            final_height = total_height

            final_img = Image.new("RGB", (total_width, final_height), (255, 255, 255))

            y_offset = 0
            for img in screenshots:
                final_img.paste(img, (0, y_offset))
                y_offset += viewport_height

        # Convert to bytes
        img_bytes = io.BytesIO()
        final_img.save(img_bytes, format="PNG")
        return img_bytes.getvalue()

    def _capture_loop(self) -> None:
        """Main capture loop (runs in background thread)."""
        try:
            # Reset stats
            self.stats = {"success": 0, "failed": 0, "skipped": 0}
            self.start_time = time.time()

            # Setup Chrome driver
            options = Options()
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument(f"--window-size={self.width_var.get()},1080")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)

            if self.headless_var.get():
                options.add_argument("--headless=new")

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.driver.set_page_load_timeout(60)  # 60 second timeout per page

            delay = float(self.delay_var.get() or 3)

            # Process each URL
            for idx, item in enumerate(self.items_to_process):
                if not self.is_running:
                    break

                url = item["url"]
                self._update_progress(f"Processing {idx + 1}/{len(self.items_to_process)}", idx)

                # Retry logic
                success = False
                for attempt in range(MAX_RETRIES + 1):
                    try:
                        self.log(f"Loading: {url}")
                        self.driver.get(url)
                        time.sleep(delay)
                        success = True
                        break
                    except TimeoutException:
                        if attempt < MAX_RETRIES:
                            self.log(f"Retry {attempt + 1}/{MAX_RETRIES} for {url}")
                            time.sleep(2)
                        else:
                            self.log(f"Timeout after {MAX_RETRIES} retries: {url}")
                            self.stats["failed"] += 1
                            continue
                    except WebDriverException as e:
                        if attempt < MAX_RETRIES:
                            self.log(f"Retry {attempt + 1}/{MAX_RETRIES} for {url}")
                            time.sleep(2)
                        else:
                            self.log(f"Browser error on {url}: {e}")
                            self.stats["failed"] += 1
                            continue

                if not success or not self.is_running:
                    continue

                try:
                    # Wait for page to be ready
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.TAG_NAME, "body"))
                    )

                    # Capture screenshot
                    screenshot_bytes = self._capture_full_page()

                    # Save file
                    self._save_file(item, screenshot_bytes)
                    self.stats["success"] += 1

                except Exception as e:
                    self.log(f"Error capturing {url}: {e}")
                    self.stats["failed"] += 1

            # Cleanup
            if self.driver:
                self.driver.quit()
                self.driver = None

            # Show summary
            if self.is_running:
                elapsed = time.time() - (self.start_time or 0)
                summary = f"Done! ✓{self.stats['success']} ✗{self.stats['failed']} in {elapsed:.1f}s"
                self.log(summary)
                self._update_progress(summary, len(self.items_to_process))

                def show_completion():
                    messagebox.showinfo(
                        "Done",
                        f"Capture completed.\n\nSuccess: {self.stats['success']}\nFailed: {self.stats['failed']}"
                    )

                self.root.after(0, show_completion)

        except Exception as e:
            self.log(f"Fatal error: {e}")
            if self.driver:
                try:
                    self.driver.quit()
                except Exception:
                    pass
                self.driver = None

        finally:
            # Reset UI state
            self.root.after(0, self._reset_ui_state)

    def _reset_ui_state(self) -> None:
        """Reset UI state after capture completes."""
        self.is_running = False
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)

    # -----------------------------------------------------------------------------
    # CONTROL METHODS
    # -----------------------------------------------------------------------------

    def start_capture(self) -> None:
        """Start the capture process."""
        # Save config
        self._save_config()

        # Extract URLs
        raw_text = self.url_text.get(1.0, tk.END)
        urls = self.extract_urls(raw_text)

        if not urls:
            messagebox.showwarning("No URLs", "Please enter at least one valid URL.")
            return

        # Validate save directory
        save_dir = self.save_directory_var.get()
        if not save_dir or not os.path.isdir(save_dir):
            messagebox.showerror("Invalid Directory", "Please select a valid save directory.")
            return

        # Build items list
        self.items_to_process = []
        for url in urls:
            if not self.validate_url(url):
                self.log(f"Skipping invalid URL: {url}")
                self.stats["skipped"] += 1
                continue

            filename, subdir = self.url_to_filepath(url)
            self.items_to_process.append({
                "url": url,
                "filename": filename,
                "subdir": subdir,
            })

        if not self.items_to_process:
            messagebox.showwarning("No Valid URLs", "No valid URLs found to process.")
            return

        # Start capture thread
        self.is_running = True
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

        thread = threading.Thread(target=self._capture_loop, daemon=True)
        thread.start()

        self.log(f"Starting capture of {len(self.items_to_process)} URLs...")

    def stop_capture(self) -> None:
        """Stop the capture process gracefully."""
        self.is_running = False
        self.log("Stopping capture...")
        if self.driver:
            try:
                self.driver.execute_script("window.stop();")
            except Exception:
                pass


def main() -> None:
    """Main entry point."""
    root = tk.Tk()
    app = AutoCaptureTool(root)
    root.mainloop()


if __name__ == "__main__":
    main()
