@echo off
chcp 65001 >nul 2>&1
setlocal
title NuclearUSB - Windows Offline AI
cls

echo =======================================================
echo   NuclearUSB - Windows Offline AI Launcher
echo   Target: Windows 10/11 x64, optional NVIDIA CUDA
echo =======================================================
echo.

set "ROOT=%~dp0"
pushd "%ROOT%.."
set "PROJECT_ROOT=%cd%"
popd

set "LLM_BIN=%PROJECT_ROOT%\downloads\runtime\llm\win\llama-server.exe"
set "MODEL_FAST=%PROJECT_ROOT%\downloads\models\fast\Phi-3.5-mini-instruct-Q4_K_M.gguf"
set "INSTALLER_DIR=%PROJECT_ROOT%\downloads\installers\node"
set "APP_URL=http://localhost:3001"

echo   Project root: %PROJECT_ROOT%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is NOT available in PATH.
    echo.
    for %%i in ("%INSTALLER_DIR%\*.msi") do (
      echo Found Node.js installer:
      echo %%~fi
      echo.
      echo Run that installer, then launch NuclearUSB again.
      pause
      exit /b 1
    )
    echo No local Node.js installer found in:
    echo %INSTALLER_DIR%
    echo.
    echo Download Node.js 18+ LTS for Windows x64:
    echo https://nodejs.org/en/download
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
echo [OK] Node.js found: %NODE_VER%

if exist "%LLM_BIN%" (
    echo [OK] llama-server.exe found.
) else (
    echo [--] llama-server.exe not found.
)

if exist "%MODEL_FAST%" (
    echo [OK] Fast GGUF model found.
) else (
    echo [--] Fast GGUF model not found.
)

if exist "%LLM_BIN%" if exist "%MODEL_FAST%" (
    echo [MODE] REAL MODE possible after model health check.
) else (
    echo [MODE] DEMO MODE fallback available.
)

echo.
echo =======================================================
echo   Starting NuclearUSB server on port 3001...
echo   Press Ctrl+C to stop the server.
echo =======================================================
echo.

start "" /b cmd /c "ping 127.0.0.1 -n 4 >nul && start "" "%APP_URL%""

cd /d "%PROJECT_ROOT%"
node server\index.js

echo.
echo =======================================================
echo   Server has stopped.
echo =======================================================
echo.
pause
endlocal
