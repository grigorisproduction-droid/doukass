@echo off
setlocal
cd /d %~dp0
echo Installing dependencies...
call npm.cmd install
if errorlevel 1 (
  echo.
  echo npm install FAILED. Check the output above.
  pause
  exit /b 1
)
echo.
echo Starting Vite + Electron...
call npm.cmd run electron:dev
endlocal
