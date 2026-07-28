@echo off
chcp 65001 >nul 2>&1
setlocal
title NuclearUSB - Stop

echo =======================================================
echo   NuclearUSB fallback stop script
echo =======================================================
echo.
echo WARNING: This may stop all node.exe and llama-server.exe
echo processes on this Windows user session, not only NuclearUSB.
echo.

taskkill /IM llama-server.exe /T /F >nul 2>&1
if errorlevel 1 (
  echo [--] No llama-server.exe process was stopped.
) else (
  echo [OK] llama-server.exe stopped.
)

taskkill /IM node.exe /T /F >nul 2>&1
if errorlevel 1 (
  echo [--] No node.exe process was stopped.
) else (
  echo [OK] node.exe stopped.
)

echo.
echo Done.
pause
endlocal
