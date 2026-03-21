@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

set "ROOT=%~dp0"
pushd "%ROOT%backend" || ( echo [错误] 未找到后端目录 backend & pause & exit /b 1 )

if not exist .env (
  echo [提示] 未发现 .env，复制 .env.example
  if exist .env.example copy /Y .env.example .env >nul 2>&1
)

if not exist "node_modules\" (
  echo [INFO] 首次运行，正在安装依赖...
  call npm install || ( echo [错误] 依赖安装失败 & popd & pause & exit /b 1 )
) else (
  echo [INFO] 依赖已安装，跳过 npm install
)

set LISTEN_PID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":63002 " ^| findstr LISTENING') do set LISTEN_PID=%%p
if defined LISTEN_PID (
  echo [INFO] 后端已在运行中 (PID: !LISTEN_PID!, 端口: 63002)
  echo [INFO] 无需重复启动
  popd
  pause
  exit /b 0
)

echo [INFO] 启动后端: http://127.0.0.1:63002
node server.js

popd
pause
