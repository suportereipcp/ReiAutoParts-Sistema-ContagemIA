# ============================================================================
#  Instala Node.js LTS, Git e Python via winget (Windows 10+/11).
#  Fallback: download direto dos instaladores oficiais.
#  Executado pelo Inno Setup com privilegios de administrador.
# ============================================================================

$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'

function Write-Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

function Test-Cmd($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-WithWinget($id, $friendlyName) {
  Write-Log "Instalando $friendlyName via winget ($id)..."
  $args = @('install','--id',$id,'-e','--silent','--accept-source-agreements','--accept-package-agreements','--scope','machine')
  & winget @args 2>&1 | Out-Host
  return ($LASTEXITCODE -eq 0)
}

function Download-And-Run($url, $args) {
  $tmp = Join-Path $env:TEMP ("prereq-" + [Guid]::NewGuid().ToString('N') + [System.IO.Path]::GetExtension($url))
  Write-Log "Baixando $url..."
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
  Write-Log "Executando instalador silencioso..."
  $p = Start-Process -FilePath $tmp -ArgumentList $args -Wait -PassThru
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  return $p.ExitCode
}

# ----- winget disponivel? ----------------------------------------------------
$hasWinget = Test-Cmd 'winget'
if (-not $hasWinget) {
  Write-Log "winget nao encontrado. Usando download direto (fallback)."
}

# ----- Node.js LTS -----------------------------------------------------------
if (Test-Cmd 'node') {
  Write-Log "Node.js ja instalado: $(node --version)"
} elseif ($hasWinget) {
  Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' | Out-Null
} else {
  Download-And-Run 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' '/quiet /norestart' | Out-Null
}

# ----- Git -------------------------------------------------------------------
if (Test-Cmd 'git') {
  Write-Log "Git ja instalado: $(git --version)"
} elseif ($hasWinget) {
  Install-WithWinget 'Git.Git' 'Git' | Out-Null
} else {
  Download-And-Run 'https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/Git-2.45.2-64-bit.exe' '/VERYSILENT /NORESTART /NOCANCEL /SP-' | Out-Null
}

# ----- Python ----------------------------------------------------------------
if (Test-Cmd 'python') {
  Write-Log "Python ja instalado: $(python --version 2>&1)"
} elseif ($hasWinget) {
  Install-WithWinget 'Python.Python.3.12' 'Python 3.12' | Out-Null
} else {
  Download-And-Run 'https://www.python.org/ftp/python/3.12.5/python-3.12.5-amd64.exe' '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0' | Out-Null
}

# ----- Atualizar PATH na sessao atual ---------------------------------------
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

Write-Log "Pre-requisitos verificados. Versoes finais:"
foreach ($c in @('node','npm','git','python')) {
  if (Test-Cmd $c) { Write-Log ("  {0,-8} {1}" -f $c, ((& $c --version) -join ' ')) }
  else             { Write-Log ("  {0,-8} NAO INSTALADO" -f $c) }
}

exit 0
