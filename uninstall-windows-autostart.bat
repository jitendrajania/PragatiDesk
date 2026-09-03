@echo off
title PragatiDesk - Uninstall Auto-Start
color 0C
echo ======================================================================
echo    PRAGATIDESK - REMOVE AUTO-START ON COMPUTER BOOT
echo ======================================================================
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\PragatiDesk-AutoStart.vbs

if exist "%SHORTCUT_PATH%" (
    del /F /Q "%SHORTCUT_PATH%"
    echo [SUCCESS] Auto-start entry removed from Windows Startup folder.
) else (
    echo [INFO] No auto-start entry was found in %STARTUP_DIR%.
)

echo.
pause
