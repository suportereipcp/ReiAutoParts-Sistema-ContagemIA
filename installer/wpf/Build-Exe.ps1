# installer/wpf/Build-Exe.ps1
# Converte imagens .webp -> .png e compila o instalador em .exe

param(
    [string]$OutputDir = (Join-Path $PSScriptRoot 'Output')
)

$ErrorActionPreference = 'Stop'
$assetsDir = Join-Path $PSScriptRoot 'assets'

Write-Host "=== Build do Instalador Rei AutoParts ===" -ForegroundColor Cyan
Write-Host ""

# 1) Converter .webp -> .png (requer Python + Pillow)
Write-Host "[1/3] Convertendo imagens .webp para .png..." -ForegroundColor Yellow
$publicDir = Join-Path $PSScriptRoot '..\..\public'
$webpFiles = @(
    @{ src = 'base-rei-autoparts.webp'; dst = 'base-rei-autoparts.png' },
    @{ src = 'banner-rei-autoparts.webp'; dst = 'banner-rei-autoparts.png' },
    @{ src = 'base-suporterei.webp'; dst = 'base-suporterei.png' }
)

# Garantir pasta assets existe
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }

# Instalar Pillow se necessario
Write-Host "  Verificando Pillow..."
& python -m pip install Pillow --quiet 2>&1 | Out-Null

foreach ($img in $webpFiles) {
    $srcPath = Join-Path $publicDir $img.src
    $dstPath = Join-Path $assetsDir $img.dst
    if (-not (Test-Path $srcPath)) {
        Write-Warning "  Imagem nao encontrada: $srcPath"
        continue
    }
    $pyScript = "from PIL import Image; Image.open(r'$srcPath').save(r'$dstPath')"
    & python -c $pyScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $($img.src) -> $($img.dst)" -ForegroundColor Green
    } else {
        Write-Warning "  Falha ao converter $($img.src)"
    }
}

# 2) Verificar/instalar ps2exe
Write-Host ""
Write-Host "[2/3] Verificando ps2exe..." -ForegroundColor Yellow
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "  Instalando modulo ps2exe..."
    Install-Module ps2exe -Force -Scope CurrentUser
}
Write-Host "  [OK] ps2exe disponivel" -ForegroundColor Green

# 3) Compilar .exe
Write-Host ""
Write-Host "[3/3] Compilando .exe..." -ForegroundColor Yellow
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

$mainScript = Join-Path $PSScriptRoot 'Install-ReiAutoContagem.ps1'
$outputExe = Join-Path $OutputDir 'ReiAutoContagem-Installer.exe'
$iconPath = Join-Path $assetsDir 'icon.ico'

$ps2exeParams = @{
    InputFile    = $mainScript
    OutputFile   = $outputExe
    NoConsole    = $true
    RequireAdmin = $true
    Title        = 'Rei AutoParts - Instalador'
    Company      = 'Rei AutoParts'
    Version      = '1.0.0'
    Copyright    = 'Rei AutoParts 2026'
}

if (Test-Path $iconPath) {
    $ps2exeParams.IconFile = $iconPath
}

Invoke-ps2exe @ps2exeParams

if (Test-Path $outputExe) {
    Write-Host ""
    Write-Host "=== Build concluido ===" -ForegroundColor Green
    Write-Host "Saida: $outputExe"
    Write-Host "Tamanho: $([math]::Round((Get-Item $outputExe).Length / 1MB, 1)) MB"
} else {
    Write-Host ""
    Write-Error "Falha ao gerar o .exe. Verifique os erros acima."
}
