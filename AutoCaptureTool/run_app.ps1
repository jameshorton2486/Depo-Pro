# ============================================================
# Auto Capture Tool - PowerShell Launcher
# Dynamically detects Python Tcl/Tk paths for GUI support
# ============================================================

Write-Host "Starting Auto Capture Tool..." -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.11 or higher from https://www.python.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Dynamically detect Python's Tcl/Tk paths
try {
    $pythonPrefix = python -c "import sys; print(sys.base_prefix)" 2>&1
    $tclPath = Join-Path $pythonPrefix "tcl\tcl8.6"
    $tkPath = Join-Path $pythonPrefix "tcl\tk8.6"
    
    if (Test-Path $tclPath -PathType Container) {
        $env:TCL_LIBRARY = $tclPath
        $env:TK_LIBRARY = $tkPath
        Write-Host "Tcl/Tk paths configured" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Could not find Tcl/Tk libraries. GUI may not work." -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not detect Tcl/Tk paths. GUI may not work." -ForegroundColor Yellow
}

# Change to script directory
Set-Location $PSScriptRoot

# Run the application
try {
    python Auto_Capture_Tool.py
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nERROR: Application failed to start" -ForegroundColor Red
        Write-Host "Make sure all dependencies are installed: pip install -r requirements.txt" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
    }
} catch {
    Write-Host "`nERROR: Failed to start application" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
