# Auto Capture Tool

Automated full-page screenshot capture tool for web pages using Selenium and Chrome DevTools Protocol.

## Prerequisites

- Python 3.11 or higher
- Google Chrome browser installed

## Quick Start

### Windows (Recommended)
Double-click `run_app.bat` or right-click `run_app.ps1` → "Run with PowerShell"

### Manual Setup

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run
python Auto_Capture_Tool.py
```

## Features

- **Full-page screenshot capture** - Automatically scrolls and captures entire pages
- **Multiple output formats** - PNG, JPG, PDF
- **Configurable browser width** - Set custom viewport sizes
- **Page load delay** - Wait time for dynamic content to load
- **Dark theme UI** - Modern, easy-on-the-eyes interface
- **Headless mode** - Run browser in background (no window)
- **Auto-retry on failures** - Automatically retries failed captures
- **Settings persistence** - Saves your preferences between sessions
- **URL validation** - Filters out invalid URLs automatically
- **File collision prevention** - Automatically renames files if duplicates exist
- **Log export** - Export capture logs for debugging

## Keyboard Shortcuts

- `Ctrl+Enter` - Start capture
- `Escape` - Stop capture
- `Ctrl+L` - Clear log

## Usage

1. **Paste URLs** - Enter one or more URLs in the text area (one per line or separated by spaces)
2. **Configure options**:
   - **Save Directory** - Where screenshots will be saved
   - **Format** - PNG, JPG, or PDF
   - **Browser Width** - Viewport width in pixels (default: 1920)
   - **Delay** - Seconds to wait after page load (default: 3)
   - **Headless Mode** - Run browser without visible window
   - **Include Domain** - Add domain name to filename
3. **Click "Start Capture"** - The tool will process all URLs automatically
4. **View progress** - Watch the progress bar and log output
5. **Review results** - Screenshots saved to your chosen directory

## File Organization

Screenshots are organized by domain:
```
Documents/AutoCapture/
├── example.com/
│   ├── page1.png
│   ├── page2.png
└── another-site.com/
    └── index.png
```

## Troubleshooting

### Tkinter GUI Error
The launcher scripts automatically set Tcl/Tk paths. If you see errors:
- Ensure you're using the launcher scripts (`run_app.bat` or `run_app.ps1`)
- On Windows, make sure Python was installed with "tcl/tk and IDLE" option
- Try reinstalling Python with the full installer

### Chrome Driver Issues
The tool automatically downloads the correct ChromeDriver. Ensure:
- Chrome browser is installed and up to date
- You have internet connection (for initial driver download)
- Antivirus isn't blocking ChromeDriver

### Timeout Errors
If pages timeout:
- Increase the "Delay" setting to give pages more time to load
- Check your internet connection
- Verify the URLs are accessible
- Try disabling headless mode to see what's happening

### Permission Errors
If you can't save files:
- Ensure the save directory exists and is writable
- Try choosing a different directory (like Desktop)
- Check antivirus isn't blocking file writes

## Configuration

Settings are automatically saved to `auto_capture_config.json` in the same directory as the script. You can edit this file directly or change settings in the UI.

## Technical Details

- **Framework**: Python 3.11+ with Tkinter
- **Browser Automation**: Selenium WebDriver
- **Chrome Driver**: Auto-managed via webdriver-manager
- **Image Processing**: Pillow (PIL)
- **Full-Page Capture**: Uses Chrome DevTools Protocol for scrolling and stitching

## License

This tool is provided as-is for personal and commercial use.
