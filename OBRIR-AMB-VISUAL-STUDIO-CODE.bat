@echo off
cd /d "%~dp0"
where code >nul 2>nul
if errorlevel 1 (
  echo Visual Studio Code no esta disponible des de la linia d'ordres.
  echo Obre manualment el fitxer RA-Avaluacio.code-workspace.
  pause
  exit /b 1
)
code "RA-Avaluacio.code-workspace"
