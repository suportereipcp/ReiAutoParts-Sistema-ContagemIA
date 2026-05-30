# installer/wpf/lib/Steps.ps1
# Lógica de negócio de cada etapa do wizard

function Invoke-CheckPrerequisites {
    param([hashtable]$UI)
    $results = @{
        Node = $false
        Git = $false
        Python = $false
    }

    # Node.js >= 20
    $nodeVer = Get-NodeVersion
    if ($nodeVer -and $nodeVer.Major -ge 20) {
        $results.Node = $true
        $UI.NodeStatus.Text = [char]0x2713 + " Node.js $nodeVer"
        $UI.NodeStatus.Foreground = '#4ade80'
    } else {
        $UI.NodeStatus.Text = [char]0x2717 + " Node.js nao encontrado"
        $UI.NodeStatus.Foreground = '#f87171'
    }

    # Git
    $gitVer = Get-GitVersion
    if ($gitVer) {
        $results.Git = $true
        $UI.GitStatus.Text = [char]0x2713 + " Git $gitVer"
        $UI.GitStatus.Foreground = '#4ade80'
    } else {
        $UI.GitStatus.Text = [char]0x2717 + " Git nao encontrado"
        $UI.GitStatus.Foreground = '#f87171'
    }

    # Python >= 3.12
    $pyVer = Get-PythonVersion
    if ($pyVer -and $pyVer.Major -eq 3 -and $pyVer.Minor -ge 12) {
        $results.Python = $true
        $UI.PythonStatus.Text = [char]0x2713 + " Python $pyVer"
        $UI.PythonStatus.Foreground = '#4ade80'
    } else {
        $UI.PythonStatus.Text = [char]0x2717 + " Python nao encontrado"
        $UI.PythonStatus.Foreground = '#f87171'
    }

    $allOk = $results.Node -and $results.Git -and $results.Python
    $UI.BtnInstallPrereqs.Visibility = if ($allOk) { 'Collapsed' } else { 'Visible' }
    $UI.BtnNext1.IsEnabled = $allOk
    return $results
}

function Invoke-InstallPrerequisites {
    param([hashtable]$UI, [hashtable]$Missing)

    $UI.BtnInstallPrereqs.IsEnabled = $false
    $UI.PrereqProgress.Visibility = 'Visible'

    if ($Missing.Node) {
        $UI.PrereqProgressText.Text = "Instalando Node.js LTS..."
        $ok = Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js'
        if (-not $ok) {
            Install-WithDownload 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' '/quiet /norestart'
        }
    }

    if ($Missing.Git) {
        $UI.PrereqProgressText.Text = "Instalando Git..."
        $ok = Install-WithWinget 'Git.Git' 'Git'
        if (-not $ok) {
            Install-WithDownload 'https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/Git-2.45.2-64-bit.exe' '/VERYSILENT /NORESTART /NOCANCEL /SP-'
        }
    }

    if ($Missing.Python) {
        $UI.PrereqProgressText.Text = "Instalando Python 3.12..."
        $ok = Install-WithWinget 'Python.Python.3.12' 'Python 3.12'
        if (-not $ok) {
            Install-WithDownload 'https://www.python.org/ftp/python/3.12.5/python-3.12.5-amd64.exe' '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0'
        }
    }

    Refresh-PathEnv
    $UI.PrereqProgressText.Text = "Verificando instalacao..."
    Start-Sleep -Seconds 2
    $UI.PrereqProgress.Visibility = 'Collapsed'
    $UI.BtnInstallPrereqs.IsEnabled = $true
    Invoke-CheckPrerequisites -UI $UI
}

function Invoke-ValidateToken {
    param([hashtable]$UI)
    $token = $UI.TokenInput.Password
    if ([string]::IsNullOrWhiteSpace($token)) {
        $UI.TokenFeedback.Text = "Token nao pode ser vazio"
        $UI.TokenFeedback.Foreground = '#f87171'
        return $false
    }

    $UI.TokenFeedback.Text = "Validando..."
    $UI.TokenFeedback.Foreground = '#94a3b8'
    $UI.BtnValidateToken.IsEnabled = $false

    $valid = Test-GitHubToken -Token $token
    if ($valid) {
        $UI.TokenFeedback.Text = [char]0x2713 + " Acesso confirmado ao repositorio"
        $UI.TokenFeedback.Foreground = '#4ade80'
        $UI.BtnNext2.IsEnabled = $true
        $script:GitHubToken = $token
    } else {
        $UI.TokenFeedback.Text = [char]0x2717 + " Token invalido ou sem acesso ao repositorio"
        $UI.TokenFeedback.Foreground = '#f87171'
    }
    $UI.BtnValidateToken.IsEnabled = $true
    return $valid
}

