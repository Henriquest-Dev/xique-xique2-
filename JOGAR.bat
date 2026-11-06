@echo off
chcp 65001 >nul
title Xique-Xique 2
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao foi encontrado. Instala em https://nodejs.org e tenta de novo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo A instalar dependencias pela primeira vez...
  call npm install
)
call npm run doctor
echo.
echo A iniciar o jogo em http://localhost:3000  (Ctrl+C para parar)
start "" http://localhost:3000
call npm run dev
pause
