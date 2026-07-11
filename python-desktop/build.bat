@echo off
echo ============================================
echo   Image Processor - Build Script
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python from https://python.org
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

echo [1/4] Python found:
python --version
echo.

REM Create virtual environment
echo [2/4] Setting up virtual environment...
if not exist "venv" (
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo [3/4] Installing dependencies...
pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo [WARNING] Some optional dependencies failed to install.
    echo The app may still work with limited features.
    echo.
)
echo.

REM Build
echo [4/4] Building executable...
pip install pyinstaller >nul 2>&1
pyinstaller build.spec --clean --noconfirm
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   BUILD COMPLETE!
echo ============================================
echo.
echo Output: dist\AIImageProcessor.exe
echo.
echo You can run it directly or copy to any Windows PC.
echo.
pause
