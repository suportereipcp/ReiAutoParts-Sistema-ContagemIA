# Instalador WPF Nativo Windows — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um instalador Windows com interface WPF visual (PowerShell + XAML) que instala o sistema Rei AutoParts de forma completa e segura.

**Architecture:** Script PowerShell monolítico com XAML inline para UI WPF. Wizard de 4 telas (pré-requisitos → token GitHub → Supabase → progresso). Variáveis sensíveis em env Machine-level. Compilado em .exe via ps2exe.

**Tech Stack:** PowerShell 5.1+, WPF/XAML (.NET Framework 4.8), ps2exe, winget

---

## File Structure

| File | Responsibility |
|---|---|
| `installer/wpf/Install-ReiAutoContagem.ps1` | Entry point — carrega XAML, orquestra wizard |
| `installer/wpf/lib/UI.xaml` | Layout WPF completo (4 telas como Grid panels) |
| `installer/wpf/lib/Steps.ps1` | Lógica de cada etapa (check prereqs, clone, npm, env) |
| `installer/wpf/lib/Helpers.ps1` | Funções utilitárias (winget, download, validação, log) |
| `installer/wpf/Build-Exe.ps1` | Script de build — converte .webp→.png, compila .exe |
| `installer/wpf/assets/` | Imagens .png convertidas + icon.ico |

---

### Task 1: Helpers.ps1 — Funções Utilitárias

**Files:**
- Create: `installer/wpf/lib/Helpers.ps1`

- [ ] **Step 1: Criar arquivo com funções base**

```powershell
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
    $args = @('install','--id',$PackageId,'-e','--silent',
              '--accept-source-agreements','--accept-package-agreements','--scope','machine')
    & winget @args 2>&1 | Out-Null
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
```

- [ ] **Step 2: Commit**

```bash
git add installer/wpf/lib/Helpers.ps1
git commit -m "feat(installer): add Helpers.ps1 — utility functions"
```

---

### Task 2: Steps.ps1 — Lógica das Etapas do Wizard

**Files:**
- Create: `installer/wpf/lib/Steps.ps1`

- [ ] **Step 1: Criar Steps.ps1 com 5 funções**

Funções:
- `Invoke-CheckPrerequisites` — recebe `$UI` hashtable, verifica Node>=20/Git/Python>=3.12, atualiza TextBlocks com ✓/✗ colorido, habilita/desabilita botões
- `Invoke-InstallPrerequisites` — instala via winget (fallback download), chama Refresh-PathEnv, re-verifica
- `Invoke-ValidateToken` — lê PasswordBox, chama Test-GitHubToken, feedback inline
- `Invoke-ValidateSupabase` — valida 3 campos preenchidos, armazena em $script:vars
- `Invoke-Installation` — sequência: clone(25%) → npm install(50%) → env vars + .env(70%) → PM2(85%) → atalhos(100%)

Detalhes de `Invoke-Installation`:

