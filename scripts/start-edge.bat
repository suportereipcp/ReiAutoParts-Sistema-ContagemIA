@echo off
REM Inicia o serviço contagem-edge via pm2 e abre a UI do operador
cd /d "C:\Sistema de Contagem Rei AutoParts"
call pm2 start ecosystem.config.cjs
timeout /t 3 /nobreak >nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "http://localhost:3000/"
