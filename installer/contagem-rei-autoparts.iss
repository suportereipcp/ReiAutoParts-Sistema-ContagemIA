; ============================================================================
;  Sistema de Contagem - Rei AutoParts
;  Instalador Windows (Inno Setup 6+)
;  Compile com: ISCC.exe contagem-rei-autoparts.iss
;  Saida:       Output\ContagemReiAutoParts-Setup.exe
; ============================================================================

#define AppName       "Sistema de Contagem Rei AutoParts"
#define AppShort      "ContagemReiAutoParts"
#define AppVersion    "1.0.0"
#define AppPublisher  "Rei AutoParts"
#define AppExeStart   "abrir-sistema.bat"

[Setup]
AppId={{A1F8F3D2-7E4B-4F3E-9C2A-CONTAGEMREIAP}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName=C:\{#AppShort}
DefaultGroupName={#AppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
OutputDir=Output
OutputBaseFilename=ContagemReiAutoParts-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#AppExeStart}
LicenseFile=
SetupLogging=yes
; Instalacao all-users (visivel para qualquer login Windows na maquina)
UsedUserAreasWarning=no

[Languages]
Name: "brazilian"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho (todos os usuarios)"; GroupDescription: "Atalhos:"; Flags: checkedonce
Name: "startmenu";   Description: "Criar atalho no menu Iniciar"; GroupDescription: "Atalhos:"; Flags: checkedonce

[Files]
; Aplicacao (raiz do projeto, exceto pastas pesadas que serao reconstruidas)
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "node_modules\*,logs\*,data\*,.git\*,installer\Output\*,installer\*.iss,*.log"
; Scripts auxiliares do instalador
Source: "scripts\install-prereqs.ps1"; DestDir: "{app}\installer\scripts"; Flags: ignoreversion
Source: "scripts\postinstall.ps1";     DestDir: "{app}\installer\scripts"; Flags: ignoreversion

[Dirs]
Name: "{app}\data";            Permissions: users-modify
Name: "{app}\logs";            Permissions: users-modify
Name: "{commonappdata}\{#AppShort}"

[Icons]
; Atalhos all-users (Public)
Name: "{commondesktop}\Sistema de Contagem"; Filename: "{app}\{#AppExeStart}"; \
  WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"; \
  Comment: "Iniciar Sistema de Contagem Rei AutoParts"; Tasks: desktopicon
Name: "{commonprograms}\{#AppName}"; Filename: "{app}\{#AppExeStart}"; \
  WorkingDir: "{app}"; IconFilename: "{app}\public\favicon.ico"; Tasks: startmenu
Name: "{commonprograms}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Run]
; 1) Instalar pre-requisitos (Node.js LTS, Git, Python) via winget
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\scripts\install-prereqs.ps1"""; \
  StatusMsg: "Instalando pre-requisitos (Node.js, Git, Python)..."; \
  Flags: runhidden waituntilterminated
; 2) Pos-instalacao: npm install + migrate db
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\scripts\postinstall.ps1"" -AppDir ""{app}"""; \
  StatusMsg: "Instalando dependencias do sistema (npm install)..."; \
  Flags: runhidden waituntilterminated
; 3) Oferecer abrir o sistema ao final
Filename: "{app}\{#AppExeStart}"; \
  Description: "Abrir Sistema de Contagem agora"; \
  Flags: postinstall nowait skipifsilent unchecked

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\logs"
; Mantem {app}\data (banco SQLite com historico) intencionalmente
