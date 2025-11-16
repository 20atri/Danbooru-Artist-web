@echo off
title Danbooru Artist App Setup
echo Starting first-run setup for Danbooru Artist App...
echo.

:: 确保在项目根目录下执行命令
cd /d "%~dp0"

echo Checking for Node.js and npm...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not found. Please install Node.js (which includes npm) from https://nodejs.org/
    echo After installation, please run this script again.
    pause
    exit /b 1
) else (
    echo Node.js found.
)

echo.
echo Installing npm dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo npm install failed. Please check your internet connection or npm configuration.
    pause
    exit /b 1
) else (
    echo.
    echo npm dependencies installed successfully.
)

echo.
echo Setup complete!
echo You can now run the application using 'start_app.bat'.
echo.
pause
exit /b 0