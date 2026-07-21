@echo off
title KawanKu AI - Local Server
echo.
echo  ================================
echo   KawanKu AI - Starting Server
echo  ================================
echo.

:: Try system Python first, then fall back to bundled Python
where python >nul 2>&1
if %errorlevel% == 0 (
    set PYTHON=python
    goto :start
)

set PYTHON=C:\Users\shaoh\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe
if exist "%PYTHON%" goto :start

echo [ERROR] Python not found. Please install Python or check your PATH.
pause
exit /b 1

:start
echo  Server running at: http://localhost:8000
echo  Press Ctrl+C to stop.
echo.
start http://localhost:8000
"%PYTHON%" -m http.server 8000
pause
