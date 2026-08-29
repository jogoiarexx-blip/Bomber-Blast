@echo off
setlocal
cd /d "%~dp0"
set /a PORT=8700 + (%RANDOM% %% 500)
start "Bomber Blast v0.4.1 Server" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1" -Port %PORT%
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:%PORT%/index.html"
exit /b
