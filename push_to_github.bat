@echo off
title MRS SOLAR - GitHub Publisher
echo ========================================================
echo         MRS SOLAR - Publish to GitHub
echo ========================================================
echo.
echo Target Repository: https://github.com/rsanthoshkumar376-ux/mrs-solar
echo.
git remote remove origin 2>nul
git remote add origin https://github.com/rsanthoshkumar376-ux/mrs-solar.git
git branch -M main
echo Pushing codebase to GitHub...
git push -u origin main
echo.
echo ========================================================
echo If finished, your project is now live on GitHub:
echo https://github.com/rsanthoshkumar376-ux/mrs-solar
echo ========================================================
pause