```powershell
function Invoke-Installation {
    param([hashtable]$UI)
    $appDir = 'C:\ContagemReiAutoParts'
    $logBox = $UI.InstallLog
    $progressBar = $UI.InstallProgress

    # 1) Clone (25%)
    $progressBar.Value = 0
    $UI.InstallStepText.Text = "Clonando repositório..."
    Write-InstallLog "Iniciando clone..." $logBox
    $cloneUrl = "https://${script:GitHubToken}@github.com/EmilioVoltolini/contagem-reiautoparts.git"
    if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
    & git clone $cloneUrl $appDir 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    $progressBar.Value = 25

    # 2) npm install (50%)
    $UI.InstallStepText.Text = "Instalando dependências..."
    Refresh-PathEnv
    Push-Location $appDir
    & npm install --omit=dev --no-audit --no-fund 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    Pop-Location
    $progressBar.Value = 50

    # 3) Env vars Machine + .env (70%)
    $UI.InstallStepText.Text = "Configurando ambiente..."
    Set-MachineEnvVar 'GITHUB_TOKEN' $script:GitHubToken
    Set-MachineEnvVar 'NEXT_PUBLIC_SUPABASE_URL' $script:SupabaseUrl
    Set-MachineEnvVar 'NEXT_PUBLIC_SUPABASE_ANON_KEY' $script:SupabaseAnonKey
    Set-MachineEnvVar 'SUPABASE_SERVICE_ROLE_KEY' $script:SupabaseServiceKey

    $envExample = Join-Path $appDir '.env.example'
    $envFile = Join-Path $appDir '.env'
    if (Test-Path $envExample) {
        $content = Get-Content $envExample | Where-Object {
            $_ -notmatch '^(GITHUB_TOKEN|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)='
        }
        $content | Set-Content $envFile -Encoding UTF8
    }
    $progressBar.Value = 70

    # 4) PM2 (85%)
    $UI.InstallStepText.Text = "Instalando PM2..."
    & npm install -g pm2 2>&1 | ForEach-Object { Write-InstallLog $_ $logBox }
    $progressBar.Value = 85

    # 5) Atalhos (100%)
    $UI.InstallStepText.Text = "Criando atalhos..."
    $shell = New-Object -ComObject WScript.Shell
    $desktopPath = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $lnk = $shell.CreateShortcut("$desktopPath\Sistema de Contagem.lnk")
    $lnk.TargetPath = Join-Path $appDir 'abrir-sistema.bat'
    $lnk.WorkingDirectory = $appDir
    $lnk.IconLocation = Join-Path $appDir 'public\favicon.ico'
    $lnk.Save()

    $startMenu = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
    $lnk2 = $shell.CreateShortcut("$startMenu\Sistema de Contagem Rei AutoParts.lnk")
    $lnk2.TargetPath = Join-Path $appDir 'abrir-sistema.bat'
    $lnk2.WorkingDirectory = $appDir
    $lnk2.IconLocation = Join-Path $appDir 'public\favicon.ico'
    $lnk2.Save()

    $progressBar.Value = 100
    $UI.InstallStepText.Text = "Instalação concluída!"
    Write-InstallLog "=== Instalação concluída ===" $logBox
    $UI.PanelProgress.Visibility = 'Collapsed'
    $UI.PanelDone.Visibility = 'Visible'
}
```

- [ ] **Step 2: Commit**

```bash
git add installer/wpf/lib/Steps.ps1
git commit -m "feat(installer): add Steps.ps1 — wizard step logic"
```

---

### Task 3: UI.xaml — Layout WPF Completo

**Files:**
- Create: `installer/wpf/lib/UI.xaml`

- [ ] **Step 1: Criar XAML com Window + 4 painéis (Grid)**

Estrutura do XAML:
- `<Window>` 800x550, sem resize, fundo #0d2137, título "Rei AutoParts — Instalador"
- Sidebar esquerda (250px): imagem `base-rei-autoparts.png` stretch vertical
- Área direita: 4 `<Grid>` empilhados (Visibility Collapsed/Visible para navegar)

Painéis:
1. `PanelPrereqs` — título, 3 TextBlocks de status, botão "Instalar Pré-requisitos", ProgressBar, botão "Próximo"
2. `PanelToken` — título, PasswordBox, botão "Validar", TextBlock feedback, link "Como gerar?", botão "Próximo"
3. `PanelSupabase` — título, 3 campos (TextBox URL + 2 PasswordBox), botão "Próximo"
4. `PanelInstall` — título, TextBlock etapa atual, ProgressBar, TextBox log (fundo preto, texto verde, readonly), sub-painel `PanelDone` com botões "Abrir Sistema" / "Fechar"

Estilo global:
- FontFamily: Segoe UI
- Foreground padrão: #e2e8f0 (slate-200)
- Botões: Background #0891b2 (cyan-600), hover #06b6d4, Foreground white, BorderRadius 4
- PasswordBox/TextBox: Background #1e293b, Foreground #f8fafc, Border #334155

