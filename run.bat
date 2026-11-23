@echo off
title FRILEA - Coche
cd /d "%~dp0"
echo.
echo   FRILEA - Coche
echo   -----------------------------
echo   Abriendo en el navegador...
echo   Para cerrar: pulsa Ctrl+C en esta ventana.
echo.
start "" "http://localhost:8030/"
python -m http.server 8030 --bind 127.0.0.1
pause
