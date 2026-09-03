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
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"
call npm run dev
