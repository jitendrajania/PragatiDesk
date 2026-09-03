@echo off
title PragatiDesk - Install Auto-Start on Windows Boot
color 0B
echo ======================================================================
echo    PRAGATIDESK - CONFIGURE AUTO-START ON COMPUTER RESTART/BOOT
echo ======================================================================
echo.

set SCRIPT_DIR=%~dp0
set VBS_PATH=%SCRIPT_DIR%start-background.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\PragatiDesk-AutoStart.vbs

echo [1/2] Creating auto-start shortcut in Windows Startup Folder:
echo       Folder: %STARTUP_DIR%
echo.

copy /Y "%VBS_PATH%" "%SHORTCUT_PATH%" >nul

if %errorlevel% equ 0 (
    echo [2/2] SUCCESS! PragatiDesk Auto-Start has been configured.
    echo.
    echo ------------------------------------------------------------------
    echo  Whenever your computer restarts or logs in:
    echo  - Backend API: http://localhost:5000/api/health (Auto-starts)
    echo  - Frontend UI: http://localhost:3000 (Auto-starts)
    echo  - Runs silently in the background with ZERO terminal windows.
    echo ------------------------------------------------------------------
) else (
    echo [ERROR] Failed to create startup file. Please run as Administrator.
)

echo.
pause
