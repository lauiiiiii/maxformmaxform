@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
set "BACKEND_DIR=%ROOT%\backend"

set "PORT=63002"
set "NODE_ENV=development"

cd /d "%BACKEND_DIR%" || (
  echo [ERROR] Failed to enter backend directory.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] Installing backend dependencies...
  call npm install || (
    echo [ERROR] Backend npm install failed.
    pause
    exit /b 1
  )
)

set "LISTEN_PID="
for /f %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"') do set "LISTEN_PID=%%p"
if not defined LISTEN_PID goto START_BACKEND
echo [INFO] Backend already running on http://127.0.0.1:%PORT%
echo [INFO] PID: %LISTEN_PID%
echo [INFO] Keep this window closed, or stop the old backend before restarting.
pause
exit /b 0

:START_BACKEND
echo [INFO] Starting backend on http://127.0.0.1:%PORT%
call npm run dev:once
