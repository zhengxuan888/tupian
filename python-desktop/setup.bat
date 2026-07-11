@echo off
title Setup - Image Processor
color 0A

echo.
echo  ============================================
echo    Image Processor - Dependency Setup
echo  ============================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Python is not installed!
    echo.
    echo  Please download and install Python 3.10+ from:
    echo  https://www.python.org/downloads/
    echo.
    echo  IMPORTANT: Check "Add Python to PATH" during install!
    echo.
    pause
    exit /b 1
)

echo  [OK] Python found:
python --version
echo.

REM Check pip
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] pip is not installed!
    echo  Please reinstall Python with "Add Python to PATH" checked.
    pause
    exit /b 1
)

echo  [OK] pip found
echo.

REM Install dependencies
echo  Installing dependencies...
echo  This may take a few minutes on first run.
echo.

echo  [1/6] Installing PyQt5 (UI framework)...
pip install PyQt5 --quiet
if %errorlevel% neq 0 (
    echo  [WARN] PyQt5 install had issues, trying again...
    pip install PyQt5
)

echo  [2/6] Installing piexif (EXIF processing)...
pip install piexif --quiet

echo  [3/6] Installing Pillow (image processing)...
pip install Pillow --quiet

echo  [4/6] Installing numpy (math library)...
pip install "numpy<2" --quiet

echo  [5/6] Installing OpenCV (watermark removal)...
pip install "opencv-python-headless>=4.5.0,<5.0.0" --quiet

echo  [6/6] Installing requests (network)...
pip install requests --quiet

echo.
echo  ============================================
echo    Optional: AI Background Removal
echo  ============================================
echo.
echo  Install rembg for AI background removal?
echo  This downloads ~170MB AI model on first use.
echo.
set /p install_rembg="  Install rembg? (y/n): "
if /i "%install_rembg%"=="y" (
    echo.
    echo  Installing rembg with CPU support...
    pip install "rembg[cpu]" --quiet
)

echo.
echo  ============================================
echo    Setup Complete!
echo  ============================================
echo.
echo  You can now run the application:
echo    - Double-click "run.bat"
echo    - Or run: python main.py
echo.
pause
