@echo off
title MRS SOLAR - Web Application Starter
echo ========================================================
echo         MRS SOLAR - Web Application Launcher
echo ========================================================
echo.
echo Starting Backend API Server on http://localhost:5000 ...
start "MRS SOLAR Backend (Port 5000)" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 3 >nul

echo Starting Frontend Web Portal on http://localhost:5173 ...
start "MRS SOLAR Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo.
echo ========================================================
echo   MRS SOLAR is now running!
echo   Website URL: http://localhost:5173
echo ========================================================
echo.
start http://localhost:5173
pause