```xml
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Rei AutoParts — Instalador"
        Width="800" Height="550"
        ResizeMode="NoResize"
        WindowStartupLocation="CenterScreen"
        Background="#0d2137">

  <Window.Resources>
    <Style TargetType="Button" x:Key="BtnPrimary">
      <Setter Property="Background" Value="#0891b2"/>
      <Setter Property="Foreground" Value="White"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Padding" Value="20,10"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Style.Triggers>
        <Trigger Property="IsMouseOver" Value="True">
          <Setter Property="Background" Value="#06b6d4"/>
        </Trigger>
        <Trigger Property="IsEnabled" Value="False">
          <Setter Property="Background" Value="#334155"/>
          <Setter Property="Foreground" Value="#64748b"/>
        </Trigger>
      </Style.Triggers>
    </Style>
    <Style TargetType="TextBlock" x:Key="Title">
      <Setter Property="FontSize" Value="22"/>
      <Setter Property="FontWeight" Value="Bold"/>
      <Setter Property="Foreground" Value="#f8fafc"/>
      <Setter Property="Margin" Value="0,0,0,8"/>
    </Style>
    <Style TargetType="TextBlock" x:Key="Subtitle">
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="Foreground" Value="#94a3b8"/>
      <Setter Property="Margin" Value="0,0,0,20"/>
    </Style>
  </Window.Resources>

  <Grid>
    <Grid.ColumnDefinitions>
      <ColumnDefinition Width="250"/>
      <ColumnDefinition Width="*"/>
    </Grid.ColumnDefinitions>

    <!-- Sidebar com imagem -->
    <Border Grid.Column="0" Background="#0a1929">
      <Image x:Name="SidebarImage" Stretch="UniformToFill" VerticalAlignment="Stretch"/>
    </Border>

    <!-- Área de conteúdo -->
    <Grid Grid.Column="1" Margin="32,28">
      <!-- Tela 1: Pré-requisitos -->
      <Grid x:Name="PanelPrereqs" Visibility="Visible">
        <!-- conteúdo detalhado no Step 2 -->
      </Grid>
      <!-- Tela 2: Token -->
      <Grid x:Name="PanelToken" Visibility="Collapsed">
      </Grid>
      <!-- Tela 3: Supabase -->
      <Grid x:Name="PanelSupabase" Visibility="Collapsed">
      </Grid>
      <!-- Tela 4: Instalação -->
      <Grid x:Name="PanelInstall" Visibility="Collapsed">
      </Grid>
    </Grid>
  </Grid>
</Window>
```

- [ ] **Step 2: Preencher conteúdo de cada painel**

Detalhar os 4 painéis com todos os controles nomeados (x:Name) que Steps.ps1 referencia:
- `NodeStatus`, `GitStatus`, `PythonStatus`
- `BtnInstallPrereqs`, `PrereqProgress`, `PrereqProgressText`, `BtnNext1`
- `TokenInput`, `BtnValidateToken`, `TokenFeedback`, `BtnNext2`
- `SupabaseUrl`, `SupabaseAnon`, `SupabaseService`, `BtnNext3`
- `InstallStepText`, `InstallProgress`, `InstallLog`
- `PanelProgress`, `PanelDone`, `BtnOpenSystem`, `BtnClose`

- [ ] **Step 3: Commit**

```bash
git add installer/wpf/lib/UI.xaml
git commit -m "feat(installer): add UI.xaml — WPF layout with 4 wizard panels"
```

---

### Task 4: Install-ReiAutoContagem.ps1 — Entry Point

**Files:**
- Create: `installer/wpf/Install-ReiAutoContagem.ps1`

- [ ] **Step 1: Criar script principal que orquestra tudo**

```powershell
#Requires -Version 5.1
# installer/wpf/Install-ReiAutoContagem.ps1
# Entry point do instalador Rei AutoParts (WPF)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Verificar admin
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Carregar módulos
. (Join-Path $scriptDir 'lib\Helpers.ps1')
. (Join-Path $scriptDir 'lib\Steps.ps1')

if (-not (Test-IsAdmin)) {
    [System.Windows.MessageBox]::Show(
        "Este instalador precisa ser executado como Administrador.`nClique com botão direito → Executar como administrador.",
        "Rei AutoParts — Permissão Necessária",
        'OK', 'Warning'
    )
    exit 1
}

# Carregar XAML
$xamlPath = Join-Path $scriptDir 'lib\UI.xaml'
$xamlContent = Get-Content $xamlPath -Raw
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader]::new($xamlContent))
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Mapear controles para hashtable
$UI = @{}
$controlNames = @(
    'SidebarImage',
    'PanelPrereqs','NodeStatus','GitStatus','PythonStatus',
    'BtnInstallPrereqs','PrereqProgress','PrereqProgressText','BtnNext1',
    'PanelToken','TokenInput','BtnValidateToken','TokenFeedback','BtnNext2',
    'PanelSupabase','SupabaseUrl','SupabaseAnon','SupabaseService','BtnNext3',
    'PanelInstall','InstallStepText','InstallProgress','InstallLog',
    'PanelProgress','PanelDone','BtnOpenSystem','BtnClose'
)
foreach ($name in $controlNames) {
    $UI[$name] = $window.FindName($name)
}

# Carregar imagem sidebar
$imgPath = Join-Path $scriptDir 'assets\base-rei-autoparts.png'
if (Test-Path $imgPath) {
    $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
    $bitmap.BeginInit()
    $bitmap.UriSource = [Uri]::new($imgPath)
    $bitmap.EndInit()
    $UI.SidebarImage.Source = $bitmap
}

