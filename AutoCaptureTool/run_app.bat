@echo off
REM ============================================================
REM Auto Capture Tool - Windows Batch Launcher
REM Dynamically detects Python Tcl/Tk paths for GUI support
REM ============================================================

echo Starting Auto Capture Tool...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 or higher from https://www.python.org/
    pause
    exit /b 1
)

REM Dynamically detect Python's Tcl/Tk paths
for /f "tokens=*" %%i in ('python -c "import sys; print(sys.prefix)"') do set PYTHON_PREFIX=%%i
if exist "%PYTHON_PREFIX%\tcl\tcl8.6" (
    set TCL_LIBRARY=%PYTHON_PREFIX%\tcl\tcl8.6
    set TK_LIBRARY=%PYTHON_PREFIX%\tcl\tk8.6
) else (
    REM Try venv's base Python
    for /f "tokens=*" %%i in ('python -c "import sys; print(sys.base_prefix)"') do set PYTHON_BASE=%%i
    if exist "%PYTHON_BASE%\tcl\tcl8.6" (
        set TCL_LIBRARY=%PYTHON_BASE%\tcl\tcl8.6
        set TK_LIBRARY=%PYTHON_BASE%\tcl\tk8.6
    ) else (
        echo WARNING: Could not find Tcl/Tk libraries. GUI may not work.
    )
)

REM Change to script directory
cd /d "%~dp0"

REM Run the application
python Auto_Capture_Tool.py

if errorlevel 1 (
    echo.
    echo ERROR: Application failed to start
    echo Make sure all dependencies are installed: pip install -r requirements.txt
    pause
)
