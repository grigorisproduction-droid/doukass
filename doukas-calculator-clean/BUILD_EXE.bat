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
echo Building EXE (electron-builder)...
call npm.cmd run electron:pack
if errorlevel 1 (
  echo.
  echo Build FAILED. Check the output above.
  pause
  exit /b 1
)
echo.
echo Build OK. Looking for "release" folder...
if exist "%~dp0release" (
  echo Opening release folder...
  start "" "%~dp0release"
) else (
  echo release folder not found. Search for output in project directory.
)
pause
endlocal
