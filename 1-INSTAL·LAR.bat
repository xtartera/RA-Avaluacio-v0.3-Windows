@echo off
chcp 65001 >nul
title RA Avaluacio - Instal·lacio
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo No s'ha trobat Node.js.
  echo Instal·la Node.js LTS des de https://nodejs.org i torna a executar aquest fitxer.
  pause
  exit /b 1
)
echo Instal·lant els components necessaris...
call npm install
if errorlevel 1 (
  echo.
  echo La instal·lacio no ha finalitzat correctament.
  pause
  exit /b 1
)
echo.
echo Instal·lacio completada. Ara pots executar 2-OBRIR-APLICACIO.bat
pause