# Script-scope vars para dados entre telas
$script:GitHubToken = ''
$script:SupabaseUrl = ''
$script:SupabaseAnonKey = ''
$script:SupabaseServiceKey = ''

# --- Event Handlers ---

# Tela 1: check on load
$window.Add_Loaded({ Invoke-CheckPrerequisites -UI $UI })

$UI.BtnInstallPrereqs.Add_Click({
    $results = Invoke-CheckPrerequisites -UI $UI
    $missing = @{ Node = -not $results.Node; Git = -not $results.Git; Python = -not $results.Python }
    Invoke-InstallPrerequisites -UI $UI -Missing $missing
})

$UI.BtnNext1.Add_Click({
    $UI.PanelPrereqs.Visibility = 'Collapsed'
    $UI.PanelToken.Visibility = 'Visible'
})

# Tela 2: token
$UI.BtnValidateToken.Add_Click({ Invoke-ValidateToken -UI $UI })

$UI.BtnNext2.Add_Click({
    $UI.PanelToken.Visibility = 'Collapsed'
    $UI.PanelSupabase.Visibility = 'Visible'
})

# Tela 3: supabase
$UI.SupabaseUrl.Add_TextChanged({ Invoke-ValidateSupabase -UI $UI })
$UI.SupabaseAnon.Add_PasswordChanged({ Invoke-ValidateSupabase -UI $UI })
$UI.SupabaseService.Add_PasswordChanged({ Invoke-ValidateSupabase -UI $UI })

$UI.BtnNext3.Add_Click({
    $UI.PanelSupabase.Visibility = 'Collapsed'
    $UI.PanelInstall.Visibility = 'Visible'
    Invoke-Installation -UI $UI
})

# Tela 4: botões finais
$UI.BtnOpenSystem.Add_Click({
    Start-Process (Join-Path 'C:\ContagemReiAutoParts' 'abrir-sistema.bat')
    $window.Close()
})

$UI.BtnClose.Add_Click({ $window.Close() })

# Mostrar janela
$window.ShowDialog() | Out-Null
```

- [ ] **Step 2: Commit**

```bash
git add installer/wpf/Install-ReiAutoContagem.ps1
git commit -m "feat(installer): add Install-ReiAutoContagem.ps1 — WPF entry point"
```

---

### Task 5: Build-Exe.ps1 — Script de Build

**Files:**
- Create: `installer/wpf/Build-Exe.ps1`

- [ ] **Step 1: Criar script de build**

```powershell
# installer/wpf/Build-Exe.ps1
# Converte imagens .webp → .png e compila o instalador em .exe

param(
    [string]$OutputDir = (Join-Path $PSScriptRoot 'Output')
)

$ErrorActionPreference = 'Stop'
$assetsDir = Join-Path $PSScriptRoot 'assets'

Write-Host "=== Build do Instalador Rei AutoParts ===" -ForegroundColor Cyan

# 1) Converter .webp → .png (requer Python + Pillow)
Write-Host "[1/3] Convertendo imagens .webp para .png..."
$publicDir = Join-Path $PSScriptRoot '..\..\public'
$webpFiles = @(
    @{ src = 'base-rei-autoparts.webp'; dst = 'base-rei-autoparts.png' },
    @{ src = 'banner-rei-autoparts.webp'; dst = 'banner-rei-autoparts.png' },
    @{ src = 'base-suporterei.webp'; dst = 'base-suporterei.png' }
)

# Instalar Pillow se necessário
& python -m pip install Pillow --quiet 2>&1 | Out-Null

foreach ($img in $webpFiles) {
    $srcPath = Join-Path $publicDir $img.src
    $dstPath = Join-Path $assetsDir $img.dst
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Imagem não encontrada: $srcPath"
        continue
    }
    $pyScript = "from PIL import Image; Image.open(r'$srcPath').save(r'$dstPath')"
    & python -c $pyScript
    Write-Host "  ✓ $($img.src) → $($img.dst)"
}

# 2) Verificar/instalar ps2exe
Write-Host "[2/3] Verificando ps2exe..."
if (-not (Get-Module -ListAvailable -Name ps2exe)) {
    Write-Host "  Instalando ps2exe..."
    Install-Module ps2exe -Force -Scope CurrentUser
}

# 3) Compilar .exe
Write-Host "[3/3] Compilando .exe..."
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

$mainScript = Join-Path $PSScriptRoot 'Install-ReiAutoContagem.ps1'
$outputExe = Join-Path $OutputDir 'ReiAutoContagem-Installer.exe'
$iconPath = Join-Path $assetsDir 'icon.ico'

