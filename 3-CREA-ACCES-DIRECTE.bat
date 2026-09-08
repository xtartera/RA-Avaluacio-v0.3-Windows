@echo off
chcp 65001 >nul
title RA Avaluacio - Crea acces directe
cd /d "%~dp0"
echo Creant l'acces directe a l'escriptori...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0assets\create-shortcut.ps1"
if errorlevel 1 (
  echo.
  echo No s'ha pogut crear l'acces directe.
  pause
  exit /b 1
)
echo.
echo Fet! Ja tens la icona "RA Avaluacio" a l'escriptori.
pause
