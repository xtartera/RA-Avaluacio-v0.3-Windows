@echo off
chcp 65001 >nul
title RA Avaluacio - Servidor local
cd /d "%~dp0"
if not exist "node_modules" (
  echo Primer cal executar 1-INSTAL·LAR.bat
  pause
  exit /b 1
)
echo Obrint RA Avaluacio en local...
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:5173'"
call npm run dev
