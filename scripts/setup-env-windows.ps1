#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Configura variáveis de ambiente do sistema Windows para o Rei AutoContagem.
  Após rodar, o .env pode ser removido com segurança.

.DESCRIPTION
  Lê os valores do .env atual (se existir) ou solicita interativamente.
  Grava como variáveis de máquina (Machine scope) — persistem entre reboots.

.EXAMPLE
  # Rodar como Administrador:
  .\scripts\setup-env-windows.ps1
#>

param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

# Variáveis obrigatórias (sem valor padrão)
$required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CAMERA_1_IP",
    "CAMERA_2_IP"
)

# Todas as variáveis do projeto
$allVars = @{}

# Tenta ler do .env existente
if (Test-Path $EnvFile) {
    Write-Host "Lendo valores de $EnvFile..." -ForegroundColor Cyan
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2 -and $parts[1].Trim() -ne "") {
                $allVars[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
} else {
    Write-Host "Arquivo .env nao encontrado. Informe os valores manualmente." -ForegroundColor Yellow
}

# Solicita valores faltantes das obrigatórias
foreach ($key in $required) {
    if (-not $allVars.ContainsKey($key) -or $allVars[$key] -eq "") {
        $val = Read-Host "Informe o valor para $key"
        if ([string]::IsNullOrWhiteSpace($val)) {
            Write-Error "Variavel obrigatoria $key nao pode ser vazia."
            exit 1
        }
        $allVars[$key] = $val
    }
}

# Grava no ambiente de máquina
Write-Host "`nGravando variaveis no ambiente do sistema (Machine)..." -ForegroundColor Green
foreach ($kv in $allVars.GetEnumerator()) {
    [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, "Machine")
    Write-Host "  [OK] $($kv.Key)" -ForegroundColor DarkGreen
}

Write-Host "`nPronto! $($allVars.Count) variaveis configuradas." -ForegroundColor Green
Write-Host "Voce pode agora deletar o arquivo .env com seguranca." -ForegroundColor Yellow
Write-Host "IMPORTANTE: Reinicie o terminal/servico para que as variaveis sejam carregadas." -ForegroundColor Yellow
