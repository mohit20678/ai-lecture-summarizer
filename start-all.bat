@echo off
setlocal
cd /d "%~dp0"

if not exist "server\node_modules" (
  echo Installing backend packages...
  pushd server
  call npm install
  popd
)

if not exist "client\node_modules" (
  echo Installing frontend packages...
  pushd client
  call npm install
  popd
)

start "AI Lecture SERVER" /D "%~dp0server" cmd /k node index.js
start "AI Lecture WEBSITE" /D "%~dp0client" cmd /k npm run dev -- --open
endlocal
