# Instalador Windows — Sistema de Contagem Rei AutoParts

Gera um único `.exe` que:
1. Instala Node.js LTS, Git e Python (via `winget`, fallback download direto).
2. Copia o sistema para `C:\ContagemReiAutoParts` (visível para todos os usuários da máquina).
3. Roda `npm install --omit=dev` e instala PM2 global.
4. Cria atalhos "Sistema de Contagem" na área de trabalho pública e no menu Iniciar.
5. Cria `.env` a partir de `.env.example` (operador edita IPs/credenciais).

## Como gerar o `.exe`

Pré-requisito **única vez** na máquina de build:

```cmd
winget install JRSoftware.InnoSetup
```

Depois, na raiz do projeto:

```cmd
cd installer
build-installer.bat
```

Saída: `installer\Output\ContagemReiAutoParts-Setup.exe` (~50 MB com `node_modules` excluído).

## Como instalar no Edge PC

1. Copie `ContagemReiAutoParts-Setup.exe` para o Edge PC.
2. Botão direito → **Executar como administrador**.
3. Aceite os tasks (atalhos).
4. Aguarde (~2–5 min — depende do download de Node/Git/Python).
5. Edite `C:\ContagemReiAutoParts\.env` com IPs das câmeras e credenciais Supabase.
6. Duplo-clique em **Sistema de Contagem** na área de trabalho.

## O que fica disponível para todos os usuários

- App em `C:\ContagemReiAutoParts\` (acesso de leitura para `Users`, escrita em `data/` e `logs/`).
- Atalho na **área de trabalho pública** (`%PUBLIC%\Desktop`).
- Atalho no **menu Iniciar comum** (`%ProgramData%\Microsoft\Windows\Start Menu\Programs`).
- Node.js, Git, Python instalados em escopo de máquina (`--scope machine`).

## Desinstalação

Painel de Controle → Programas → "Sistema de Contagem Rei AutoParts" → Desinstalar.
O banco SQLite (`data\contagem.db`) é **preservado** intencionalmente.
