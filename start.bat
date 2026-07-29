@echo off
cd /d "%~dp0"
set "NUCLEARUSB_OPEN_BROWSER=1"
if not exist server\node_modules (
  echo Installing dependencies...
  cd /d "%~dp0server"
  npm install
  cd /d "%~dp0"
)
call scripts\launch-windows.bat
