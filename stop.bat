@echo off
chcp 65001 >nul
echo Stopping process on port 8888...

for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8888" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
  echo Killed PID %%a
)

echo Done.
pause