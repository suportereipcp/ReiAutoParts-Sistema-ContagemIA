@echo off
REM ============================================================================
REM  Build do instalador .exe usando Inno Setup Compiler (ISCC.exe)
REM
REM  Pre-requisito: Inno Setup 6 instalado.
REM    Download: https://jrsoftware.org/isdl.php
REM    Padrao:  C:\Program Files (x86)\Inno Setup 6\ISCC.exe
REM
REM  Saida: installer\Output\ContagemReiAutoParts-Setup.exe
REM ============================================================================
setlocal
cd /d "%~dp0"

set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if not exist "%ISCC%" (
    echo [ERRO] Inno Setup 6 nao encontrado.
    echo        Instale via winget:  winget install JRSoftware.InnoSetup
    echo        Ou baixe em:        https://jrsoftware.org/isdl.php
    pause
    exit /b 1
)

echo [INFO] Compilando contagem-rei-autoparts.iss...
"%ISCC%" "contagem-rei-autoparts.iss"
if errorlevel 1 (
    echo [ERRO] Falha na compilacao.
    pause
    exit /b 1
)

echo.
echo [PRONTO] Instalador gerado em: %~dp0Output\ContagemReiAutoParts-Setup.exe
pause
