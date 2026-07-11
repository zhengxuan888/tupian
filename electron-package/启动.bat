@echo off
title AI Image Processor
cd /d "%~dp0"

REM Create desktop shortcut on first run
if not exist "%USERPROFILE%\Desktop\AI图片处理器.lnk" (
    echo Creating desktop shortcut with icon...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'AI图片处理器.lnk')); $s.TargetPath = '%SystemRoot%\system32\wscript.exe'; $s.Arguments = '\"%~dp0启动.vbs\"'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0app-icon.jpg'; $s.Description = 'AI Image Processor'; $s.Save(); Write-Host 'Shortcut created!'"
    echo.
)

echo.
echo   Starting AI Image Processor...
echo   (Close this window to stop the app)
echo.

node server.js

pause
