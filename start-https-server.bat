@echo off
cd /d "%~dp0"
powershell -NoExit -ExecutionPolicy Bypass -Command "& 'C:\Program Files\nodejs\node.exe' server.js"
