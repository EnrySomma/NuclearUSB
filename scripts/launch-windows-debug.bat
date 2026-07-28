@echo off
chcp 65001 >nul 2>&1
setlocal
title NuclearUSB - DEBUG Launcher
cls

echo =======================================================
echo   NuclearUSB - DEBUG Launcher
echo   Server logs will appear directly in this window.
echo   Browser will NOT open automatically.
echo =======================================================
echo.

REM ---- Self-locate project root from script directory ----
set "ROOT=%~dp0"
pushd "%ROOT%.."
set "PROJECT_ROOT=%cd%"
popd

set "LLM_BIN=%PROJECT_ROOT%\downloads\runtime\llm\win\llama-server.exe"
set "MODEL_FILE=%PROJECT_ROOT%\downloads\models\fast\Phi-3.5-mini-instruct-Q4_K_M.gguf"

echo   Project root: %PROJECT_ROOT%
echo.

REM ---- Check Node.js ----
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is NOT available in PATH.
    echo.
    echo         Install Node.js 18+ from https://nodejs.org
    echo         Then re-run this launcher.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
echo [OK] Node.js found: %NODE_VER%

REM ---- Check llama-server.exe ----
if exist "%LLM_BIN%" (
    echo [OK] llama-server.exe found - REAL MODE possible
) else (
    echo [--] llama-server.exe not found - DEMO MODE
)

REM ---- Check default model ----
if exist "%MODEL_FILE%" (
    echo [OK] Default model GGUF found
) else (
    echo [--] Default model GGUF not found - DEMO MODE
)

echo.
echo =======================================================
echo   Starting NuclearUSB server (DEBUG) on port 3001...
echo   Open http://localhost:3001 manually in your browser.
echo   Press Ctrl+C to stop the server.
echo =======================================================
echo.

REM ---- Run server in foreground, no browser ----
cd /d "%PROJECT_ROOT%"
node server/index.js

echo.
echo =======================================================
echo   Server has stopped.
echo =======================================================
echo.
pause
endlocal
