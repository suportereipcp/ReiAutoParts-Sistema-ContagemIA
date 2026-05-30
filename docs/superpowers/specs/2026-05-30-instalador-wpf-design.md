---
title: Instalador Windows Nativo — Rei AutoParts
date: 2026-05-30
status: approved
---

# Instalador Windows Nativo (PowerShell + WPF)

## Objetivo

Substituir o instalador Inno Setup atual por um instalador com interface visual nativa Windows, usando as imagens da marca Rei AutoParts, que realiza a instalação completa do sistema de contagem automatizada.

## Requisitos

1. Janela nativa Windows (WPF/XAML) com identidade visual da marca
2. Execução obrigatória como administrador
3. Verificação e instalação automática de pré-requisitos (Node.js, Git, Python)
4. Solicitação de token GitHub para clone do repositório privado
5. Configuração de variáveis Supabase
6. Variáveis sensíveis armazenadas como variáveis de ambiente Windows (Machine-level)
7. Distribuição como `.exe` standalone (~3-5MB)

## Arquitetura

```
installer/
├── Install-ReiAutoContagem.ps1    ← entry point
├── lib/
│   ├── UI.xaml                    ← layout WPF completo
│   ├── Steps.ps1                  ← lógica de cada etapa do wizard
│   └── Helpers.ps1                ← funções utilitárias (winget, download, validação)
├── assets/
│   ├── base-rei-autoparts.png     ← banner principal (convertido de .webp)
│   ├── banner-rei-autoparts.png   ← header secundário
│   ├── base-suporterei.png        ← tela de conclusão
│   └── icon.ico                   ← ícone do .exe
└── Build-Exe.ps1                  ← compila em .exe via ps2exe
```

## Identidade Visual

- **Paleta:** Azul escuro/petróleo (#0d2137 → #1a3a5c) como fundo dominante
- **Acentos:** Ciano/turquesa (#00b4d8) para botões e highlights
- **Tipografia:** Segoe UI (nativa Windows) — títulos em Semibold, corpo em Regular
- **Banner principal:** `base-rei-autoparts.webp` — foto aérea da fábrica, ocupa lateral esquerda ou topo
- **Estilo:** Moderno, escuro, industrial — coerente com o dashboard do sistema

## Fluxo do Wizard

### Tela 1 — Boas-vindas + Pré-requisitos

- Imagem `base-rei-autoparts.png` como background/sidebar
- Título: "Sistema de Contagem Automatizada"
- Subtítulo: "Rei AutoParts — Instalador"
- Checklist automático com ícones em tempo real:
  - ✓/✗ Node.js LTS (>= 20)
  - ✓/✗ Git
  - ✓/✗ Python (>= 3.12)
- Se faltar algo: botão "Instalar Pré-requisitos" executa winget/fallback
- Barra de progresso durante instalação de pré-requisitos
- Botão "Próximo" habilitado somente quando tudo ✓

### Tela 2 — Token GitHub

- Campo de texto (PasswordBox, masked) para o token
- Texto explicativo: "Insira um Personal Access Token com permissão de leitura no repositório"
- Link clicável: "Como gerar um token?" → abre browser em github.com/settings/tokens
- Botão "Validar" testa acesso ao repo via `git ls-remote`
- Feedback inline: sucesso (✓ verde) ou erro (✗ vermelho com mensagem)
- Botão "Próximo" habilitado somente após validação

### Tela 3 — Configuração Supabase

- 3 campos de texto:
  - `URL do Supabase` (placeholder: https://xxx.supabase.co)
  - `Anon Key` (PasswordBox)
  - `Service Role Key` (PasswordBox)
- Botão "Testar Conexão" (opcional) — faz GET na URL para validar
- Botão "Próximo" habilitado quando os 3 campos estão preenchidos

### Tela 4 — Instalação + Progresso

- Barra de progresso geral (0-100%)
- Etapas com status individual:
  1. "Clonando repositório..." (git clone)
  2. "Instalando dependências..." (npm install --omit=dev)
  3. "Configurando ambiente..." (variáveis + .env)
  4. "Instalando PM2..." (npm i -g pm2)
  5. "Criando atalhos..." (desktop + menu iniciar)
- TextBox scrollável com log em tempo real (estilo terminal, fundo preto, texto verde)
- Ao concluir com sucesso:
  - Imagem `base-suporterei.png` como celebração
  - Botão "Abrir Sistema" (lança abrir-sistema.bat)
  - Botão "Fechar"
- Em caso de erro: mensagem clara + botão "Tentar Novamente" / "Copiar Log"

## Armazenamento de Variáveis

### Variáveis de Ambiente Windows (Machine-level)

Gravadas via `[System.Environment]::SetEnvironmentVariable($name, $value, 'Machine')`.
Acessíveis apenas por administradores. Node.js herda automaticamente via `process.env`.

| Variável | Origem |
|---|---|
| `GITHUB_TOKEN` | Tela 2 |
| `NEXT_PUBLIC_SUPABASE_URL` | Tela 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tela 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Tela 3 |

### Arquivo `.env` (demais variáveis)

Copiado de `.env.example` com defaults. Contém apenas variáveis operacionais não-sensíveis:
- Câmeras (IP, porta)
- HTTP (host, port)
- Logs (level, path)
- Audit (flush, retry, recovery)
- Labels/Printer
- Sync
- SQLite path

## Decisões Técnicas

1. **Imagens .webp → .png** — WPF não suporta .webp. Conversão feita no build (`Build-Exe.ps1`).
2. **Elevação admin** — Manifest embutido no .exe com `requireAdministrator`.
3. **Clone HTTPS** — `git clone https://{token}@github.com/{org}/{repo}.git`
4. **Destino da instalação** — `C:\ContagemReiAutoParts` (fixo, sem seleção de pasta).
5. **PM2** — Instalado globalmente para gerenciamento de processo.
6. **Atalhos** — Desktop público + Menu Iniciar (todos os usuários).
7. **Compilação** — `ps2exe` gera .exe standalone com ícone customizado.
8. **Compatibilidade** — Windows 10 21H2+ e Windows 11 (.NET Framework 4.8 incluso).

## Validações

- Token GitHub: `git ls-remote` no repo antes de avançar
- Supabase URL: formato HTTPS válido (regex)
- Pré-requisitos: verifica versão mínima (node >= 20, python >= 3.12)
- npm install: retry automático em caso de falha de rede

## Desinstalação

O instalador WPF não registra no Painel de Controle (diferente do Inno Setup).
Opções futuras:
- Script `Uninstall-ReiAutoContagem.ps1` separado
- Ou manter o Inno Setup apenas para registro de desinstalação

## Compatibilidade com Instalador Atual

O instalador Inno Setup existente (`installer/contagem-rei-autoparts.iss`) permanece como backup/legado.
O novo instalador WPF vive em `installer/wpf/` para coexistência.

## Estrutura Final

```
installer/
├── wpf/                              ← NOVO instalador
│   ├── Install-ReiAutoContagem.ps1
│   ├── lib/
│   │   ├── UI.xaml
│   │   ├── Steps.ps1
│   │   └── Helpers.ps1
│   ├── assets/
│   │   ├── base-rei-autoparts.png
│   │   ├── banner-rei-autoparts.png
│   │   ├── base-suporterei.png
│   │   └── icon.ico
│   └── Build-Exe.ps1
├── contagem-rei-autoparts.iss        ← legado (mantido)
├── scripts/                          ← legado (mantido)
└── README.md                         ← atualizar com instruções do novo
```
