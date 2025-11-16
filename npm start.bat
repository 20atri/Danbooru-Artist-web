@echo off
title Danbooru Artist App
echo Starting the Danbooru Artist App...
echo.

:: 确保在项目根目录下执行 npm start
cd /d "%~dp0"

:: 启动 npm start
start npm start

:: 等待一段时间，确保服务器有足够时间启动
timeout /t 5 > nul

:: 自动在默认浏览器中打开页面
start http://localhost:3000/

echo.
echo Application finished or stopped.
pause