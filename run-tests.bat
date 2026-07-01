@echo off
cd /d "%~dp0"
echo Running Decibels test suite...
echo.
call npm test
echo.
pause
