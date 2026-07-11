@echo off
title AI Image Processor - Build
cd /d "%~dp0"

echo.
echo ============================================================
echo   AI Image Processor - Windows Build
echo ============================================================
echo.

REM ========== Check Node.js ==========
echo [Step 0] Checking Node.js...
node -v 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js not found!
    echo Download: https://nodejs.org/
    goto :done
)
echo.

REM ========== Set mirrors BEFORE anything else ==========
echo [Step 1] Configuring mirrors...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CUSTOM_DIR=v31.7.7
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set npm_config_registry=https://registry.npmmirror.com
set npm_config_disturl=https://npmmirror.com/mirrors/node/
set npm_config_electron_mirror=https://npmmirror.com/mirrors/electron/
echo   Mirrors set to npmmirror.com
echo.

REM ========== Check pre-built files ==========
echo [Step 2] Checking files...
if not exist "electron-dist\main.js" (
    echo [ERROR] electron-dist\main.js missing!
    goto :done
)
if not exist "out\index.html" (
    echo [ERROR] out\index.html missing!
    goto :done
)
echo   OK - all files present
echo.

REM ========== Install ==========
echo [Step 3] Installing dependencies...
echo   (This downloads Electron ~80MB, may take 2-5 min)
echo   If stuck for more than 5 min, press Ctrl+C and retry.
echo.

call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo [ERROR] Install failed!
    echo   Fix 1: npm cache clean --force
    echo   Fix 2: Run as Administrator
    goto :done
)

REM Verify electron was downloaded
if not exist "node_modules\electron\dist\electron.exe" (
    echo.
    echo [ERROR] Electron binary not found after install!
    echo   Try: node node_modules\electron\install.js
    goto :done
)
echo.
echo   OK - Electron installed
echo.

REM ========== Build ==========
echo [Step 4] Building exe...
echo   (May take 3-8 min)
echo.

call npx electron-builder --win portable --config electron-builder.json
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    goto :done
)

echo.
echo ============================================================
echo   SUCCESS!
echo ============================================================
echo.
if exist "release\AI-Image-Processor-Portable.exe" (
    echo   File: release\AI-Image-Processor-Portable.exe
    echo.
    echo   Opening folder...
    explorer /select,"release\AI-Image-Processor-Portable.exe"
) else (
    echo   Check release\ folder for your .exe
    if exist "release" start "" "release"
)

:done
echo.
echo ============================================================
echo   Finished. Press any key to close.
echo ============================================================
pause >nul
