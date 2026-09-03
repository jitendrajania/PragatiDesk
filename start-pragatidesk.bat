@echo off
title PragatiDesk - Services Launcher
color 0A
echo ======================================================================
echo           PRAGATIDESK (DoIT^&C Rajasthan) - SYSTEM LAUNCHER
echo ======================================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking Node.js and dependencies...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo [2/3] Starting PragatiDesk Backend (Port 5000) ^& Frontend (Port 3000)...
echo.
echo   - Frontend:  http://localhost:3000
echo   - Backend:   http://localhost:5000/api/health
echo.
npm run dev
