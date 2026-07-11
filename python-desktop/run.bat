@echo off
title Image Processor

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Python is not installed!
    echo.
    echo  Please install Python first:
    echo  1. Visit https://www.python.org/downloads/
    echo  2. Download and install Python 3.10+
    echo  3. IMPORTANT: Check "Add Python to PATH"
    echo  4. Then double-click "setup.bat" to install dependencies
    echo.
    pause
    exit /b 1
)

echo Starting Image Processor...
echo.
python main.py

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Application crashed.
    echo.
    echo  If you see "Missing dependencies" above, please run:
    echo    setup.bat
    echo.
    echo  Or check the log file:
    echo    %USERPROFILE%\.ai_image_processor\logs\app.log
    echo.
)

pause
