@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "NODE=%~dp0runtime\node\node.exe"
set "NPM=%~dp0runtime\node\npm.cmd"
set "USE_PORTABLE=1"

if not exist "%NODE%" (
  echo [WARN] Portable Node not found, trying system Node...
  where node >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Node.js not found
    echo Run npm run package:portable
    echo Or install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
  )
  set "NODE=node"
  set "NPM=npm"
  set "USE_PORTABLE=0"
)

if "%USE_PORTABLE%"=="1" set "PATH=%~dp0runtime\node;%PATH%"

if not exist "node_modules\" (
  echo Installing dependencies...
  call "%NPM%" install
  if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo Building frontend...
  call "%NPM%" run build
  if errorlevel 1 (
    echo [ERROR] build failed
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo [ERROR] Missing .env file
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Flow Analysis Local
echo   Open http://localhost:8888 in browser
echo   Press Ctrl+C to stop
echo ========================================
echo.

start "" cmd /c "timeout /t 8 /nobreak >nul && start http://localhost:8888"

call "%NPM%" run start:local

echo.
echo Server stopped.
pause