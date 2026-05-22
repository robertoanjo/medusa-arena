@echo off
title Medusa Arena

echo.
echo  [*] Iniciando Medusa Arena...
echo.

:: Backend
cd /d "%~dp0backend"
if not exist node_modules (
  echo  [1/2] Instalando dependencias do backend...
  call npm install
)
start "Medusa Backend" cmd /k "node server.js"

:: Aguarda o servidor subir
timeout /t 2 /nobreak > nul

:: Frontend
cd /d "%~dp0frontend"
if not exist node_modules (
  echo  [2/2] Instalando dependencias do frontend...
  call npm install
)
start "Medusa Frontend" cmd /k "npm run dev"

echo.
echo  Backend : http://localhost:3001
echo  Frontend: http://localhost:5173
echo.
pause
