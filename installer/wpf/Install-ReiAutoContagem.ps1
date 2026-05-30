#Requires -Version 5.1
# installer/wpf/Install-ReiAutoContagem.ps1
# Entry point do instalador Rei AutoParts (WPF)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Carregar assemblies WPF
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Carregar modulos
. (Join-Path $scriptDir 'lib\Helpers.ps1')
. (Join-Path $scriptDir 'lib\Steps.ps1')

# Verificar admin
if (-not (Test-IsAdmin)) {
    [System.Windows.MessageBox]::Show(
        "Este instalador precisa ser executado como Administrador.`nClique com botao direito > Executar como administrador.",
        "Rei AutoParts - Permissao Necessaria",
        'OK', 'Warning'
    )
    exit 1
}

# Carregar XAML
$xamlPath = Join-Path $scriptDir 'lib\UI.xaml'
$xamlContent = Get-Content $xamlPath -Raw
# Remover atributos x:Class se existirem (incompativel com XamlReader)
$xamlContent = $xamlContent -replace 'x:Class="[^"]*"', ''
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
    $bitmap.UriSource = [Uri]::new((Resolve-Path $imgPath).Path)
    $bitmap.EndInit()
    $UI.SidebarImage.Source = $bitmap
}

# Script-scope vars para dados entre telas
$script:GitHubToken = ''
$script:SupabaseUrl = ''
$script:SupabaseAnonKey = ''
$script:SupabaseServiceKey = ''

# --- Event Handlers ---

# Tela 1: verificar prereqs ao carregar
$window.Add_Loaded({ Invoke-CheckPrerequisites -UI $UI })

$UI.BtnInstallPrereqs.Add_Click({
    $results = Invoke-CheckPrerequisites -UI $UI
    $missing = @{
        Node   = -not $results.Node
        Git    = -not $results.Git
        Python = -not $results.Python
    }
    Invoke-InstallPrerequisites -UI $UI -Missing $missing
})

$UI.BtnNext1.Add_Click({
    $UI.PanelPrereqs.Visibility = 'Collapsed'
    $UI.PanelToken.Visibility = 'Visible'
})

# Tela 2: token GitHub
$UI.BtnValidateToken.Add_Click({ Invoke-ValidateToken -UI $UI })

$UI.BtnNext2.Add_Click({
    $UI.PanelToken.Visibility = 'Collapsed'
    $UI.PanelSupabase.Visibility = 'Visible'
})

# Tela 3: Supabase
$UI.SupabaseUrl.Add_TextChanged({ Invoke-ValidateSupabase -UI $UI })
$UI.SupabaseAnon.Add_PasswordChanged({ Invoke-ValidateSupabase -UI $UI })
$UI.SupabaseService.Add_PasswordChanged({ Invoke-ValidateSupabase -UI $UI })

$UI.BtnNext3.Add_Click({
    $UI.PanelSupabase.Visibility = 'Collapsed'
    $UI.PanelInstall.Visibility = 'Visible'
    Invoke-Installation -UI $UI
})

# Tela 4: botoes finais
$UI.BtnOpenSystem.Add_Click({
    Start-Process (Join-Path 'C:\ContagemReiAutoParts' 'abrir-sistema.bat')
    $window.Close()
})

$UI.BtnClose.Add_Click({ $window.Close() })

# Mostrar janela
$window.ShowDialog() | Out-Null
