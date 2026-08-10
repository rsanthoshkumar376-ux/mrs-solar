@echo off
title MRS SOLAR - Production Server Launcher
echo ========================================================
echo         MRS SOLAR - Web Application Launcher
echo ========================================================
echo.
echo Starting MRS SOLAR Server on http://localhost:5000 ...
start "MRS SOLAR Server" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 >nul

echo.
echo ========================================================
echo   MRS SOLAR is now running!
echo   Website URL: http://localhost:5000
echo ========================================================
echo.
start http://localhost:5000
