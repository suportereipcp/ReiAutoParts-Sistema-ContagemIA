# Instalador WPF — Rei AutoParts

## Visão Geral

Instalador nativo Windows com interface visual (PowerShell + WPF/XAML) para o Sistema de Contagem Automatizada. Substitui a instalação manual por um wizard guiado de 4 etapas.

## Estrutura de Arquivos

```
installer/wpf/
├── Install-ReiAutoContagem.ps1   ← Entry point (executa o wizard)
├── Build-Exe.ps1                 ← Gera o .exe distribuível
├── lib/
│   ├── UI.xaml                   ← Layout visual (WPF/XAML)
│   ├── Steps.ps1                 ← Lógica de cada etapa
│   └── Helpers.ps1               ← Funções utilitárias
├── assets/                       ← Imagens .png (geradas pelo build)
└── Output/                       ← .exe compilado (gitignored)
```

## Fluxo do Wizard

### Tela 1 — Verificação de Pré-requisitos
- Verifica Node.js >= 20, Git, Python >= 3.12
- Instala automaticamente via winget (fallback: download direto)
- Só avança quando tudo estiver instalado

### Tela 2 — Token GitHub
- Campo masked para Personal Access Token
- Valida acesso ao repositório via `git ls-remote`
- Token fica persistido para atualizações futuras

### Tela 3 — Configuração Supabase
- URL do Supabase
- Anon Key
- Service Role Key
- Campos obrigatórios para avançar

### Tela 4 — Instalação
- Clone do repositório (25%)
- npm install --omit=dev (50%)
- Configuração de variáveis de ambiente (70%)
- Instalação do PM2 (85%)
- Criação de atalhos (100%)
- Log em tempo real estilo terminal

## Segurança — Variáveis de Ambiente

As 4 variáveis sensíveis são armazenadas como **variáveis de ambiente Windows (Machine-level)**:

| Variável | Descrição |
|---|---|
| `GITHUB_TOKEN` | Token para clone e atualizações |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) |

**Vantagens:**
- Não ficam no `.env` (arquivo de texto acessível)
- Só editáveis por administradores
- Não aparecem via `set` para usuários comuns
- Node.js herda automaticamente via `process.env`

## Como Gerar o .exe

### Pré-requisitos (máquina de build)
- Python 3.12+ com Pillow (`pip install Pillow`)
- Módulo ps2exe (`Install-Module ps2exe -Force`)

### Comando
```powershell
cd installer\wpf
.\Build-Exe.ps1
```

Saída: `installer/wpf/Output/ReiAutoContagem-Installer.exe` (~3-5 MB)

## Como Instalar no Edge PC

1. Copiar `ReiAutoContagem-Installer.exe` para o Edge PC
2. Botão direito → **Executar como administrador**
3. Seguir o wizard (4 telas)
4. Ao concluir: "Abrir Sistema" ou configurar câmeras pelo dashboard

## Quando Regerar o .exe

O `.exe` só precisa ser regerado quando há mudanças no **processo de instalação**:
- Alterações em `UI.xaml` (layout)
- Alterações em `Steps.ps1` (lógica)
- Alterações em `Helpers.ps1` (utilitários)
- Alterações em `Install-ReiAutoContagem.ps1` (orquestração)

**Não precisa regerar** quando muda o código do sistema (app, rotas, frontend) — o instalador faz `git clone` e sempre puxa a versão mais recente.

> Um hook automático (`PostCommit`) detecta mudanças em `installer/wpf/**/*.{ps1,xaml}` e roda o build automaticamente.

## Identidade Visual

- **Paleta:** Azul escuro (#0d2137) + ciano (#0891b2)
- **Sidebar:** Imagem `base-rei-autoparts.webp` (fábrica aérea)
- **Tipografia:** Segoe UI (nativa Windows)
- **Log terminal:** Consolas, fundo preto, texto verde

## Tecnologias

- PowerShell 5.1+ (nativo Windows 10/11)
- WPF/XAML (.NET Framework 4.8, incluso no Windows)
- ps2exe (compilação para .exe standalone)
- winget (gerenciador de pacotes Windows)
