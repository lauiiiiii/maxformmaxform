@echo off
setlocal ENABLEDELAYEDEXPANSION
chcp 65001 >nul

set "ROOT=%~dp0"
echo [INFO] 项目根目录: %ROOT%

where node >nul 2>nul || ( echo [错误] 未检测到 Node.js，请先安装 Node 18+ & pause & exit /b 1 )
where npm  >nul 2>nul || ( echo [错误] 未检测到 npm，请确认 Node.js 安装包含 npm & pause & exit /b 1 )

pushd "%ROOT%frontend" || ( echo [错误] 未找到前端目录 frontend & pause & exit /b 1 )
echo [INFO] 进入目录: %CD%

if not exist "node_modules\" (
	echo [INFO] 首次运行，正在安装依赖...
	call npm install || ( echo [错误] 依赖安装失败，请检查网络或 npm 源 & popd & pause & exit /b 1 )
) else (
	echo [INFO] 依赖已安装，跳过 npm install
)

set PORT_TO_USE=63000
echo [INFO] 启动开发服务器：端口 !PORT_TO_USE!

call npm run dev -- --port !PORT_TO_USE!
if errorlevel 1 (
	echo [WARN] 端口 !PORT_TO_USE! 可能被占用，尝试 63001 ...
	set PORT_TO_USE=63001
	call npm run dev -- --port !PORT_TO_USE!
	if errorlevel 1 (
		echo [错误] 启动失败，请检查报错信息。
		popd
		pause
		exit /b 1
	)
)

popd
pause
