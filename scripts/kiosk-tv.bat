@echo off
REM Abre Chrome em kiosk no Monitor 2 apontando para a TV
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --start-fullscreen --window-position=1920,0 "http://localhost:3000/tv/"
