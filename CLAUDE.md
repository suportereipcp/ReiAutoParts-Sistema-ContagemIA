# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos principais

```bash
npm run dev          # inicia com --watch (hot reload)
npm start            # produção
npm test             # node:test nativo, todos os testes em tests/
npm run test:watch   # testes com --watch
npm run fake-keyence # simulador de câmera Keyence (TCP)
npm run ping-keyence # verifica conectividade com câmera real
```

## Arquitetura

**Monólito Node.js 20 (ESM), single-process, edge-first.** Roda no Edge PC Windows; nunca depende de rede para operações críticas.

### Módulos em `src/`

| Módulo | Caminho | Responsabilidade |
|---|---|---|
| Config | `src/config.js` | carrega e valida `.env`; exporta `config` singleton |
| Logger | `src/shared/logger.js` | pino com pretty-print |
| SQLite | `src/db/sqlite.js` | `openDatabase()` + migration runner + `getDb()` singleton |
| Migrations SQLite | `src/db/migrations/*.sql` | aplicadas na ordem alfabética no boot |
| HTTP | `src/http/` | Fastify REST para Monitor 1 (operador) |
| WebSocket Hub | dentro do HTTP | broadcast de `sessao.atualizada`, `contagem.incrementada`, `sync.status` |
| TCP / Camera Manager | `src/camera/` | cliente TCP bidirecional por câmera; reconnect com backoff exp. |
| Domain | `src/domain/` | regras de negócio: abrir sessão, registrar contagem, encerrar |
| Sync Worker | `src/sync/` | máquina de estados ONLINE→OFFLINE→RECOVERY; drena outbox para Supabase |
| Scripts | `scripts/` | utilitários (fake-keyence, ping) |

### Fluxo de dados

```
Câmera IV4 (TCP 8500) → TCP Listener → Camera Manager → Domain
Domain → SQLite (contagem + outbox)
Domain → WebSocket Hub → Monitor 1 / Monitor 2 (TV kiosk)
Sync Worker → Supabase (schema: sistema_contagem) [assíncrono]
Supabase → Sync Worker Reverse Poller (embarques/OPs/operadores a cada 30s)
```

### Invariantes críticos

- **1 sessão ativa por câmera** — garantido por índice parcial único no SQLite e no Supabase.
- **Comando antes de escuta** — câmera só emite pulsos depois de `OE,1`. Pulsos fora desse estado são descartados com `WARN`.
- **Idempotência no sync** — `UNIQUE(origem, id_local)` em `eventos_log`; UUID local como PK em `sessoes_contagem`.
- **Leitura sempre local** — abertura de sessão lê do SQLite, nunca do Supabase.

## Banco de dados

**SQLite local** (`data/contagem.db`) — migrado automaticamente no `getDb()` ao subir.

**Supabase** (PostgreSQL) — schema `sistema_contagem`. Edge PC tem acesso via `service_role`. Operações de escrita permitidas apenas dentro do schema `sistema_contagem`. Não criar functions/triggers/policies sem discussão prévia.

Migration SQL do Supabase em `supabase/migrations/`. **Não rodar via código** — aplicar manualmente ou via CI.

## Protocolo Keyence IV4 (TCP)

Porta padrão `8500`. Comandos enviados pelo Edge PC:

| Comando | Efeito |
|---|---|
| `PW,NNN` | seleciona programa N |
| `OE,1` / `OE,0` | habilita / suspende emissão de pulsos |
| `CTR` | zera contador interno |
| `PNR` | lista programas disponíveis |

Payload de pulso recebido: `"02,0000150,0000500,000\r"` → `toolID=02, count=150`.

## Variáveis de ambiente obrigatórias

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CAMERA_1_IP=
CAMERA_2_IP=
```

Ver `.env.example` para a lista completa. O arquivo `.env` está em `.gitignore` — nunca commitá-lo.

## Testes

Framework: `node:test` nativo (sem Jest/Vitest). Arquivos em `tests/`. Rodar testes individuais:

```bash
node --test tests/nome-do-arquivo.test.js
```

## UI

Frontend em `public/` (HTML/CSS/JS vanilla + Tailwind via CDN). Monitor 1 aponta para `http://localhost:3000`. Monitor 2 (TV) abre em modo kiosk no mesmo host. Sem build step — servido como estático pelo Fastify (`@fastify/static`).
