@echo off
title LedgerLine Full-Stack Core Banking Platform
color 0B
echo ========================================================
echo  Starting LedgerLine Core Banking Platform...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"
pause
