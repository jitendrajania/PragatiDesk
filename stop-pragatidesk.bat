@echo off
title PragatiDesk - Stop Services
color 0E
echo ======================================================================
echo           PRAGATIDESK - STOPPING RUNNING SERVICES (3000 & 5000)
echo ======================================================================
echo.

powershell -Command "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host 'All PragatiDesk service processes on port 3000 & 5000 stopped.' -ForegroundColor Green"

echo.
pause