function Invoke-ValidateSupabase {
    param([hashtable]$UI)
    $url = $UI.SupabaseUrl.Text.Trim()
    $anon = $UI.SupabaseAnon.Password.Trim()
    $service = $UI.SupabaseService.Password.Trim()

    $allFilled = (-not [string]::IsNullOrWhiteSpace($url)) -and
                 (-not [string]::IsNullOrWhiteSpace($anon)) -and
                 (-not [string]::IsNullOrWhiteSpace($service))

    $UI.BtnNext3.IsEnabled = $allFilled

    if ($allFilled) {
        $script:SupabaseUrl = $url
        $script:SupabaseAnonKey = $anon
        $script:SupabaseServiceKey = $service
    }
    return $allFilled
}

function Invoke-Installation {
    param([hashtable]$UI)
    $appDir = 'C:\ContagemReiAutoParts'
    $logBox = $UI.InstallLog
    $progressBar = $UI.InstallProgress

    # 1) Clone (25%)
    $progressBar.Value = 0
    $UI.InstallStepText.Text = "Clonando repositorio..."
    Write-InstallLog "Iniciando clone do repositorio..." $logBox
    $cloneUrl = "https://${script:GitHubToken}@github.com/EmilioVoltolini/contagem-reiautoparts.git"
    if (Test-Path $appDir) {
        Write-InstallLog "Diretorio $appDir ja existe. Removendo..." $logBox
        Remove-Item $appDir -Recurse -Force
    }
    & git clone $cloneUrl $appDir 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    $progressBar.Value = 25

    # 2) npm install (50%)
    $UI.InstallStepText.Text = "Instalando dependencias..."
    Write-InstallLog "Executando npm install --omit=dev..." $logBox
    Refresh-PathEnv
    Push-Location $appDir
    & npm install --omit=dev --no-audit --no-fund 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    Pop-Location
    $progressBar.Value = 50

    # 3) Env vars Machine + .env (70%)
    $UI.InstallStepText.Text = "Configurando ambiente..."
    Write-InstallLog "Gravando variaveis de ambiente (Machine)..." $logBox
    Set-MachineEnvVar 'GITHUB_TOKEN' $script:GitHubToken
    Set-MachineEnvVar 'NEXT_PUBLIC_SUPABASE_URL' $script:SupabaseUrl
    Set-MachineEnvVar 'NEXT_PUBLIC_SUPABASE_ANON_KEY' $script:SupabaseAnonKey
    Set-MachineEnvVar 'SUPABASE_SERVICE_ROLE_KEY' $script:SupabaseServiceKey

    # Copiar .env.example -> .env (sem as 4 variaveis sensiveis)
    $envExample = Join-Path $appDir '.env.example'
    $envFile = Join-Path $appDir '.env'
    if (Test-Path $envExample) {
        $content = Get-Content $envExample | Where-Object {
            $_ -notmatch '^(GITHUB_TOKEN|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)='
        }
        $content | Set-Content $envFile -Encoding UTF8
        Write-InstallLog ".env criado (variaveis sensiveis em env Machine)" $logBox
    }
    $progressBar.Value = 70

    # 4) PM2 (85%)
    $UI.InstallStepText.Text = "Instalando PM2..."
    Write-InstallLog "Instalando PM2 global..." $logBox
    & npm install -g pm2 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    $progressBar.Value = 85

    # 5) Atalhos (100%)
    $UI.InstallStepText.Text = "Criando atalhos..."
    Write-InstallLog "Criando atalhos no desktop e menu iniciar..." $logBox
    $shell = New-Object -ComObject WScript.Shell

    # Desktop publico
    $desktopPath = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $lnk = $shell.CreateShortcut("$desktopPath\Sistema de Contagem.lnk")
    $lnk.TargetPath = Join-Path $appDir 'abrir-sistema.bat'
    $lnk.WorkingDirectory = $appDir
    $lnk.IconLocation = Join-Path $appDir 'public\favicon.ico'
    $lnk.Description = 'Sistema de Contagem Rei AutoParts'
    $lnk.Save()

    # Menu Iniciar
    $startMenu = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
    $lnk2 = $shell.CreateShortcut("$startMenu\Sistema de Contagem Rei AutoParts.lnk")
    $lnk2.TargetPath = Join-Path $appDir 'abrir-sistema.bat'
    $lnk2.WorkingDirectory = $appDir
    $lnk2.IconLocation = Join-Path $appDir 'public\favicon.ico'
    $lnk2.Description = 'Sistema de Contagem Rei AutoParts'
    $lnk2.Save()

    $progressBar.Value = 100
    $UI.InstallStepText.Text = "Instalacao concluida!"
    Write-InstallLog "=== Instalacao concluida com sucesso ===" $logBox

    # Mostrar painel de conclusao
    $UI.PanelProgress.Visibility = 'Collapsed'
    $UI.PanelDone.Visibility = 'Visible'
}
