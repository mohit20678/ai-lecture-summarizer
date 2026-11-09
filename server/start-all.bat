@echo off
start "AI Lecture SERVER" /D "%~dp0server" cmd /k node index.js
start "AI Lecture WEBSITE" /D "%~dp0client" cmd /k npm run dev -- --open
