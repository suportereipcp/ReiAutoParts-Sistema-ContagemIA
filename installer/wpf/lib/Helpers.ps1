# installer/wpf/lib/Helpers.ps1
# Funções utilitárias para o instalador Rei AutoParts

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Get-NodeVersion {
    if (Test-CommandExists 'node') {
        $v = (node --version 2>$null) -replace '^v',''
        return [version]$v
    }
    return $null
}

function Get-PythonVersion {
    if (Test-CommandExists 'python') {
        $raw = python --version 2>&1
        $v = ($raw -replace '^Python\s+','').Trim()
        return [version]$v
    }
    return $null
}

function Get-GitVersion {
    if (Test-CommandExists 'git') {
        $raw = git --version 2>$null
        $v = ($raw -replace '^git version\s+','') -replace '\.windows.*',''
        return [version]$v
    }
    return $null
}

function Refresh-PathEnv {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                [System.Environment]::GetEnvironmentVariable('Path','User')
}

function Install-WithWinget {
    param([string]$PackageId, [string]$Name)
    $hasWinget = Test-CommandExists 'winget'
    if (-not $hasWinget) { return $false }
    $wargs = @('install','--id',$PackageId,'-e','--silent',
              '--accept-source-agreements','--accept-package-agreements','--scope','machine')
    & winget @wargs 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Install-WithDownload {
    param([string]$Url, [string]$Arguments)
    $ext = [System.IO.Path]::GetExtension($Url)
    $tmp = Join-Path $env:TEMP ("rei-prereq-" + [Guid]::NewGuid().ToString('N') + $ext)
    Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
    $p = Start-Process -FilePath $tmp -ArgumentList $Arguments -Wait -PassThru
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    return ($p.ExitCode -eq 0)
}

function Set-MachineEnvVar {
    param([string]$Name, [string]$Value)
    [System.Environment]::SetEnvironmentVariable($Name, $Value, 'Machine')
}

function Test-GitHubToken {
    param([string]$Token)
    $url = "https://${Token}@github.com/EmilioVoltolini/contagem-reiautoparts.git"
    $result = & git ls-remote $url HEAD 2>&1
    return ($LASTEXITCODE -eq 0)
}

function Write-InstallLog {
    param([string]$Message, [System.Windows.Controls.TextBox]$LogBox)
    $ts = Get-Date -Format 'HH:mm:ss'
    $line = "[$ts] $Message`r`n"
    if ($LogBox) {
        $LogBox.Dispatcher.Invoke([action]{
            $LogBox.AppendText($line)
            $LogBox.ScrollToEnd()
        })
    }
    Write-Host $line -NoNewline
}
