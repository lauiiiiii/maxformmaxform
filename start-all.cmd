@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"
set "BACKEND_PORT=63002"
set "FRONTEND_PORT=63000"

echo [INFO] Starting backend and frontend...
echo [INFO] Backend:  http://127.0.0.1:%BACKEND_PORT%
echo [INFO] Frontend: http://127.0.0.1:%FRONTEND_PORT%

where node >nul 2>nul || (
  echo [ERROR] Node.js was not found. Please install Node 18+ first.
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm was not found. Please check your Node.js installation.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Missing backend package.json.
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Missing frontend package.json.
  pause
  exit /b 1
)

start "Backend" cmd /k ""%ROOT%scripts\start-backend-dev.cmd""

echo [INFO] Waiting 5 seconds before starting frontend...
timeout /t 5 /nobreak >nul

start "Frontend" cmd /k ""%ROOT%scripts\start-frontend-dev.cmd""

echo [INFO] Startup windows opened.
echo [INFO] Open http://127.0.0.1:%FRONTEND_PORT%
pause
