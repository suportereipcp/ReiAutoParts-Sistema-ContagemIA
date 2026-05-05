# ============================================================================
#  Pos-instalacao: npm install (--omit=dev), prepara .env, garante PM2
# ============================================================================
param(
  [Parameter(Mandatory=$true)][string]$AppDir
)

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

function Write-Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

# Recarregar PATH (Node/npm acabaram de ser instalados)
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Set-Location $AppDir
Write-Log "AppDir = $AppDir"

# .env nao existe? copia .env.example para o operador editar manualmente depois
$envFile     = Join-Path $AppDir '.env'
$envTemplate = Join-Path $AppDir '.env.example'
if (-not (Test-Path $envFile) -and (Test-Path $envTemplate)) {
  Copy-Item $envTemplate $envFile
  Write-Log ".env criado a partir de .env.example. Editar com IPs/credenciais antes de iniciar."
}

# npm install (producao)
if (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Log "Executando npm install --omit=dev..."
  & npm install --omit=dev --no-audit --no-fund 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Log "npm install retornou $LASTEXITCODE. Tentando install completo..."
    & npm install --no-audit --no-fund 2>&1 | Out-Host
  }
} else {
  Write-Log "[ERRO] npm nao disponivel apos pre-requisitos."
}

# PM2 global (recomendado pelo abrir-sistema.bat)
if (Get-Command npm -ErrorAction SilentlyContinue) {
  if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Log "Instalando PM2 global..."
    & npm install -g pm2 pm2-windows-startup 2>&1 | Out-Host
  }
}

# Garante pasta data/ + logs/
foreach ($d in @('data','logs')) {
  $p = Join-Path $AppDir $d
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

Write-Log "Pos-instalacao concluida."
exit 0
