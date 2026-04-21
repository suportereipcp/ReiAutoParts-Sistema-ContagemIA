@echo off
setlocal enabledelayedexpansion

REM =====================================================
REM  Rei AutoParts - Sistema de Contagem
REM  Sobe o servidor e abre Monitor 1 (operador) + Monitor 2 (TV kiosk).
REM  Duplo clique abre o sistema completo.
REM =====================================================

title Rei AutoParts - Abrindo Sistema...
cd /d "%~dp0"

REM --- Detectar Chrome --------------------------------------------------
set "CHROME="
for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do if exist %%P set "CHROME=%%~P"

if "%CHROME%"=="" (
    echo [ERRO] Google Chrome nao encontrado.
    echo        Instale o Chrome e tente novamente.
    pause
    exit /b 1
)

REM --- Subir servidor: PM2 (producao) ou npm start (fallback) ----------
where pm2 >nul 2>&1
if %errorlevel%==0 (
    echo [INFO] Iniciando contagem-edge via PM2...
    call pm2 describe contagem-edge >nul 2>&1
    if !errorlevel!==0 (
        call pm2 restart contagem-edge >nul
    ) else (
        call pm2 start ecosystem.config.cjs >nul
    )
) else (
    echo [WARN] PM2 nao instalado - usando "npm start" em janela minimizada.
    echo        Para producao, instale PM2: npm install -g pm2 pm2-windows-startup
    start "contagem-edge" /min cmd /c "npm start"
)

REM --- Aguardar /health responder (timeout 30s) ------------------------
echo [INFO] Aguardando servidor em http://localhost:3000/health ...
set /a TENTATIVAS=0
:aguardar_health
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:3000/health).StatusCode -eq 200 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if !errorlevel!==0 goto health_ok
set /a TENTATIVAS+=1
if !TENTATIVAS! geq 15 (
    echo [ERRO] Servidor nao respondeu em 30s.
    echo        Verifique logs em .\logs\ ou rode "npm run dev" manualmente para diagnostico.
    pause
    exit /b 1
)
timeout /t 2 /nobreak >nul
goto aguardar_health

:health_ok
echo [OK] Servidor online.

REM --- Monitor 1: operador (janela normal) -----------------------------
echo [INFO] Abrindo Monitor 1 (operador)...
start "" "%CHROME%" --new-window "http://localhost:3000/"

REM --- Monitor 2: TV kiosk no segundo monitor --------------------------
REM  Ajuste --window-position se o Monitor 2 nao estiver em 1920,0
echo [INFO] Abrindo Monitor 2 (TV kiosk)...
start "" "%CHROME%" --kiosk --start-fullscreen --window-position=1920,0 "http://localhost:3000/tv/"

echo.
echo [PRONTO] Sistema aberto.
timeout /t 3 /nobreak >nul
exit /b 0