$ps2exeParams = @{
    InputFile  = $mainScript
    OutputFile = $outputExe
    NoConsole  = $true
    RequireAdmin = $true
    Title      = 'Rei AutoParts - Instalador'
    Company    = 'Rei AutoParts'
    Version    = '1.0.0'
    Copyright  = 'Rei AutoParts 2026'
}

if (Test-Path $iconPath) {
    $ps2exeParams.IconFile = $iconPath
}

Invoke-ps2exe @ps2exeParams

Write-Host ""
Write-Host "=== Build concluído ===" -ForegroundColor Green
Write-Host "Saída: $outputExe"
Write-Host "Tamanho: $([math]::Round((Get-Item $outputExe).Length / 1MB, 1)) MB"
```

- [ ] **Step 2: Commit**

```bash
git add installer/wpf/Build-Exe.ps1
git commit -m "feat(installer): add Build-Exe.ps1 — compile to .exe"
```

---

### Task 6: Assets — Converter Imagens e Criar icon.ico

**Files:**
- Create: `installer/wpf/assets/.gitkeep`

- [ ] **Step 1: Criar .gitkeep para manter a pasta no git**

```bash
touch installer/wpf/assets/.gitkeep
```

- [ ] **Step 2: Documentar que as imagens .png são geradas pelo Build-Exe.ps1**

Adicionar ao README que `Build-Exe.ps1` converte automaticamente as imagens de `public/*.webp` para `installer/wpf/assets/*.png`.

- [ ] **Step 3: Commit**

```bash
git add installer/wpf/assets/.gitkeep
git commit -m "feat(installer): add assets dir placeholder"
```

---

### Task 7: Atualizar README do Instalador

**Files:**
- Modify: `installer/README.md`

- [ ] **Step 1: Adicionar seção sobre o novo instalador WPF**

Adicionar ao final do README existente:

```markdown
---

## Instalador WPF (novo)

Instalador com interface visual nativa Windows. Localizado em `installer/wpf/`.

### Como gerar o .exe

Pré-requisitos na máquina de build:
- Python 3.12+ com Pillow (`pip install Pillow`)
- Módulo ps2exe (`Install-Module ps2exe -Force`)

```powershell
cd installer\wpf
.\Build-Exe.ps1
```

Saída: `installer/wpf/Output/ReiAutoContagem-Installer.exe` (~3-5 MB).

### Como instalar no Edge PC

1. Copie `ReiAutoContagem-Installer.exe` para o Edge PC.
2. Botão direito → **Executar como administrador**.
3. Siga o wizard (4 telas):
   - Verificação de pré-requisitos (Node.js, Git, Python)
   - Token GitHub (para clone e atualizações futuras)
   - Credenciais Supabase (URL, Anon Key, Service Role Key)
   - Instalação automática com progresso
4. Ao concluir, clique "Abrir Sistema" ou configure câmeras pelo dashboard.

### Variáveis sensíveis

As 4 variáveis críticas ficam em **variáveis de ambiente Windows (Machine-level)**:
- `GITHUB_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Não aparecem no `.env` nem são visíveis para usuários não-admin.
```

- [ ] **Step 2: Commit**

```bash
git add installer/README.md
git commit -m "docs: add WPF installer section to README"
```

---

### Task 8: Teste Manual — Validar Execução

- [ ] **Step 1: Executar o instalador em modo dev (sem compilar)**

```powershell
cd installer\wpf
powershell -ExecutionPolicy Bypass -File Install-ReiAutoContagem.ps1
```

Verificar:
- Janela abre com sidebar e imagem
- Tela 1 mostra status dos pré-requisitos
- Navegação entre telas funciona
- Campos de input aceitam texto

- [ ] **Step 2: Testar build do .exe**

```powershell
cd installer\wpf
.\Build-Exe.ps1
```

Verificar:
- Imagens convertidas em `assets/`
- `.exe` gerado em `Output/`
- `.exe` abre e exige admin

---

## Resumo de Commits

1. `feat(installer): add Helpers.ps1 — utility functions`
2. `feat(installer): add Steps.ps1 — wizard step logic`
3. `feat(installer): add UI.xaml — WPF layout with 4 wizard panels`
4. `feat(installer): add Install-ReiAutoContagem.ps1 — WPF entry point`
5. `feat(installer): add Build-Exe.ps1 — compile to .exe`
6. `feat(installer): add assets dir placeholder`
7. `docs: add WPF installer section to README`
