@echo off
setlocal EnableExtensions

set "ROOT=%~dp0.."
set "FRONTEND_DIR=%ROOT%\frontend"
set "FRONTEND_PORT=63000"

cd /d "%FRONTEND_DIR%" || (
  echo [ERROR] Failed to enter frontend directory.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] Installing frontend dependencies...
  call npm install || (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Starting frontend on http://127.0.0.1:%FRONTEND_PORT%
call npm run dev -- --host localhost --port %FRONTEND_PORT%
