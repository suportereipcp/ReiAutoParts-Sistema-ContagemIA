# Sistema de Contagem Rei AutoParts — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o sistema edge-first de contagem automatizada de peças com 2 câmeras Keyence IV4, SQLite local, sync bidirecional com Supabase, e UIs em 2 monitores (operador + TV kiosk).

**Architecture:** Monólito Node.js (Fastify) single-process rodando no Edge PC Windows. 7 módulos (HTTP, WS, TCP Keyence, Camera Manager, Domain, SQLite, Sync Worker). Sync tem Outbox Pusher (local→cloud) + Reverse Sync Poller (cloud→local). Contagem 100% offline-resilient.

**Tech Stack:** Node.js 20 LTS, Fastify, @fastify/websocket, better-sqlite3, @supabase/supabase-js, pino, pdfkit, exceljs, Tailwind via CDN, vanilla JS, pm2. Testes com `node:test` nativo.

**Referências:**
- Spec: `docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md`
- Arquitetura + diagramas: `ARQUITETURA.md`
- Keyence: memórias `reference_keyence_iv4_protocolo.md` + `project_camera_keyence_fluxo.md`
- Supabase access: memória `feedback_supabase_readonly.md`

---

## Fase 0 — Scaffolding do projeto

### Task 1: Inicializar repositório git (remote já existe) e estrutura base

**Contexto:** o repositório GitHub **já está criado** como privado em
`https://github.com/suportereipcp/ReiAutoParts-Sistema-ContagemIA.git`.
Colaborador `EmilioVoltolini07` (`emilio.voltolini0730@gmail.com`) já tem acesso de push.
Token pessoal (PAT) está em `GITHUB_TOKEN` no `.env`.

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `README.md`
- Create diretórios: `src/`, `src/db/migrations/`, `src/db/queries/`, `src/domain/`, `src/camera/`, `src/sync/`, `src/http/routes/`, `src/shared/`, `scripts/`, `tests/`, `data/`, `logs/`, `public/`

- [ ] **Step 1: Inicializar git local e configurar identidade**

```bash
cd "C:/Sistema de Contagem Rei AutoParts"
git init -b main
git config user.name "EmilioVoltolini07"
git config user.email "emilio.voltolini0730@gmail.com"
```

Expected: `Initialized empty Git repository in ...`

- [ ] **Step 1.1: Adicionar remote do repositório existente**

```bash
git remote add origin https://github.com/suportereipcp/ReiAutoParts-Sistema-ContagemIA.git
git remote -v
```

Expected: origin aparece para fetch e push.

- [ ] **Step 1.2: Validar que `.env` NÃO será commitado antes de qualquer add**

O `.env` contém o `GITHUB_TOKEN` e as service_role keys do Supabase. Ele **precisa** estar listado em `.gitignore` antes do primeiro `git add`. O `.gitignore` é criado no Step 2 abaixo antes do add final.

- [ ] **Step 2: Criar .gitignore**

**Crítico:** `.env` contém `GITHUB_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY`. Precisa estar ignorado antes do primeiro `git add`.

```
# segredos
.env
.env.local
.env.*.local

# build / runtime
node_modules/
data/*.db
data/*.db-journal
logs/*.log
dist/
coverage/
*.tmp

# OS
.DS_Store
Thumbs.db
```

Criar também `.env.example` (vai para o repo) listando as chaves sem valores:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_TOKEN=
CAMERA_1_IP=
CAMERA_1_PORTA=8500
CAMERA_2_IP=
CAMERA_2_PORTA=8500
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
LOG_LEVEL=info
```

- [ ] **Step 3: Criar package.json**

```json
{
  "name": "sistema-contagem-rei-autoparts",
  "version": "0.1.0",
  "description": "Sistema edge-first de contagem automatizada Rei AutoParts",
  "main": "src/server.js",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test tests/",
    "test:watch": "node --test --watch tests/",
    "fake-keyence": "node scripts/fake-keyence.js",
    "ping-keyence": "node scripts/ping-keyence.js"
  },
  "dependencies": {
    "@fastify/static": "^7.0.4",
    "@fastify/websocket": "^10.0.1",
    "@supabase/supabase-js": "^2.45.0",
    "better-sqlite3": "^11.3.0",
    "dotenv": "^16.4.5",
    "exceljs": "^4.4.0",
    "fastify": "^4.28.1",
    "pdfkit": "^0.15.0",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.2"
  },
  "devDependencies": {}
}
```

- [ ] **Step 4: Criar diretórios vazios com .gitkeep**

```bash
mkdir -p src/db/migrations src/db/queries src/domain src/camera src/sync src/http/routes src/shared scripts tests data logs public
touch data/.gitkeep logs/.gitkeep public/.gitkeep
```

- [ ] **Step 5: Criar README mínimo**

```markdown
# Sistema de Contagem Rei AutoParts

Sistema edge-first de contagem automatizada para embarques. Roda no Edge PC (Windows) com 2 câmeras Keyence IV4-600CA.

Ver `ARQUITETURA.md` e `docs/superpowers/specs/` para detalhes.

## Dev

```
npm install
npm run test
npm run dev
```
```

- [ ] **Step 6: Instalar dependências**

Run: `npm install`

Expected: `added N packages in Xs` (sem vulnerabilidades críticas)

- [ ] **Step 7: Commit inicial + incluir documentos de design já existentes**

O diretório já contém arquivos gerados em sessões anteriores (`ARQUITETURA.md`, `docs/superpowers/specs/...`, `docs/superpowers/plans/...`, `supabase/migrations/001_schema_inicial.sql`, `stitch_sistema_contagem_rei_autoparts/`, `manual.pdf`). Esses devem ir no primeiro commit junto com o scaffolding. O `.env` fica fora (listado em `.gitignore`).

```bash
git add .gitignore package.json package-lock.json README.md \
        src/ scripts/ tests/ data/.gitkeep logs/.gitkeep public/.gitkeep \
        ARQUITETURA.md docs/ supabase/ \
        stitch_sistema_contagem_rei_autoparts/ manual.pdf
git status  # confirmar que .env NÃO está na lista
git commit -m "chore: initial scaffold + design docs + Keyence manual"
```

- [ ] **Step 8: Push inicial autenticado via GITHUB_TOKEN**

Carrega o token do `.env` no shell corrente e usa `http.extraHeader` para não gravar o token em `.git/config`:

```bash
# Bash (Git Bash no Windows)
export GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' .env | cut -d= -f2-)
git -c http.extraHeader="Authorization: Bearer $GITHUB_TOKEN" push -u origin main
```

Expected: `Branch 'main' set up to track remote branch 'main' from 'origin'.`

**Alternativa:** se o Git Credential Manager estiver habilitado (padrão no Git for Windows), basta `git push -u origin main` — ele abre prompt do Windows para autenticação e guarda no Credential Store. Escolher uma abordagem e manter consistência.

- [ ] **Step 9: Commitar e pushar os próximos steps com o mesmo padrão**

Para todas as tasks seguintes do plano, cada commit fecha com:

```bash
git -c http.extraHeader="Authorization: Bearer $GITHUB_TOKEN" push origin main
```

(ou `git push origin main` se usando GCM). O plano original já lista `git commit` ao fim de cada task — basta adicionar o `push` na mesma linha.

---

### Task 2: Config loader e logger

**Files:**
- Create: `src/shared/logger.js`
- Create: `src/config.js`
- Create: `tests/config.test.js`
- Modify: `.env` (já existe — adicionar chaves novas)

- [ ] **Step 1: Escrever teste do config loader**

Create `tests/config.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('loadConfig lê variáveis obrigatórias', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CAMERA_1_IP: '192.168.0.10',
    CAMERA_2_IP: '192.168.0.11',
  });
  assert.equal(cfg.supabase.url, 'https://x');
  assert.equal(cfg.cameras[0].ip, '192.168.0.10');
  assert.equal(cfg.cameras[0].porta, 8500);
});

test('loadConfig falha se variável obrigatória ausente', () => {
  assert.throws(
    () => loadConfig({}),
    /variável obrigatória ausente/
  );
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npm test -- tests/config.test.js`
Expected: FAIL (`Cannot find module '../src/config.js'`)

- [ ] **Step 3: Implementar config.js**

```javascript
import 'dotenv/config';

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CAMERA_1_IP',
  'CAMERA_2_IP',
];

export function loadConfig(env = process.env) {
  for (const key of REQUIRED) {
    if (!env[key]) {
      throw new Error(`variável obrigatória ausente: ${key}`);
    }
  }
  return {
    supabase: {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cameras: [
      { id: 1, ip: env.CAMERA_1_IP, porta: Number(env.CAMERA_1_PORTA ?? 8500) },
      { id: 2, ip: env.CAMERA_2_IP, porta: Number(env.CAMERA_2_PORTA ?? 8500) },
    ],
    http: {
      host: env.HTTP_HOST ?? '127.0.0.1',
      port: Number(env.HTTP_PORT ?? 3000),
    },
    sync: {
      pollerIntervalMs: Number(env.SYNC_POLLER_MS ?? 30000),
      healthcheckIntervalMs: Number(env.SYNC_HEALTHCHECK_MS ?? 30000),
      failureThreshold: Number(env.SYNC_FAILURES_BEFORE_OFFLINE ?? 3),
    },
    db: {
      path: env.SQLITE_PATH ?? './data/contagem.db',
    },
    logs: {
      level: env.LOG_LEVEL ?? 'info',
      path: env.LOG_PATH ?? './logs/app.log',
    },
  };
}

export const config = loadConfig();
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Run: `npm test -- tests/config.test.js`
Expected: `# pass 2 / # fail 0`

- [ ] **Step 5: Adicionar variáveis de câmera ao .env**

Append ao `.env`:

```
CAMERA_1_IP=192.168.0.10
CAMERA_1_PORTA=8500
CAMERA_2_IP=192.168.0.11
CAMERA_2_PORTA=8500
HTTP_HOST=127.0.0.1
HTTP_PORT=3000
LOG_LEVEL=info
```

(IPs placeholder — usuário vai ajustar para os reais).

- [ ] **Step 6: Implementar logger**

Create `src/shared/logger.js`:

```javascript
import pino from 'pino';
import { config } from '../config.js';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: config.logs.level,
  transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  base: { app: 'contagem-edge' },
});
```

- [ ] **Step 7: Commit**

```bash
git add src/config.js src/shared/logger.js tests/config.test.js .env
git commit -m "feat(config): load env config with validation + pino logger"
```

---

## Fase 1 — Camada SQLite local

### Task 3: Migration inicial local + singleton do DB

**Files:**
- Create: `src/db/migrations/001_init.sql`
- Create: `src/db/sqlite.js`
- Create: `tests/sqlite.test.js`

- [ ] **Step 1: Criar migration local**

Create `src/db/migrations/001_init.sql`:

```sql
-- Sessões (origem: Edge PC, replicam para Supabase)
CREATE TABLE IF NOT EXISTS sessoes_contagem (
    id                TEXT    PRIMARY KEY,         -- UUID
    numero_embarque   TEXT    NOT NULL,
    codigo_op         TEXT    NOT NULL,
    codigo_operador   TEXT    NOT NULL,
    camera_id         INTEGER NOT NULL CHECK (camera_id IN (1, 2)),
    programa_numero   INTEGER,
    programa_nome     TEXT,
    numero_caixa      TEXT,
    quantidade_total  INTEGER NOT NULL DEFAULT 0,
    iniciada_em       TEXT    NOT NULL,
    encerrada_em      TEXT,
    status            TEXT    NOT NULL CHECK (status IN ('ativa', 'encerrada', 'cancelada')),
    criada_em         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_camera_unica_ativa
    ON sessoes_contagem (camera_id) WHERE status = 'ativa';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_caixa_unica
    ON sessoes_contagem (numero_embarque, numero_caixa) WHERE numero_caixa IS NOT NULL;

-- Eventos (origem: Edge PC, replicam para Supabase)
CREATE TABLE IF NOT EXISTS eventos_log (
    id_local        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT    NOT NULL,
    nivel           TEXT    NOT NULL CHECK (nivel IN ('INFO', 'WARN', 'ERROR', 'SUCCESS')),
    categoria       TEXT    NOT NULL CHECK (categoria IN ('SESSAO', 'CAMERA', 'SYNC', 'SISTEMA')),
    mensagem        TEXT    NOT NULL,
    codigo_operador TEXT,
    criado_em       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Outbox (itens a enviar para Supabase)
CREATE TABLE IF NOT EXISTS outbox (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    tabela            TEXT    NOT NULL,
    payload_json      TEXT    NOT NULL,
    tentativas        INTEGER NOT NULL DEFAULT 0,
    ultima_tentativa  TEXT,
    erro_detalhe      TEXT,
    sincronizado_em   TEXT,
    criado_em         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_pendente
    ON outbox (sincronizado_em) WHERE sincronizado_em IS NULL;

-- Espelhos (origem: Supabase via Reverse Sync Poller)
CREATE TABLE IF NOT EXISTS embarques (
    numero_embarque     TEXT PRIMARY KEY,
    motorista           TEXT,
    placa               TEXT,
    data_criacao        TEXT,
    numero_nota_fiscal  TEXT,
    status              TEXT,
    capacidade_maxima   INTEGER,
    atualizado_em       TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ordens_producao (
    codigo_op           TEXT PRIMARY KEY,
    item_codigo         TEXT,
    item_descricao      TEXT,
    quantidade_prevista INTEGER,
    atualizado_em       TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operadores (
    codigo        TEXT PRIMARY KEY,
    nome          TEXT NOT NULL,
    ativo         INTEGER NOT NULL DEFAULT 1,
    atualizado_em TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cursor do Reverse Sync Poller
CREATE TABLE IF NOT EXISTS sync_cursor (
    tabela                TEXT PRIMARY KEY,
    ultimo_atualizado_em  TEXT,
    ultimo_poll_em        TEXT
);
```

- [ ] **Step 2: Escrever teste do singleton**

Create `tests/sqlite.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';

test('openDatabase cria tabelas via migration', () => {
  const db = openDatabase(':memory:');
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  ).all().map(r => r.name);

  assert.ok(tables.includes('sessoes_contagem'));
  assert.ok(tables.includes('eventos_log'));
  assert.ok(tables.includes('outbox'));
  assert.ok(tables.includes('embarques'));
  assert.ok(tables.includes('ordens_producao'));
  assert.ok(tables.includes('operadores'));
  assert.ok(tables.includes('sync_cursor'));
});

test('índice único de 1 sessão ativa por câmera', () => {
  const db = openDatabase(':memory:');
  db.prepare(`INSERT INTO sessoes_contagem
    (id, numero_embarque, codigo_op, codigo_operador, camera_id, iniciada_em, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ativa')`).run('u1', 'E1', 'O1', 'OP1', 1, '2026-04-17');

  assert.throws(() => {
    db.prepare(`INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, iniciada_em, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ativa')`).run('u2', 'E1', 'O1', 'OP1', 1, '2026-04-17');
  }, /UNIQUE/);
});
```

- [ ] **Step 3: Implementar singleton**

Create `src/db/sqlite.js`:

```javascript
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function openDatabase(filePath) {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
  }
}

let singleton;
export function getDb(config) {
  if (!singleton) {
    const dir = path.dirname(config.db.path);
    fs.mkdirSync(dir, { recursive: true });
    singleton = openDatabase(config.db.path);
  }
  return singleton;
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- tests/sqlite.test.js`
Expected: `# pass 2 / # fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/db/migrations/001_init.sql src/db/sqlite.js tests/sqlite.test.js
git commit -m "feat(db): local SQLite schema + migration runner + singleton"
```

---

### Task 4: Queries da outbox

**Files:**
- Create: `src/db/queries/outbox.js`
- Create: `tests/outbox.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/outbox.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { enfileirar, listarPendentes, marcarSincronizado, marcarFalha } from '../src/db/queries/outbox.js';

test('enfileirar grava payload_json', () => {
  const db = openDatabase(':memory:');
  const id = enfileirar(db, 'sessoes_contagem', { id: 'uuid1', total: 10 });
  assert.ok(id > 0);
  const row = db.prepare('SELECT * FROM outbox WHERE id=?').get(id);
  assert.equal(row.tabela, 'sessoes_contagem');
  assert.equal(JSON.parse(row.payload_json).total, 10);
});

test('listarPendentes só retorna sincronizado_em NULL', () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 't', { a: 1 });
  const id2 = enfileirar(db, 't', { a: 2 });
  marcarSincronizado(db, id2);
  const pend = listarPendentes(db, 10);
  assert.equal(pend.length, 1);
  assert.equal(JSON.parse(pend[0].payload_json).a, 1);
});

test('marcarFalha incrementa tentativas e salva erro', () => {
  const db = openDatabase(':memory:');
  const id = enfileirar(db, 't', { a: 1 });
  marcarFalha(db, id, 'ECONNREFUSED');
  const row = db.prepare('SELECT * FROM outbox WHERE id=?').get(id);
  assert.equal(row.tentativas, 1);
  assert.equal(row.erro_detalhe, 'ECONNREFUSED');
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

Run: `npm test -- tests/outbox.test.js`
Expected: FAIL (módulo não encontrado)

- [ ] **Step 3: Implementar**

Create `src/db/queries/outbox.js`:

```javascript
export function enfileirar(db, tabela, payload) {
  const stmt = db.prepare(
    'INSERT INTO outbox (tabela, payload_json) VALUES (?, ?)'
  );
  const result = stmt.run(tabela, JSON.stringify(payload));
  return result.lastInsertRowid;
}

export function listarPendentes(db, limite = 100) {
  return db.prepare(
    `SELECT id, tabela, payload_json, tentativas FROM outbox
     WHERE sincronizado_em IS NULL
     ORDER BY id LIMIT ?`
  ).all(limite);
}

export function marcarSincronizado(db, id) {
  db.prepare(
    `UPDATE outbox SET sincronizado_em = datetime('now') WHERE id = ?`
  ).run(id);
}

export function marcarFalha(db, id, erro) {
  db.prepare(
    `UPDATE outbox
     SET tentativas = tentativas + 1,
         ultima_tentativa = datetime('now'),
         erro_detalhe = ?
     WHERE id = ?`
  ).run(String(erro).slice(0, 500), id);
}

export function contarPendentes(db) {
  return db.prepare(
    'SELECT COUNT(*) as c FROM outbox WHERE sincronizado_em IS NULL'
  ).get().c;
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- tests/outbox.test.js`
Expected: `# pass 3`

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/outbox.js tests/outbox.test.js
git commit -m "feat(db): outbox queries (enqueue, list pending, mark sync/fail)"
```

---

### Task 5: Queries de sessões locais

**Files:**
- Create: `src/db/queries/sessoes.js`
- Create: `tests/sessoes-queries.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/sessoes-queries.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { criarSessao, buscarAtivaPorCamera, incrementarContagem, encerrarSessao, listarAtivas } from '../src/db/queries/sessoes.js';

function setup() {
  const db = openDatabase(':memory:');
  db.prepare('INSERT INTO embarques (numero_embarque, status) VALUES (?, ?)').run('E1', 'aberto');
  db.prepare('INSERT INTO ordens_producao (codigo_op) VALUES (?)').run('OP1');
  db.prepare('INSERT INTO operadores (codigo, nome) VALUES (?, ?)').run('001', 'Fulano');
  return db;
}

test('criarSessao persiste registro ativo', () => {
  const db = setup();
  const id = criarSessao(db, {
    id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1',
    codigo_operador: '001', camera_id: 1,
    programa_numero: 2, programa_nome: 'PECA-X',
    iniciada_em: '2026-04-17T10:00:00Z',
  });
  const s = buscarAtivaPorCamera(db, 1);
  assert.equal(s.id, 'u1');
  assert.equal(s.status, 'ativa');
});

test('não permite 2 sessões ativas na mesma câmera', () => {
  const db = setup();
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  assert.throws(() => criarSessao(db, { id: 'u2', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' }), /UNIQUE/);
});

test('incrementarContagem atualiza total', () => {
  const db = setup();
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  incrementarContagem(db, 'u1', 5);
  const s = buscarAtivaPorCamera(db, 1);
  assert.equal(s.quantidade_total, 5);
});

test('encerrarSessao muda status e define numero_caixa', () => {
  const db = setup();
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  encerrarSessao(db, 'u1', 'CX-001', '2026-04-17T11:00:00Z');
  const s = db.prepare('SELECT * FROM sessoes_contagem WHERE id=?').get('u1');
  assert.equal(s.status, 'encerrada');
  assert.equal(s.numero_caixa, 'CX-001');
});

test('caixa duplicada no mesmo embarque é bloqueada', () => {
  const db = setup();
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  encerrarSessao(db, 'u1', 'CX-001', '2026-04-17T11:00:00Z');
  criarSessao(db, { id: 'u2', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2, iniciada_em: '2026-04-17T11:00:00Z' });
  assert.throws(() => encerrarSessao(db, 'u2', 'CX-001', '2026-04-17T12:00:00Z'), /UNIQUE/);
});
```

- [ ] **Step 2: Implementar queries**

Create `src/db/queries/sessoes.js`:

```javascript
export function criarSessao(db, dados) {
  const stmt = db.prepare(`
    INSERT INTO sessoes_contagem (
      id, numero_embarque, codigo_op, codigo_operador,
      camera_id, programa_numero, programa_nome,
      iniciada_em, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
  `);
  stmt.run(
    dados.id, dados.numero_embarque, dados.codigo_op, dados.codigo_operador,
    dados.camera_id, dados.programa_numero ?? null, dados.programa_nome ?? null,
    dados.iniciada_em
  );
  return dados.id;
}

export function buscarAtivaPorCamera(db, cameraId) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem WHERE camera_id = ? AND status = 'ativa'`
  ).get(cameraId);
}

export function incrementarContagem(db, id, delta) {
  db.prepare(
    `UPDATE sessoes_contagem SET quantidade_total = quantidade_total + ? WHERE id = ?`
  ).run(delta, id);
}

export function encerrarSessao(db, id, numeroCaixa, encerradaEm) {
  db.prepare(`
    UPDATE sessoes_contagem
       SET status = 'encerrada',
           numero_caixa = ?,
           encerrada_em = ?
     WHERE id = ?
  `).run(numeroCaixa, encerradaEm, id);
}

export function listarAtivas(db) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem WHERE status = 'ativa' ORDER BY camera_id`
  ).all();
}

export function buscarPorId(db, id) {
  return db.prepare(`SELECT * FROM sessoes_contagem WHERE id = ?`).get(id);
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/sessoes-queries.test.js`
Expected: `# pass 5`

- [ ] **Step 4: Commit**

```bash
git add src/db/queries/sessoes.js tests/sessoes-queries.test.js
git commit -m "feat(db): session queries with unique-active + unique-box constraints"
```

---

### Task 6: Queries de eventos e espelhos

**Files:**
- Create: `src/db/queries/eventos.js`
- Create: `src/db/queries/espelhos.js`
- Create: `tests/espelhos.test.js`

- [ ] **Step 1: Implementar eventos.js**

Create `src/db/queries/eventos.js`:

```javascript
export function registrarEvento(db, { nivel, categoria, mensagem, codigo_operador = null, timestamp }) {
  const stmt = db.prepare(`
    INSERT INTO eventos_log (timestamp, nivel, categoria, mensagem, codigo_operador)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(timestamp ?? new Date().toISOString(), nivel, categoria, mensagem, codigo_operador);
  return result.lastInsertRowid;
}

export function listarRecentes(db, limite = 100) {
  return db.prepare(
    `SELECT * FROM eventos_log ORDER BY id_local DESC LIMIT ?`
  ).all(limite);
}

export function buscarPorIdLocal(db, idLocal) {
  return db.prepare(`SELECT * FROM eventos_log WHERE id_local = ?`).get(idLocal);
}
```

- [ ] **Step 2: Escrever teste dos espelhos**

Create `tests/espelhos.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador, lerCursor, salvarCursor, buscarEmbarque, listarEmbarquesAbertos, buscarOP, listarOperadoresAtivos } from '../src/db/queries/espelhos.js';

test('upsertEmbarque insere e atualiza', () => {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto', atualizado_em: '2026-04-17T10:00:00Z' });
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'fechado', atualizado_em: '2026-04-17T11:00:00Z' });
  const row = buscarEmbarque(db, 'E1');
  assert.equal(row.status, 'fechado');
});

test('listarEmbarquesAbertos filtra por status', () => {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertEmbarque(db, { numero_embarque: 'E2', status: 'fechado' });
  const lista = listarEmbarquesAbertos(db);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].numero_embarque, 'E1');
});

test('cursor persiste timestamp', () => {
  const db = openDatabase(':memory:');
  salvarCursor(db, 'embarques', '2026-04-17T10:00:00Z');
  assert.equal(lerCursor(db, 'embarques'), '2026-04-17T10:00:00Z');
});

test('upsertOperador e listarOperadoresAtivos', () => {
  const db = openDatabase(':memory:');
  upsertOperador(db, { codigo: '001', nome: 'Fulano', ativo: true });
  upsertOperador(db, { codigo: '002', nome: 'Ciclano', ativo: false });
  const ativos = listarOperadoresAtivos(db);
  assert.equal(ativos.length, 1);
  assert.equal(ativos[0].codigo, '001');
});
```

- [ ] **Step 3: Implementar espelhos**

Create `src/db/queries/espelhos.js`:

```javascript
export function upsertEmbarque(db, e) {
  db.prepare(`
    INSERT INTO embarques (numero_embarque, motorista, placa, data_criacao, numero_nota_fiscal, status, capacidade_maxima, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(numero_embarque) DO UPDATE SET
      motorista = excluded.motorista,
      placa = excluded.placa,
      data_criacao = excluded.data_criacao,
      numero_nota_fiscal = excluded.numero_nota_fiscal,
      status = excluded.status,
      capacidade_maxima = excluded.capacidade_maxima,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(
    e.numero_embarque, e.motorista ?? null, e.placa ?? null,
    e.data_criacao ?? null, e.numero_nota_fiscal ?? null, e.status ?? 'aberto',
    e.capacidade_maxima ?? null, e.atualizado_em ?? null
  );
}

export function buscarEmbarque(db, numero) {
  return db.prepare(`SELECT * FROM embarques WHERE numero_embarque = ?`).get(numero);
}

export function listarEmbarquesAbertos(db) {
  return db.prepare(`SELECT * FROM embarques WHERE status = 'aberto' ORDER BY data_criacao DESC`).all();
}

export function upsertOP(db, op) {
  db.prepare(`
    INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao, quantidade_prevista, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(codigo_op) DO UPDATE SET
      item_codigo = excluded.item_codigo,
      item_descricao = excluded.item_descricao,
      quantidade_prevista = excluded.quantidade_prevista,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(op.codigo_op, op.item_codigo ?? null, op.item_descricao ?? null, op.quantidade_prevista ?? null, op.atualizado_em ?? null);
}

export function buscarOP(db, codigo) {
  return db.prepare(`SELECT * FROM ordens_producao WHERE codigo_op = ?`).get(codigo);
}

export function listarOPs(db, filtro = '') {
  return db.prepare(`
    SELECT * FROM ordens_producao
    WHERE codigo_op LIKE ? OR item_codigo LIKE ? OR item_descricao LIKE ?
    ORDER BY codigo_op LIMIT 100
  `).all(`%${filtro}%`, `%${filtro}%`, `%${filtro}%`);
}

export function upsertOperador(db, o) {
  db.prepare(`
    INSERT INTO operadores (codigo, nome, ativo, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(codigo) DO UPDATE SET
      nome = excluded.nome,
      ativo = excluded.ativo,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(o.codigo, o.nome, o.ativo ? 1 : 0, o.atualizado_em ?? null);
}

export function listarOperadoresAtivos(db) {
  return db.prepare(`SELECT * FROM operadores WHERE ativo = 1 ORDER BY nome`).all();
}

export function buscarOperador(db, codigo) {
  return db.prepare(`SELECT * FROM operadores WHERE codigo = ?`).get(codigo);
}

export function lerCursor(db, tabela) {
  const row = db.prepare(`SELECT ultimo_atualizado_em FROM sync_cursor WHERE tabela = ?`).get(tabela);
  return row?.ultimo_atualizado_em ?? null;
}

export function salvarCursor(db, tabela, atualizadoEm) {
  db.prepare(`
    INSERT INTO sync_cursor (tabela, ultimo_atualizado_em, ultimo_poll_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(tabela) DO UPDATE SET
      ultimo_atualizado_em = excluded.ultimo_atualizado_em,
      ultimo_poll_em = datetime('now')
  `).run(tabela, atualizadoEm);
}

export function ultimoPoll(db, tabela) {
  const row = db.prepare(`SELECT ultimo_poll_em FROM sync_cursor WHERE tabela = ?`).get(tabela);
  return row?.ultimo_poll_em ?? null;
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- tests/espelhos.test.js`
Expected: `# pass 4`

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/eventos.js src/db/queries/espelhos.js tests/espelhos.test.js
git commit -m "feat(db): mirror tables (embarques/OPs/operadores) + sync cursor + events"
```

---

## Fase 2 — Protocolo Keyence

### Task 7: Parser de pulso Keyence

**Files:**
- Create: `src/camera/keyence-parser.js`
- Create: `tests/keyence-parser.test.js`

- [ ] **Step 1: Escrever testes**

Create `tests/keyence-parser.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePulso, parseRespostaComando } from '../src/camera/keyence-parser.js';

test('parsePulso decodifica payload padrão', () => {
  const r = parsePulso('02,0000150,0000500,000');
  assert.deepEqual(r, {
    tipo: 'pulso',
    ferramenta: 2,
    contagem: 150,
    total_dia: 500,
    brilho: 0,
  });
});

test('parsePulso lida com espaços à esquerda', () => {
  const r = parsePulso('01,     10,    100,128');
  assert.equal(r.ferramenta, 1);
  assert.equal(r.contagem, 10);
  assert.equal(r.total_dia, 100);
  assert.equal(r.brilho, 128);
});

test('parsePulso retorna null para payload inválido', () => {
  assert.equal(parsePulso('lixo qualquer'), null);
  assert.equal(parsePulso(''), null);
  assert.equal(parsePulso('01,abc,def,xyz'), null);
});

test('parseRespostaComando ER extrai código', () => {
  const r = parseRespostaComando('ER,PW,22');
  assert.deepEqual(r, { tipo: 'erro', comando: 'PW', codigo: 22 });
});

test('parseRespostaComando PR com programa', () => {
  const r = parseRespostaComando('PR,003');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PR', valores: ['003'] });
});

test('parseRespostaComando PNR com nome', () => {
  const r = parseRespostaComando('PNR,PECA-XYZ');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PNR', valores: ['PECA-XYZ'] });
});

test('parseRespostaComando ack sem parâmetros', () => {
  const r = parseRespostaComando('PW');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PW', valores: [] });
});
```

- [ ] **Step 2: Implementar parser**

Create `src/camera/keyence-parser.js`:

```javascript
// Pulso modo IA Contagem de Passagem: "ff,qqqqqqq,rrrrrrr,ppp"
const PULSO_RE = /^(\d{2}),\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/;

export function parsePulso(linha) {
  if (!linha) return null;
  const m = linha.trim().match(PULSO_RE);
  if (!m) return null;
  return {
    tipo: 'pulso',
    ferramenta: Number(m[1]),
    contagem: Number(m[2]),
    total_dia: Number(m[3]),
    brilho: Number(m[4]),
  };
}

// Resposta de comando: "CMD[,v1[,v2...]]" ou "ER,CMD,codigo"
export function parseRespostaComando(linha) {
  if (!linha) return null;
  const trimmed = linha.trim();
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts[0] === 'ER') {
    return {
      tipo: 'erro',
      comando: parts[1] ?? '',
      codigo: Number(parts[2] ?? 0),
    };
  }
  return {
    tipo: 'resposta',
    comando: parts[0],
    valores: parts.slice(1),
  };
}

// Dispatcher — decide entre pulso e resposta
export function parseLinha(linha) {
  return parsePulso(linha) ?? parseRespostaComando(linha);
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/keyence-parser.test.js`
Expected: `# pass 7`

- [ ] **Step 4: Commit**

```bash
git add src/camera/keyence-parser.js tests/keyence-parser.test.js
git commit -m "feat(camera): Keyence TCP protocol parser (pulses + command responses)"
```

---

### Task 8: Keyence Client (socket + fila de comandos)

**Files:**
- Create: `src/camera/keyence-client.js`
- Create: `tests/keyence-client.test.js`

- [ ] **Step 1: Escrever teste com fake socket**

Create `tests/keyence-client.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { KeyenceClient } from '../src/camera/keyence-client.js';

class FakeSocket extends EventEmitter {
  constructor() { super(); this.written = []; this.connected = false; }
  connect(port, host, cb) { this.connected = true; setImmediate(() => { cb?.(); this.emit('connect'); }); return this; }
  write(buf) { this.written.push(buf.toString()); return true; }
  end() { this.connected = false; this.emit('close'); }
  setNoDelay() {}
  setKeepAlive() {}
  destroy() { this.connected = false; }
}

test('enviaComando escreve com CR e resolve com resposta', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p = c.enviaComando('PR');
  assert.equal(socket.written[0], 'PR\r');
  socket.emit('data', Buffer.from('PR,003\r'));
  const resp = await p;
  assert.equal(resp.comando, 'PR');
  assert.deepEqual(resp.valores, ['003']);
});

test('pulsos chegam via evento "pulso"', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const recebidos = [];
  c.on('pulso', p => recebidos.push(p));
  socket.emit('data', Buffer.from('02,0000050,0000100,000\r'));
  await new Promise(r => setImmediate(r));
  assert.equal(recebidos.length, 1);
  assert.equal(recebidos[0].contagem, 50);
});

test('enviaComando rejeita se ER', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p = c.enviaComando('PW,999');
  socket.emit('data', Buffer.from('ER,PW,22\r'));
  await assert.rejects(p, /ER:PW:22/);
});

test('fila serializa comandos concorrentes', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p1 = c.enviaComando('PR');
  const p2 = c.enviaComando('PNR');
  assert.equal(socket.written.length, 1); // só o primeiro
  socket.emit('data', Buffer.from('PR,002\r'));
  await new Promise(r => setImmediate(r));
  assert.equal(socket.written.length, 2);
  socket.emit('data', Buffer.from('PNR,ITEM\r'));
  await Promise.all([p1, p2]);
});
```

- [ ] **Step 2: Implementar client**

Create `src/camera/keyence-client.js`:

```javascript
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { parseLinha } from './keyence-parser.js';

const CR = 0x0D;
const COMANDO_TIMEOUT_MS = 3000;

export class KeyenceClient extends EventEmitter {
  constructor({ ip, porta, socketFactory = () => new net.Socket() }) {
    super();
    this.ip = ip;
    this.porta = porta;
    this.socketFactory = socketFactory;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.fila = [];
    this.aguardando = null;
    this.conectado = false;
  }

  conectar() {
    return new Promise((resolve, reject) => {
      const s = this.socketFactory();
      s.setNoDelay(true);
      s.setKeepAlive(true, 10000);
      s.on('data', b => this._onData(b));
      s.on('close', () => this._onClose());
      s.on('error', e => this.emit('erro', e));
      s.connect(this.porta, this.ip, () => {
        this.conectado = true;
        this.socket = s;
        this.emit('conectado');
        resolve();
      });
      setTimeout(() => { if (!this.conectado) reject(new Error('timeout conexão')); }, 5000);
    });
  }

  desconectar() {
    if (this.socket) { this.socket.end(); this.socket = null; }
    this.conectado = false;
  }

  enviaComando(cmd) {
    return new Promise((resolve, reject) => {
      this.fila.push({ cmd, resolve, reject });
      this._drenarFila();
    });
  }

  _drenarFila() {
    if (this.aguardando || this.fila.length === 0 || !this.conectado) return;
    this.aguardando = this.fila.shift();
    this.socket.write(this.aguardando.cmd + '\r');
    this.aguardando.timeout = setTimeout(() => {
      const a = this.aguardando; this.aguardando = null;
      a.reject(new Error(`timeout comando ${a.cmd}`));
      this._drenarFila();
    }, COMANDO_TIMEOUT_MS);
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let idx;
    while ((idx = this.buffer.indexOf(CR)) >= 0) {
      const linha = this.buffer.slice(0, idx).toString('ascii');
      this.buffer = this.buffer.slice(idx + 1);
      this._processarLinha(linha);
    }
  }

  _processarLinha(linha) {
    const parsed = parseLinha(linha);
    if (!parsed) { this.emit('raw', linha); return; }
    if (parsed.tipo === 'pulso') {
      this.emit('pulso', parsed);
      return;
    }
    if (!this.aguardando) { this.emit('resposta-sem-comando', parsed); return; }
    const { resolve, reject, cmd, timeout } = this.aguardando;
    clearTimeout(timeout);
    this.aguardando = null;
    if (parsed.tipo === 'erro') {
      reject(new Error(`ER:${parsed.comando}:${parsed.codigo}`));
    } else {
      resolve(parsed);
    }
    this._drenarFila();
  }

  _onClose() {
    this.conectado = false;
    if (this.aguardando) {
      clearTimeout(this.aguardando.timeout);
      this.aguardando.reject(new Error('conexão fechada'));
      this.aguardando = null;
    }
    this.emit('desconectado');
  }
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/keyence-client.test.js`
Expected: `# pass 4`

- [ ] **Step 4: Commit**

```bash
git add src/camera/keyence-client.js tests/keyence-client.test.js
git commit -m "feat(camera): Keyence TCP client with command queue + pulse events"
```

---

### Task 9: Camera Manager (reconnect + estado + cache de programas)

**Files:**
- Create: `src/camera/camera-manager.js`
- Create: `tests/camera-manager.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/camera-manager.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { CameraManager } from '../src/camera/camera-manager.js';

class FakeClient extends EventEmitter {
  constructor() { super(); this.conectado = false; this.comandos = []; this.respostas = new Map(); }
  async conectar() { this.conectado = true; this.emit('conectado'); }
  desconectar() { this.conectado = false; this.emit('desconectado'); }
  async enviaComando(cmd) {
    this.comandos.push(cmd);
    const r = this.respostas.get(cmd);
    if (r instanceof Error) throw r;
    return r ?? { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  }
}

test('ativarSessao envia PW, CTR, OE em ordem', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 2 });
  assert.deepEqual(client.comandos, ['PW,002', 'CTR', 'OE,1']);
  assert.equal(m.estado, 'ativa');
});

test('encerrarSessao envia OE,0 e volta para suspensa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 3 });
  await m.encerrarSessao();
  assert.equal(client.comandos.at(-1), 'OE,0');
  assert.equal(m.estado, 'suspensa');
});

test('descobrirProgramas varre PW+PNR e cacheia nomes válidos', async () => {
  const client = new FakeClient();
  // programas 000..002 válidos, resto vazio
  client.respostas.set('PW,000', { valores: [] });
  client.respostas.set('PNR', { valores: ['PECA-A'] });
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 3 });
  await m.conectar();
  // encadeamento simulado: o manager alterna PW,PNR
  let chamadas = 0;
  const orig = client.enviaComando.bind(client);
  client.enviaComando = async (cmd) => {
    chamadas++;
    if (cmd === 'PNR') return { valores: [chamadas <= 2 ? 'PECA-A' : ''] };
    return orig(cmd);
  };
  const lista = await m.descobrirProgramas();
  assert.ok(lista.length >= 1);
});
```

- [ ] **Step 2: Implementar manager**

Create `src/camera/camera-manager.js`:

```javascript
import { EventEmitter } from 'node:events';

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];

export class CameraManager extends EventEmitter {
  constructor({ cameraId, client, maxProgramas = 128, logger = console }) {
    super();
    this.cameraId = cameraId;
    this.client = client;
    this.maxProgramas = maxProgramas;
    this.logger = logger;
    this.estado = 'desconectada'; // desconectada | suspensa | ativa
    this.programas = new Map(); // numero -> nome
    this.tentativas = 0;

    client.on('pulso', p => this.emit('pulso', { cameraId, ...p }));
    client.on('desconectado', () => this._onDesconectado());
    client.on('erro', e => this.logger.error?.({ err: e, cameraId }, 'erro no client'));
  }

  async conectar() {
    try {
      await this.client.conectar();
      this.estado = 'suspensa';
      this.tentativas = 0;
      this.emit('estado', this.estado);
      // garante OE=0 ao conectar (câmera começa suspensa)
      try { await this.client.enviaComando('OE,0'); } catch (_) { /* idempotente */ }
    } catch (e) {
      this._agendarReconnect();
    }
  }

  _onDesconectado() {
    this.estado = 'desconectada';
    this.emit('estado', this.estado);
    this._agendarReconnect();
  }

  _agendarReconnect() {
    const delay = BACKOFF[Math.min(this.tentativas, BACKOFF.length - 1)];
    this.tentativas++;
    setTimeout(() => this.conectar(), delay);
  }

  async ativarSessao({ programaNumero, formatoOE = 1 }) {
    if (this.estado === 'desconectada') throw new Error('câmera desconectada');
    const prog = String(programaNumero).padStart(3, '0');
    await this.client.enviaComando(`PW,${prog}`);
    await this.client.enviaComando('CTR');
    await this.client.enviaComando(`OE,${formatoOE}`);
    this.estado = 'ativa';
    this.emit('estado', this.estado);
  }

  async encerrarSessao() {
    if (this.estado !== 'ativa') return;
    await this.client.enviaComando('OE,0');
    this.estado = 'suspensa';
    this.emit('estado', this.estado);
  }

  async descobrirProgramas() {
    if (this.programas.size > 0) return [...this.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
    const original = await this._lerProgramaAtual();
    for (let n = 0; n < this.maxProgramas; n++) {
      const prog = String(n).padStart(3, '0');
      try {
        await this.client.enviaComando(`PW,${prog}`);
        const r = await this.client.enviaComando('PNR');
        const nome = (r.valores?.[0] ?? '').trim();
        if (nome && nome !== '-' && nome !== '(no name)') {
          this.programas.set(n, nome);
        }
      } catch (_) { /* programa não existe, pula */ }
    }
    if (original != null) {
      try { await this.client.enviaComando(`PW,${String(original).padStart(3,'0')}`); } catch (_) {}
    }
    return [...this.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
  }

  async _lerProgramaAtual() {
    try {
      const r = await this.client.enviaComando('PR');
      return Number(r.valores?.[0] ?? 0);
    } catch (_) { return null; }
  }

  buscarProgramas(filtro) {
    const f = filtro.toLowerCase();
    return [...this.programas.entries()]
      .filter(([_, nome]) => nome.toLowerCase().includes(f))
      .map(([numero, nome]) => ({ numero, nome }));
  }
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/camera-manager.test.js`
Expected: `# pass 3`

- [ ] **Step 4: Commit**

```bash
git add src/camera/camera-manager.js tests/camera-manager.test.js
git commit -m "feat(camera): CameraManager with state, reconnect, program cache"
```

---

## Fase 3 — Camada de Sync

### Task 10: Supabase client wrapper + healthcheck

**Files:**
- Create: `src/sync/supabase-client.js`
- Create: `src/sync/healthcheck.js`
- Create: `tests/healthcheck.test.js`

- [ ] **Step 1: Implementar wrapper**

Create `src/sync/supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

export function createSupabase(config) {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: 'sistema_contagem' },
  });
}

export async function upsertSessao(sb, sessao) {
  const { error } = await sb.from('sessoes_contagem').upsert(sessao, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertEvento(sb, evento) {
  const { error } = await sb.from('eventos_log').upsert(evento, { onConflict: 'origem,id_local' });
  if (error) throw error;
}

export async function buscarAlteracoes(sb, tabela, cursor, limite = 500) {
  let q = sb.from(tabela).select('*').order('atualizado_em', { ascending: true }).limit(limite);
  if (cursor) q = q.gt('atualizado_em', cursor);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Escrever teste do healthcheck**

Create `tests/healthcheck.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarHealthchecker } from '../src/sync/healthcheck.js';

test('healthchecker marca falhas e sucesso', async () => {
  let respostas = [false, false, false, true];
  const hc = criarHealthchecker({
    ping: async () => { const r = respostas.shift(); if (!r) throw new Error('down'); return true; },
    limite: 3,
  });
  assert.equal(hc.estado, 'up');
  await hc.tick(); // 1 falha
  assert.equal(hc.estado, 'up');
  await hc.tick(); // 2
  assert.equal(hc.estado, 'up');
  await hc.tick(); // 3 — derruba
  assert.equal(hc.estado, 'down');
  await hc.tick(); // sucesso
  assert.equal(hc.estado, 'up');
});
```

- [ ] **Step 3: Implementar healthcheck**

Create `src/sync/healthcheck.js`:

```javascript
export function criarHealthchecker({ ping, limite = 3 }) {
  let falhas = 0;
  let estado = 'up';
  return {
    get estado() { return estado; },
    async tick() {
      try {
        await ping();
        falhas = 0;
        estado = 'up';
      } catch (e) {
        falhas++;
        if (falhas >= limite) estado = 'down';
      }
      return estado;
    },
    reset() { falhas = 0; estado = 'up'; },
  };
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test -- tests/healthcheck.test.js`
Expected: `# pass 1`

- [ ] **Step 5: Commit**

```bash
git add src/sync/supabase-client.js src/sync/healthcheck.js tests/healthcheck.test.js
git commit -m "feat(sync): Supabase wrapper + healthchecker with failure threshold"
```

---

### Task 11: Outbox Pusher

**Files:**
- Create: `src/sync/outbox-pusher.js`
- Create: `tests/outbox-pusher.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/outbox-pusher.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { enfileirar, contarPendentes } from '../src/db/queries/outbox.js';
import { criarPusher } from '../src/sync/outbox-pusher.js';

test('pusher sincroniza itens pendentes', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  enfileirar(db, 'sessoes_contagem', { id: 'u2' });
  const enviados = [];
  const pusher = criarPusher({
    db,
    enviarBatch: async (item) => { enviados.push(item); },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar();
  assert.equal(enviados.length, 2);
  assert.equal(contarPendentes(db), 0);
});

test('pusher deixa item na fila em caso de 5xx', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  const pusher = criarPusher({
    db,
    enviarBatch: async () => { const e = new Error('500'); e.status = 500; throw e; },
    logger: { info(){}, warn(){}, error(){} },
  });
  await assert.rejects(pusher.drenar(), /500/);
  assert.equal(contarPendentes(db), 1);
});

test('pusher move para dead-letter em 4xx', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  const pusher = criarPusher({
    db,
    enviarBatch: async () => { const e = new Error('400'); e.status = 400; throw e; },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar();
  const row = db.prepare("SELECT * FROM outbox").get();
  assert.ok(row.sincronizado_em === null);
  assert.ok(row.erro_detalhe?.includes('400'));
});
```

- [ ] **Step 2: Implementar pusher**

Create `src/sync/outbox-pusher.js`:

```javascript
import { listarPendentes, marcarSincronizado, marcarFalha } from '../db/queries/outbox.js';

export function criarPusher({ db, enviarBatch, logger, batchSize = 100 }) {
  return {
    async drenar() {
      while (true) {
        const pend = listarPendentes(db, batchSize);
        if (pend.length === 0) return;
        for (const item of pend) {
          try {
            await enviarBatch({ tabela: item.tabela, payload: JSON.parse(item.payload_json) });
            marcarSincronizado(db, item.id);
          } catch (e) {
            marcarFalha(db, item.id, e.message);
            if (e.status >= 400 && e.status < 500) {
              logger.error({ item, err: e }, 'erro 4xx — dead-letter');
              // fica na fila marcado com erro; operador/dev investiga
              continue;
            }
            logger.warn({ err: e }, 'falha transitória no push, abortando ciclo');
            throw e;
          }
        }
      }
    },
  };
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/outbox-pusher.test.js`
Expected: `# pass 3`

- [ ] **Step 4: Commit**

```bash
git add src/sync/outbox-pusher.js tests/outbox-pusher.test.js
git commit -m "feat(sync): outbox pusher with 4xx dead-letter + 5xx retry semantics"
```

---

### Task 12: Reverse Sync Poller

**Files:**
- Create: `src/sync/reverse-poller.js`
- Create: `tests/reverse-poller.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/reverse-poller.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { buscarEmbarque, lerCursor, ultimoPoll } from '../src/db/queries/espelhos.js';
import { criarPoller } from '../src/sync/reverse-poller.js';

test('poller sincroniza e avança cursor', async () => {
  const db = openDatabase(':memory:');
  const chamadas = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela, cursor) => {
      chamadas.push({ tabela, cursor });
      if (tabela === 'embarques') {
        return [
          { numero_embarque: 'E1', status: 'aberto', atualizado_em: '2026-04-17T10:00:00Z' },
          { numero_embarque: 'E2', status: 'aberto', atualizado_em: '2026-04-17T11:00:00Z' },
        ];
      }
      return [];
    },
    logger: { info(){}, warn(){}, error(){} },
  });
  await poller.tick();
  assert.equal(buscarEmbarque(db, 'E1').status, 'aberto');
  assert.equal(lerCursor(db, 'embarques'), '2026-04-17T11:00:00Z');
});

test('tick marca ultimoPoll mesmo quando sem alterações', async () => {
  const db = openDatabase(':memory:');
  const poller = criarPoller({
    db,
    buscarAlteracoes: async () => [],
    logger: { info(){}, warn(){}, error(){} },
  });
  await poller.tick();
  assert.ok(ultimoPoll(db, 'embarques'));
});
```

- [ ] **Step 2: Implementar poller**

Create `src/sync/reverse-poller.js`:

```javascript
import {
  upsertEmbarque, upsertOP, upsertOperador,
  lerCursor, salvarCursor,
} from '../db/queries/espelhos.js';

const TABELAS = [
  { nome: 'embarques', upsert: upsertEmbarque },
  { nome: 'ordens_producao', upsert: upsertOP },
  { nome: 'operadores', upsert: upsertOperador },
];

export function criarPoller({ db, buscarAlteracoes, logger }) {
  return {
    async tick() {
      for (const { nome, upsert } of TABELAS) {
        const cursor = lerCursor(db, nome);
        const registros = await buscarAlteracoes(nome, cursor);
        if (registros.length === 0) {
          salvarCursor(db, nome, cursor);
          continue;
        }
        const tx = db.transaction((rows) => {
          for (const r of rows) upsert(db, r);
        });
        tx(registros);
        const maior = registros.reduce((acc, r) => r.atualizado_em > acc ? r.atualizado_em : acc, cursor ?? '');
        salvarCursor(db, nome, maior);
        logger.info({ tabela: nome, total: registros.length }, 'poller sincronizou');
      }
    },
  };
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/reverse-poller.test.js`
Expected: `# pass 2`

- [ ] **Step 4: Commit**

```bash
git add src/sync/reverse-poller.js tests/reverse-poller.test.js
git commit -m "feat(sync): reverse sync poller (Supabase → SQLite mirror)"
```

---

### Task 13: Sync Worker — state machine

**Files:**
- Create: `src/sync/sync-worker.js`
- Create: `tests/sync-worker.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/sync-worker.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSyncWorker } from '../src/sync/sync-worker.js';

function criarDeps({ pingFalha = false, pusherOk = true } = {}) {
  return {
    healthchecker: {
      estado: pingFalha ? 'down' : 'up',
      async tick() { return this.estado; },
    },
    pusher: {
      drenar: async () => { if (!pusherOk) throw new Error('push falhou'); },
    },
    poller: {
      tick: async () => {},
    },
    logger: { info(){}, warn(){}, error(){} },
  };
}

test('boot em ONLINE com dependências sadias', () => {
  const w = criarSyncWorker(criarDeps());
  assert.equal(w.estado, 'ONLINE');
});

test('down no healthchecker leva a OFFLINE', async () => {
  const deps = criarDeps({ pingFalha: true });
  const w = criarSyncWorker(deps);
  await w.tick();
  assert.equal(w.estado, 'OFFLINE');
});

test('transição OFFLINE → RECOVERY → ONLINE', async () => {
  const deps = criarDeps({ pingFalha: true });
  const w = criarSyncWorker(deps);
  await w.tick();
  assert.equal(w.estado, 'OFFLINE');
  deps.healthchecker.estado = 'up';
  await w.tick();
  assert.ok(['RECOVERY', 'ONLINE'].includes(w.estado));
  await w.tick();
  assert.equal(w.estado, 'ONLINE');
});
```

- [ ] **Step 2: Implementar worker**

Create `src/sync/sync-worker.js`:

```javascript
import { EventEmitter } from 'node:events';

export function criarSyncWorker({ healthchecker, pusher, poller, logger }) {
  const bus = new EventEmitter();
  let estado = 'ONLINE';

  function setEstado(novo) {
    if (novo === estado) return;
    const anterior = estado;
    estado = novo;
    logger.info({ anterior, novo }, 'sync estado mudou');
    bus.emit('estado', { anterior, novo });
  }

  async function tick() {
    const h = await healthchecker.tick();
    if (h === 'down') { setEstado('OFFLINE'); return; }
    if (estado === 'OFFLINE') { setEstado('RECOVERY'); }
    try {
      await pusher.drenar();
      await poller.tick();
      if (estado === 'RECOVERY') setEstado('ONLINE');
    } catch (e) {
      logger.warn({ err: e }, 'falha no ciclo sync');
      setEstado('OFFLINE');
    }
  }

  return {
    get estado() { return estado; },
    tick,
    on: (ev, fn) => bus.on(ev, fn),
  };
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/sync-worker.test.js`
Expected: `# pass 3`

- [ ] **Step 4: Commit**

```bash
git add src/sync/sync-worker.js tests/sync-worker.test.js
git commit -m "feat(sync): worker state machine orchestrating pusher + poller + health"
```

---

## Fase 4 — Domain Layer

### Task 14: Sessão Service

**Files:**
- Create: `src/domain/sessao-service.js`
- Create: `tests/sessao-service.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/sessao-service.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';

function setup() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'IT1', quantidade_prevista: 100 });
  upsertOperador(db, { codigo: '001', nome: 'Fulano', ativo: true });
  const fakeCamera = {
    cameraId: 1, estado: 'suspensa',
    ativada: [],
    async ativarSessao(args) { this.ativada.push(args); this.estado = 'ativa'; },
    async encerrarSessao() { this.estado = 'suspensa'; },
  };
  const cameraManagers = new Map([[1, fakeCamera]]);
  const eventos = [];
  const svc = criarSessaoService({
    db,
    cameraManagers,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    gerarUUID: () => 'uuid-fake',
    broadcast: () => {},
  });
  return { db, svc, fakeCamera, eventos };
}

test('abrir + confirmar uma sessão', async () => {
  const { svc, fakeCamera } = setup();
  const s = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  assert.equal(s.camera_id, 1);
  await svc.confirmar(s.id, { programaNumero: 2, programaNome: 'PECA-X' });
  assert.equal(fakeCamera.ativada.length, 1);
  assert.equal(fakeCamera.estado, 'ativa');
});

test('abrir falha se embarque fechado', async () => {
  const { svc, db } = setup();
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'fechado' });
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 }),
    /embarque.*fechado/i
  );
});

test('abrir falha se operador desconhecido', async () => {
  const { svc } = setup();
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '999', camera_id: 1 }),
    /operador/i
  );
});

test('encerrar valida duplicata de caixa', async () => {
  const { svc, db } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'X' });
  await svc.encerrar(s1.id, 'CX-001');
  // 2ª sessão tenta reusar caixa
  const s2 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s2.id, { programaNumero: 2, programaNome: 'X' });
  await assert.rejects(svc.encerrar(s2.id, 'CX-001'), /caixa.*duplicad/i);
});
```

- [ ] **Step 2: Implementar service**

Create `src/domain/sessao-service.js`:

```javascript
import { criarSessao, buscarAtivaPorCamera, buscarPorId, encerrarSessao, listarAtivas } from '../db/queries/sessoes.js';
import { buscarEmbarque, buscarOP, buscarOperador } from '../db/queries/espelhos.js';

export function criarSessaoService({ db, cameraManagers, registrarEvento, enfileirarSync, gerarUUID, broadcast }) {
  function _validarPreRequisitos({ numero_embarque, codigo_op, codigo_operador }) {
    const e = buscarEmbarque(db, numero_embarque);
    if (!e) throw new Error(`Embarque ${numero_embarque} não encontrado. Aguarde sincronização com ERP.`);
    if (e.status === 'fechado') throw new Error(`Embarque ${numero_embarque} está fechado.`);
    const op = buscarOP(db, codigo_op);
    if (!op) throw new Error(`OP ${codigo_op} não encontrada.`);
    const op2 = buscarOperador(db, codigo_operador);
    if (!op2 || !op2.ativo) throw new Error(`Operador ${codigo_operador} inválido.`);
  }

  async function abrir({ numero_embarque, codigo_op, codigo_operador, camera_id }) {
    _validarPreRequisitos({ numero_embarque, codigo_op, codigo_operador });
    const atual = buscarAtivaPorCamera(db, camera_id);
    if (atual) throw new Error(`Câmera ${camera_id} já tem sessão ativa (${atual.id}).`);

    const id = gerarUUID();
    const iniciadaEm = new Date().toISOString();
    criarSessao(db, { id, numero_embarque, codigo_op, codigo_operador, camera_id, iniciada_em: iniciadaEm });
    registrarEvento({ nivel: 'INFO', categoria: 'SESSAO', mensagem: `Sessão ${id} aberta na câmera ${camera_id}`, codigo_operador });
    broadcast('sessao.atualizada', { id, camera_id, status: 'ativa-sem-programa' });
    return buscarPorId(db, id);
  }

  async function confirmar(sessaoId, { programaNumero, programaNome }) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} não está ativa.`);
    const cam = cameraManagers.get(s.camera_id);
    if (!cam) throw new Error(`Câmera ${s.camera_id} indisponível.`);
    await cam.ativarSessao({ programaNumero });
    db.prepare(`UPDATE sessoes_contagem SET programa_numero = ?, programa_nome = ? WHERE id = ?`)
      .run(programaNumero, programaNome, sessaoId);
    const atualizada = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', atualizada);
    registrarEvento({ nivel: 'INFO', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} confirmada com programa ${programaNumero} (${programaNome})`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', atualizada);
    return atualizada;
  }

  async function encerrar(sessaoId, numeroCaixa) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} já encerrada.`);
    if (!numeroCaixa || !String(numeroCaixa).trim()) throw new Error('Número da caixa obrigatório.');
    // validação de duplicata
    const existe = db.prepare(
      `SELECT id FROM sessoes_contagem WHERE numero_embarque = ? AND numero_caixa = ? AND id != ?`
    ).get(s.numero_embarque, numeroCaixa, sessaoId);
    if (existe) throw new Error(`Caixa duplicada: já existe sessão com caixa ${numeroCaixa} no embarque ${s.numero_embarque}.`);

    const cam = cameraManagers.get(s.camera_id);
    if (cam) await cam.encerrarSessao();
    const encerradaEm = new Date().toISOString();
    encerrarSessao(db, sessaoId, numeroCaixa, encerradaEm);
    const final = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', final);
    registrarEvento({ nivel: 'SUCCESS', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} encerrada (caixa ${numeroCaixa}, total ${final.quantidade_total})`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', final);
    return final;
  }

  function listarAtivasSnapshot() { return listarAtivas(db); }

  return { abrir, confirmar, encerrar, listarAtivas: listarAtivasSnapshot };
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/sessao-service.test.js`
Expected: `# pass 4`

- [ ] **Step 4: Commit**

```bash
git add src/domain/sessao-service.js tests/sessao-service.test.js
git commit -m "feat(domain): session service (abrir/confirmar/encerrar) with full validation"
```

---

### Task 15: Contagem Service

**Files:**
- Create: `src/domain/contagem-service.js`
- Create: `tests/contagem-service.test.js`

- [ ] **Step 1: Escrever teste**

Create `tests/contagem-service.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessao, buscarAtivaPorCamera } from '../src/db/queries/sessoes.js';
import { criarContagemService } from '../src/domain/contagem-service.js';

function setup() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1' });
  upsertOperador(db, { codigo: '001', nome: 'F', ativo: true });
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  return db;
}

test('processarPulso incrementa contagem na sessão ativa', () => {
  const db = setup();
  const broadcasts = [];
  const eventos = [];
  const svc = criarContagemService({
    db,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    broadcast: (ev, p) => broadcasts.push({ ev, p }),
  });
  svc.processarPulso({ cameraId: 1, contagem: 5, total_dia: 5, brilho: 128 });
  const s = buscarAtivaPorCamera(db, 1);
  assert.equal(s.quantidade_total, 5);
  assert.equal(broadcasts[0].ev, 'contagem.incrementada');
});

test('pulso sem sessão ativa é descartado e logado WARN', () => {
  const db = openDatabase(':memory:'); // sem sessão
  const eventos = [];
  const svc = criarContagemService({
    db,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    broadcast: () => {},
  });
  svc.processarPulso({ cameraId: 2, contagem: 1, total_dia: 1, brilho: 0 });
  assert.equal(eventos[0].nivel, 'WARN');
});

test('segundo pulso usa delta absoluto da câmera', () => {
  const db = setup();
  const svc = criarContagemService({
    db, registrarEvento(){}, enfileirarSync(){}, broadcast(){},
  });
  svc.processarPulso({ cameraId: 1, contagem: 5 });
  svc.processarPulso({ cameraId: 1, contagem: 8 });
  const s = buscarAtivaPorCamera(db, 1);
  // usamos valor absoluto da câmera como total
  assert.equal(s.quantidade_total, 8);
});
```

- [ ] **Step 2: Implementar service**

Create `src/domain/contagem-service.js`:

```javascript
import { buscarAtivaPorCamera } from '../db/queries/sessoes.js';

export function criarContagemService({ db, registrarEvento, enfileirarSync, broadcast }) {
  function processarPulso({ cameraId, contagem, total_dia, brilho }) {
    const sessao = buscarAtivaPorCamera(db, cameraId);
    if (!sessao) {
      registrarEvento({
        nivel: 'WARN', categoria: 'CAMERA',
        mensagem: `Pulso recebido em câmera ${cameraId} sem sessão ativa (contagem=${contagem})`,
      });
      return null;
    }
    // Estratégia: total absoluto vindo da câmera sobrescreve local.
    // Câmera zerou via CTR ao abrir sessão, então contagem = total da sessão.
    db.prepare(`UPDATE sessoes_contagem SET quantidade_total = ? WHERE id = ?`).run(contagem, sessao.id);
    broadcast('contagem.incrementada', {
      sessao_id: sessao.id,
      camera_id: cameraId,
      quantidade_total: contagem,
      total_dia,
      brilho,
    });
    // Opcional: registrar o pulso na outbox (baixa prioridade — só o total final importa).
    // Para MVP não enfileiramos cada pulso; sessão final é sincronizada no encerramento.
    return contagem;
  }

  return { processarPulso };
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/contagem-service.test.js`
Expected: `# pass 3`

- [ ] **Step 4: Commit**

```bash
git add src/domain/contagem-service.js tests/contagem-service.test.js
git commit -m "feat(domain): counting service (pulse → session total + broadcast)"
```

---

## Fase 5 — HTTP + WebSocket

### Task 16: WebSocket Hub e bootstrap Fastify

**Files:**
- Create: `src/http/ws-hub.js`
- Create: `src/server.js`
- Create: `src/http/routes/health.js`

- [ ] **Step 1: WS Hub**

Create `src/http/ws-hub.js`:

```javascript
export function criarWSHub(fastify, logger) {
  const clientes = new Set();

  fastify.get('/ws', { websocket: true }, (connection) => {
    clientes.add(connection.socket);
    connection.socket.on('close', () => clientes.delete(connection.socket));
    connection.socket.send(JSON.stringify({ evento: 'hello', ts: Date.now() }));
  });

  function broadcast(evento, payload) {
    const msg = JSON.stringify({ evento, payload, ts: Date.now() });
    for (const ws of clientes) {
      try { ws.send(msg); } catch (e) { logger.warn({ err: e }, 'falha ao enviar WS'); }
    }
  }

  return { broadcast, clientesCount: () => clientes.size };
}
```

- [ ] **Step 2: Rota /health**

Create `src/http/routes/health.js`:

```javascript
import { contarPendentes } from '../../db/queries/outbox.js';
import { ultimoPoll } from '../../db/queries/espelhos.js';

export function rotaHealth(fastify, { db, syncWorker, cameraManagers }) {
  fastify.get('/health', async () => {
    const cameras = [];
    for (const [id, m] of cameraManagers) {
      cameras.push({ id, estado: m.estado });
    }
    return {
      status: 'ok',
      sync: {
        estado: syncWorker.estado,
        outbox_pendentes: contarPendentes(db),
        ultimo_poll_embarques: ultimoPoll(db, 'embarques'),
      },
      cameras,
      uptime_s: Math.round(process.uptime()),
    };
  });
}
```

- [ ] **Step 3: Bootstrap do servidor**

Create `src/server.js`:

```javascript
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import url from 'node:url';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { logger } from './shared/logger.js';
import { getDb } from './db/sqlite.js';
import { enfileirar } from './db/queries/outbox.js';
import { registrarEvento } from './db/queries/eventos.js';
import { KeyenceClient } from './camera/keyence-client.js';
import { CameraManager } from './camera/camera-manager.js';
import { createSupabase, upsertSessao, upsertEvento, buscarAlteracoes } from './sync/supabase-client.js';
import { criarHealthchecker } from './sync/healthcheck.js';
import { criarPusher } from './sync/outbox-pusher.js';
import { criarPoller } from './sync/reverse-poller.js';
import { criarSyncWorker } from './sync/sync-worker.js';
import { criarSessaoService } from './domain/sessao-service.js';
import { criarContagemService } from './domain/contagem-service.js';
import { criarWSHub } from './http/ws-hub.js';
import { rotaHealth } from './http/routes/health.js';
import { rotasEmbarques } from './http/routes/embarques.js';
import { rotasOPs } from './http/routes/ops.js';
import { rotasOperadores } from './http/routes/operadores.js';
import { rotasSessoes } from './http/routes/sessoes.js';
import { rotasProgramas } from './http/routes/programas.js';
import { rotasRelatorios } from './http/routes/relatorios.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function main() {
  const db = getDb(config);
  const fastify = Fastify({ logger });

  await fastify.register(fastifyWebsocket);
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  const wsHub = criarWSHub(fastify, logger);

  // Câmeras
  const cameraManagers = new Map();
  for (const cfg of config.cameras) {
    const client = new KeyenceClient({ ip: cfg.ip, porta: cfg.porta });
    const manager = new CameraManager({ cameraId: cfg.id, client, logger });
    cameraManagers.set(cfg.id, manager);
  }

  // Sync
  const sb = createSupabase(config);
  const healthchecker = criarHealthchecker({
    ping: async () => {
      const { error } = await sb.from('embarques').select('numero_embarque').limit(1);
      if (error) throw error;
    },
    limite: config.sync.failureThreshold,
  });
  const pusher = criarPusher({
    db,
    enviarBatch: async ({ tabela, payload }) => {
      if (tabela === 'sessoes_contagem') await upsertSessao(sb, payload);
      else if (tabela === 'eventos_log') await upsertEvento(sb, { ...payload, origem: 'edge_pc', id_local: payload.id_local });
    },
    logger,
  });
  const poller = criarPoller({
    db,
    buscarAlteracoes: (tabela, cursor) => buscarAlteracoes(sb, tabela, cursor),
    logger,
  });
  const syncWorker = criarSyncWorker({ healthchecker, pusher, poller, logger });
  syncWorker.on('estado', ({ novo }) => wsHub.broadcast('sync.status', { estado: novo }));

  // Helpers que domain usa
  const enfileirarSync = (tabela, payload) => enfileirar(db, tabela, payload);
  const wrapEvento = (ev) => {
    const idLocal = registrarEvento(db, ev);
    enfileirarSync('eventos_log', { ...ev, id_local: idLocal, origem: 'edge_pc' });
  };

  // Domain
  const sessaoService = criarSessaoService({
    db, cameraManagers,
    registrarEvento: wrapEvento,
    enfileirarSync,
    gerarUUID: randomUUID,
    broadcast: wsHub.broadcast,
  });
  const contagemService = criarContagemService({
    db,
    registrarEvento: wrapEvento,
    enfileirarSync,
    broadcast: wsHub.broadcast,
  });

  // Fios: pulsos → contagem
  for (const manager of cameraManagers.values()) {
    manager.on('pulso', (p) => contagemService.processarPulso({
      cameraId: p.cameraId,
      contagem: p.contagem,
      total_dia: p.total_dia,
      brilho: p.brilho,
    }));
    manager.on('estado', (estado) => wsHub.broadcast('camera.estado', { cameraId: manager.cameraId, estado }));
  }

  // Rotas
  rotaHealth(fastify, { db, syncWorker, cameraManagers });
  rotasEmbarques(fastify, { db });
  rotasOPs(fastify, { db });
  rotasOperadores(fastify, { db });
  rotasProgramas(fastify, { cameraManagers });
  rotasSessoes(fastify, { sessaoService });
  rotasRelatorios(fastify, { db });

  // Startup
  await fastify.listen({ host: config.http.host, port: config.http.port });
  logger.info({ port: config.http.port }, 'HTTP ouvindo');

  // Conecta câmeras
  for (const m of cameraManagers.values()) m.conectar().catch(e => logger.warn({ err: e, cameraId: m.cameraId }, 'falha inicial na câmera'));

  // Loop do sync
  setInterval(() => syncWorker.tick().catch(e => logger.error({ err: e }, 'sync tick falhou')), config.sync.pollerIntervalMs);
  syncWorker.tick().catch(()=>{});
}

main().catch(e => { logger.fatal({ err: e }, 'falha fatal'); process.exit(1); });
```

- [ ] **Step 4: Commit (servidor incompleto — rotas nas próximas tasks)**

```bash
git add src/http/ws-hub.js src/http/routes/health.js src/server.js
git commit -m "feat(http): Fastify bootstrap + WebSocket hub + /health endpoint"
```

---

### Task 17: Rotas de leitura (embarques, OPs, operadores, programas)

**Files:**
- Create: `src/http/routes/embarques.js`
- Create: `src/http/routes/ops.js`
- Create: `src/http/routes/operadores.js`
- Create: `src/http/routes/programas.js`

- [ ] **Step 1: Rotas de embarques**

Create `src/http/routes/embarques.js`:

```javascript
import { listarEmbarquesAbertos, buscarEmbarque } from '../../db/queries/espelhos.js';

export function rotasEmbarques(fastify, { db }) {
  fastify.get('/embarques', async (req) => {
    const { status = 'aberto' } = req.query;
    if (status === 'aberto') return listarEmbarquesAbertos(db);
    return db.prepare('SELECT * FROM embarques ORDER BY data_criacao DESC LIMIT 200').all();
  });
  fastify.get('/embarques/:numero', async (req, reply) => {
    const e = buscarEmbarque(db, req.params.numero);
    if (!e) return reply.code(404).send({ erro: 'não encontrado' });
    return e;
  });
}
```

- [ ] **Step 2: Rotas de OPs**

Create `src/http/routes/ops.js`:

```javascript
import { listarOPs, buscarOP } from '../../db/queries/espelhos.js';

export function rotasOPs(fastify, { db }) {
  fastify.get('/ops', async (req) => {
    const q = String(req.query.q ?? '');
    return listarOPs(db, q);
  });
  fastify.get('/ops/:codigo', async (req, reply) => {
    const op = buscarOP(db, req.params.codigo);
    if (!op) return reply.code(404).send({ erro: 'não encontrada' });
    return op;
  });
}
```

- [ ] **Step 3: Rotas de operadores**

Create `src/http/routes/operadores.js`:

```javascript
import { listarOperadoresAtivos, buscarOperador } from '../../db/queries/espelhos.js';

export function rotasOperadores(fastify, { db }) {
  fastify.get('/operadores', async () => listarOperadoresAtivos(db));
  fastify.get('/operadores/:codigo', async (req, reply) => {
    const op = buscarOperador(db, req.params.codigo);
    if (!op) return reply.code(404).send({ erro: 'não encontrado' });
    return op;
  });
}
```

- [ ] **Step 4: Rotas de programas da câmera**

Create `src/http/routes/programas.js`:

```javascript
export function rotasProgramas(fastify, { cameraManagers }) {
  fastify.get('/programas', async (req, reply) => {
    const camera = Number(req.query.camera);
    const q = String(req.query.q ?? '');
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `câmera ${camera} desconhecida` });
    if (m.estado === 'desconectada') return reply.code(503).send({ erro: 'câmera desconectada' });
    if (m.programas.size === 0) {
      try { await m.descobrirProgramas(); }
      catch (e) { return reply.code(500).send({ erro: `falha ao descobrir programas: ${e.message}` }); }
    }
    return q ? m.buscarProgramas(q) : [...m.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/http/routes/embarques.js src/http/routes/ops.js src/http/routes/operadores.js src/http/routes/programas.js
git commit -m "feat(http): read routes for embarques, OPs, operadores, programas"
```

---

### Task 18: Rotas de sessões

**Files:**
- Create: `src/http/routes/sessoes.js`
- Create: `tests/sessoes-routes.test.js`

- [ ] **Step 1: Escrever teste integrado**

Create `tests/sessoes-routes.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';
import { rotasSessoes } from '../src/http/routes/sessoes.js';

async function bootstrap() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1' });
  upsertOperador(db, { codigo: '001', nome: 'F', ativo: true });
  const fakeCamera = {
    cameraId: 1, estado: 'suspensa',
    async ativarSessao(){ this.estado = 'ativa'; },
    async encerrarSessao(){ this.estado = 'suspensa'; },
  };
  const svc = criarSessaoService({
    db, cameraManagers: new Map([[1, fakeCamera]]),
    registrarEvento(){}, enfileirarSync(){}, gerarUUID: () => 'u1', broadcast(){},
  });
  const fastify = Fastify({ logger: false });
  rotasSessoes(fastify, { sessaoService: svc });
  await fastify.ready();
  return { fastify, db };
}

test('POST /sessoes cria sessão', async () => {
  const { fastify } = await bootstrap();
  const r = await fastify.inject({
    method: 'POST', url: '/sessoes',
    payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 },
  });
  assert.equal(r.statusCode, 201);
  const body = r.json();
  assert.equal(body.id, 'u1');
  assert.equal(body.camera_id, 1);
});

test('POST /sessoes/:id/confirmar ativa câmera', async () => {
  const { fastify } = await bootstrap();
  await fastify.inject({ method: 'POST', url: '/sessoes', payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 } });
  const r = await fastify.inject({
    method: 'POST', url: '/sessoes/u1/confirmar',
    payload: { programaNumero: 2, programaNome: 'X' },
  });
  assert.equal(r.statusCode, 200);
});

test('POST /sessoes/:id/encerrar retorna 400 sem caixa', async () => {
  const { fastify } = await bootstrap();
  await fastify.inject({ method: 'POST', url: '/sessoes', payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 } });
  await fastify.inject({ method: 'POST', url: '/sessoes/u1/confirmar', payload: { programaNumero: 2, programaNome: 'X' } });
  const r = await fastify.inject({ method: 'POST', url: '/sessoes/u1/encerrar', payload: {} });
  assert.equal(r.statusCode, 400);
});
```

- [ ] **Step 2: Implementar rotas**

Create `src/http/routes/sessoes.js`:

```javascript
export function rotasSessoes(fastify, { sessaoService }) {
  fastify.get('/sessoes', async (req) => {
    if (req.query.status === 'ativa') return sessaoService.listarAtivas();
    return sessaoService.listarAtivas();
  });

  fastify.post('/sessoes', async (req, reply) => {
    try {
      const s = await sessaoService.abrir(req.body);
      return reply.code(201).send(s);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.post('/sessoes/:id/confirmar', async (req, reply) => {
    try {
      const s = await sessaoService.confirmar(req.params.id, req.body);
      return s;
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.post('/sessoes/:id/encerrar', async (req, reply) => {
    try {
      const s = await sessaoService.encerrar(req.params.id, req.body?.numero_caixa);
      return s;
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });
}
```

- [ ] **Step 3: Rodar testes**

Run: `npm test -- tests/sessoes-routes.test.js`
Expected: `# pass 3`

- [ ] **Step 4: Commit**

```bash
git add src/http/routes/sessoes.js tests/sessoes-routes.test.js
git commit -m "feat(http): session routes (create/confirm/close) with domain integration"
```

---

### Task 19: Rotas de relatórios (PDF, XLSX, CSV)

**Files:**
- Create: `src/http/routes/relatorios.js`

- [ ] **Step 1: Implementar rotas**

Create `src/http/routes/relatorios.js`:

```javascript
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

function coletarSessoesDoEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT s.*, op.item_descricao, op.item_codigo
      FROM sessoes_contagem s
      LEFT JOIN ordens_producao op ON op.codigo_op = s.codigo_op
     WHERE s.numero_embarque = ?
     ORDER BY s.iniciada_em
  `).all(numeroEmbarque);
}

function formatarCSV(sessoes) {
  const head = 'numero_caixa,codigo_op,item_codigo,item_descricao,quantidade_total,operador,iniciada_em,encerrada_em\n';
  const rows = sessoes.map(s => [
    s.numero_caixa ?? '', s.codigo_op, s.item_codigo ?? '', (s.item_descricao ?? '').replaceAll(',', ';'),
    s.quantidade_total, s.codigo_operador, s.iniciada_em, s.encerrada_em ?? '',
  ].join(',')).join('\n');
  return head + rows;
}

async function gerarXLSX(sessoes, numeroEmbarque) {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet(`Embarque ${numeroEmbarque}`);
  sh.columns = [
    { header: 'Caixa', key: 'numero_caixa', width: 12 },
    { header: 'OP', key: 'codigo_op', width: 12 },
    { header: 'Item', key: 'item_codigo', width: 15 },
    { header: 'Descrição', key: 'item_descricao', width: 40 },
    { header: 'Quantidade', key: 'quantidade_total', width: 12 },
    { header: 'Operador', key: 'codigo_operador', width: 12 },
    { header: 'Início', key: 'iniciada_em', width: 22 },
    { header: 'Fim', key: 'encerrada_em', width: 22 },
  ];
  sh.getRow(1).font = { bold: true };
  sessoes.forEach(s => sh.addRow(s));
  return wb.xlsx.writeBuffer();
}

function gerarPDF(sessoes, numeroEmbarque, res) {
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text(`Relatório — Embarque ${numeroEmbarque}`, { align: 'center' });
  doc.moveDown();
  const total = sessoes.reduce((acc, s) => acc + (s.quantidade_total || 0), 0);
  doc.fontSize(10).text(`Total de caixas: ${sessoes.length}    Total de peças: ${total}`);
  doc.moveDown();
  sessoes.forEach(s => {
    doc.fontSize(10).text(
      `Caixa ${s.numero_caixa ?? '-'} | OP ${s.codigo_op} | ${s.item_codigo ?? ''} ${s.item_descricao ?? ''} | Qtd: ${s.quantidade_total} | Op: ${s.codigo_operador}`
    );
  });
  doc.end();
}

export function rotasRelatorios(fastify, { db }) {
  fastify.get('/relatorios/embarque/:numero', async (req, reply) => {
    const fmt = String(req.query.fmt ?? 'pdf').toLowerCase();
    const sessoes = coletarSessoesDoEmbarque(db, req.params.numero);

    if (fmt === 'csv') {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.csv`);
      return formatarCSV(sessoes);
    }
    if (fmt === 'xlsx') {
      const buf = await gerarXLSX(sessoes, req.params.numero);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.xlsx`);
      return reply.send(buf);
    }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.pdf`);
    const { raw: res } = reply;
    gerarPDF(sessoes, req.params.numero, res);
    return reply.hijack();
  });
}
```

- [ ] **Step 2: Smoke test manual**

Run: `npm run dev` (em outro terminal) — sem câmera real, servidor sobe mas ficará tentando reconectar. Acesse:

```
http://localhost:3000/relatorios/embarque/TESTE?fmt=csv
```

Expected: arquivo CSV vazio (só cabeçalho) baixa.

- [ ] **Step 3: Commit**

```bash
git add src/http/routes/relatorios.js
git commit -m "feat(http): report routes (PDF via pdfkit, XLSX via exceljs, CSV)"
```

---

## Fase 6 — Migration 002 do Supabase

### Task 20: Aplicar Migration 002 (programa + caixa única)

**Files:**
- Create: `supabase/migrations/002_programa_camera.sql`

- [ ] **Step 1: Criar migration**

Create `supabase/migrations/002_programa_camera.sql`:

```sql
-- Migration 002: adiciona colunas de programa e caixa única por embarque

ALTER TABLE sistema_contagem.sessoes_contagem
    ADD COLUMN IF NOT EXISTS programa_numero INTEGER,
    ADD COLUMN IF NOT EXISTS programa_nome   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_caixa_unica_por_embarque
    ON sistema_contagem.sessoes_contagem (numero_embarque, numero_caixa)
    WHERE numero_caixa IS NOT NULL;

COMMENT ON COLUMN sistema_contagem.sessoes_contagem.programa_numero IS
    'Número (0-127) do programa da câmera Keyence usado nessa sessão';
COMMENT ON COLUMN sistema_contagem.sessoes_contagem.programa_nome IS
    'Nome legível do programa, cacheado do PNR na hora da abertura';
```

- [ ] **Step 2: Aplicar migration no Supabase**

Ação manual: executar o SQL no painel Supabase (SQL Editor) ou via psql direto contra `https://supabase.pcpsuporterei.site`. Após execução, verificar:

```sql
\d sistema_contagem.sessoes_contagem
```

Expected: colunas `programa_numero` e `programa_nome` presentes; índice `idx_sessoes_caixa_unica_por_embarque` criado.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_programa_camera.sql
git commit -m "feat(db): Supabase migration 002 — programa columns + unique caixa index"
```

---

## Fase 7 — Frontend (Industrial Zen)

### Task 21: Copiar HTMLs do stitch para public/

**Files:**
- Criar estrutura em `public/`
- Copiar HTMLs de `stitch_sistema_contagem_rei_autoparts/industrial_zen/`

- [ ] **Step 1: Listar HTMLs disponíveis no stitch**

Run:
```bash
ls stitch_sistema_contagem_rei_autoparts/industrial_zen/*.html
```

Expected: lista com telas (operador, tv, modais, etc).

- [ ] **Step 2: Organizar em `public/operador/` e `public/tv/`**

Create diretórios:
```bash
mkdir -p public/operador public/tv public/assets public/js
```

Copiar os HTMLs do operador para `public/operador/` e o HTML da TV para `public/tv/index.html`. Fazer ajustes de paths relativos para `/assets/` e `/js/`.

- [ ] **Step 3: Configurar Tailwind via CDN em cada HTML**

Inserir no `<head>` de cada HTML:
```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 4: Commit**

```bash
git add public/
git commit -m "feat(frontend): copy Industrial Zen HTMLs to public/ with Tailwind CDN"
```

---

### Task 22: JS do operador — abertura de sessão

**Files:**
- Create: `public/js/operador-app.js`
- Modify: HTML da tela inicial do operador para incluir `<script src="/js/operador-app.js"></script>`

- [ ] **Step 1: Implementar cliente HTTP + WS**

Create `public/js/operador-app.js`:

```javascript
const API = location.origin;
const ws = new WebSocket(`ws://${location.host}/ws`);

ws.addEventListener('message', (m) => {
  const { evento, payload } = JSON.parse(m.data);
  document.dispatchEvent(new CustomEvent(`ws:${evento}`, { detail: payload }));
});

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ erro: r.statusText }));
    throw new Error(err.erro || r.statusText);
  }
  return r.json();
}

// Dropdowns
export async function carregarEmbarquesAbertos() { return apiGet('/embarques?status=aberto'); }
export async function buscarOPs(q) { return apiGet(`/ops?q=${encodeURIComponent(q)}`); }
export async function carregarOperadores() { return apiGet('/operadores'); }
export async function buscarProgramas(cameraId, q) { return apiGet(`/programas?camera=${cameraId}&q=${encodeURIComponent(q)}`); }

// Ciclo de sessão
export async function abrirSessao(form) {
  return apiPost('/sessoes', form);
}
export async function confirmarSessao(id, programa) {
  return apiPost(`/sessoes/${id}/confirmar`, programa);
}
export async function encerrarSessao(id, numeroCaixa) {
  return apiPost(`/sessoes/${id}/encerrar`, { numero_caixa: numeroCaixa });
}

// Status
async function atualizarHealth() {
  try {
    const h = await apiGet('/health');
    document.dispatchEvent(new CustomEvent('health', { detail: h }));
  } catch (e) { /* ignore */ }
}
setInterval(atualizarHealth, 5000);
atualizarHealth();
```

- [ ] **Step 2: Hook básico no HTML principal**

Criar snippet de exemplo no HTML da tela de abertura (adaptar conforme o stitch):

```html
<script type="module">
  import * as app from '/js/operador-app.js';

  document.addEventListener('ws:sync.status', (e) => {
    const badge = document.getElementById('sync-badge');
    badge.textContent = e.detail.estado;
    badge.className = `badge ${e.detail.estado === 'ONLINE' ? 'verde' : e.detail.estado === 'OFFLINE' ? 'amarelo' : 'azul'}`;
  });

  async function popular() {
    const emb = await app.carregarEmbarquesAbertos();
    document.getElementById('select-embarque').innerHTML =
      emb.map(e => `<option value="${e.numero_embarque}">${e.numero_embarque}</option>`).join('');
  }
  popular();
</script>
```

- [ ] **Step 3: Commit**

```bash
git add public/js/operador-app.js public/operador/
git commit -m "feat(frontend): operator JS client with HTTP + WS for session lifecycle"
```

---

### Task 23: JS da TV (kiosk)

**Files:**
- Create: `public/js/tv-app.js`

- [ ] **Step 1: Implementar cliente da TV**

Create `public/js/tv-app.js`:

```javascript
const ws = new WebSocket(`ws://${location.host}/ws`);

const estado = { cameras: new Map() };

function render() {
  const el = document.getElementById('painel');
  if (!el) return;
  el.innerHTML = [...estado.cameras.values()].map(c => `
    <div class="camera-card">
      <h2 class="camera-id">Câmera ${c.camera_id}</h2>
      <div class="contagem">${c.quantidade_total ?? 0}</div>
      <div class="meta">
        <span>Operador: ${c.codigo_operador ?? '-'}</span>
        <span>OP: ${c.codigo_op ?? '-'}</span>
      </div>
      <div class="progresso">
        <div style="width: ${Math.min(100, (c.progresso ?? 0))}%"></div>
      </div>
    </div>
  `).join('');
}

ws.addEventListener('message', (m) => {
  const { evento, payload } = JSON.parse(m.data);
  if (evento === 'contagem.incrementada') {
    const c = estado.cameras.get(payload.camera_id) ?? { camera_id: payload.camera_id };
    c.quantidade_total = payload.quantidade_total;
    estado.cameras.set(payload.camera_id, c);
    render();
  } else if (evento === 'sessao.atualizada') {
    estado.cameras.set(payload.camera_id, payload);
    render();
  } else if (evento === 'sync.status') {
    document.getElementById('sync-badge').textContent = payload.estado;
  }
});

async function carregarAtivas() {
  const r = await fetch('/sessoes?status=ativa');
  const ativas = await r.json();
  for (const s of ativas) estado.cameras.set(s.camera_id, s);
  render();
}
carregarAtivas();
```

- [ ] **Step 2: Commit**

```bash
git add public/js/tv-app.js public/tv/
git commit -m "feat(frontend): TV kiosk JS consumes WS for real-time counter display"
```

---

## Fase 8 — Ferramentas de dev e ops

### Task 24: Fake Keyence (desenvolvimento sem hardware)

**Files:**
- Create: `scripts/fake-keyence.js`

- [ ] **Step 1: Implementar fake**

Create `scripts/fake-keyence.js`:

```javascript
import net from 'node:net';

const PORTA = Number(process.env.FAKE_PORT ?? 8500);
const PROGRAMAS = new Map([[0, 'PECA-A'], [1, 'PECA-B'], [2, 'PECA-C']]);
let programaAtual = 0;
let oe = 0;
let contagem = 0;
let totalDia = 0;

const servidor = net.createServer((socket) => {
  console.log('cliente conectado', socket.remoteAddress);

  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let idx;
    while ((idx = buf.indexOf(0x0D)) >= 0) {
      const cmd = buf.slice(0, idx).toString('ascii').trim();
      buf = buf.slice(idx + 1);
      responder(socket, cmd);
    }
  });
});

function responder(socket, cmd) {
  const partes = cmd.split(',');
  const c = partes[0];
  if (c === 'PR') return socket.write(`PR,${String(programaAtual).padStart(3, '0')}\r`);
  if (c === 'PNR') return socket.write(`PNR,${PROGRAMAS.get(programaAtual) ?? ''}\r`);
  if (c === 'PW') {
    const n = Number(partes[1] ?? 0);
    programaAtual = n;
    if (PROGRAMAS.has(n)) return socket.write('PW\r');
    return socket.write('ER,PW,22\r');
  }
  if (c === 'CTR') { contagem = 0; return socket.write('CTR\r'); }
  if (c === 'OE') { oe = Number(partes[1] ?? 0); return socket.write('OE\r'); }
  if (c === 'SR') return socket.write('SR,1,0,0,0,0,0,0\r');
  return socket.write(`ER,${c},02\r`);
}

// Loop de pulsos: a cada 800ms, se oe>0, incrementa e emite
setInterval(() => {
  for (const socket of servidor.eventNames().length ? [] : []) {}
}, 1);

// Melhor: broadcast para todos conectados
const clientes = new Set();
servidor.on('connection', (s) => { clientes.add(s); s.on('close', () => clientes.delete(s)); });
setInterval(() => {
  if (oe === 0) return;
  contagem++;
  totalDia++;
  const payload = `02,${String(contagem).padStart(7,'0')},${String(totalDia).padStart(7,'0')},000\r`;
  for (const s of clientes) try { s.write(payload); } catch (_) {}
}, 800);

servidor.listen(PORTA, () => console.log(`fake-keyence ouvindo em ${PORTA}`));
```

- [ ] **Step 2: Testar**

Run (terminal 1): `node scripts/fake-keyence.js`
Run (terminal 2, telnet-like):
```bash
node -e "const n=require('net'); const s=n.connect(8500,'127.0.0.1',()=>{s.write('PR\r'); s.on('data', d=>console.log(d.toString()));})"
```

Expected: resposta `PR,000`

- [ ] **Step 3: Commit**

```bash
git add scripts/fake-keyence.js
git commit -m "feat(dev): fake Keyence TCP server for development without hardware"
```

---

### Task 25: Ping Keyence (verificação com hardware real)

**Files:**
- Create: `scripts/ping-keyence.js`

- [ ] **Step 1: Implementar script interativo**

Create `scripts/ping-keyence.js`:

```javascript
import readline from 'node:readline';
import { KeyenceClient } from '../src/camera/keyence-client.js';

const IP = process.argv[2];
const PORTA = Number(process.argv[3] ?? 8500);
if (!IP) { console.error('uso: node scripts/ping-keyence.js <IP> [porta]'); process.exit(1); }

const client = new KeyenceClient({ ip: IP, porta: PORTA });
client.on('pulso', p => console.log('PULSO:', p));
client.on('raw', r => console.log('RAW:', r));

await client.conectar();
console.log(`conectado a ${IP}:${PORTA}. Digite comandos (PR, PNR, SR, PW,003, OE,1, OE,0, CTR) ou sair.`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async (linha) => {
  const l = linha.trim();
  if (l === 'sair' || l === 'quit') { client.desconectar(); process.exit(0); }
  try {
    const r = await client.enviaComando(l);
    console.log('RESP:', r);
  } catch (e) {
    console.error('ERRO:', e.message);
  }
});
```

- [ ] **Step 2: Smoke test (com fake-keyence rodando)**

Run (terminal 1): `node scripts/fake-keyence.js`
Run (terminal 2): `node scripts/ping-keyence.js 127.0.0.1 8500`
Digitar:
- `PR` → esperado `{comando: 'PR', valores: ['000']}`
- `PW,001` → esperado ack
- `OE,1` → esperado ack + pulsos chegando
- `OE,0` → para de pulsar
- `sair`

- [ ] **Step 3: Commit**

```bash
git add scripts/ping-keyence.js
git commit -m "feat(dev): interactive Keyence ping script for hardware verification"
```

---

### Task 26: Configuração pm2 + kiosk scripts

**Files:**
- Create: `ecosystem.config.cjs`
- Create: `scripts/start-edge.bat`
- Create: `scripts/kiosk-tv.bat`

- [ ] **Step 1: ecosystem.config.cjs**

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'contagem-edge',
    script: './src/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    env: { NODE_ENV: 'production' },
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    time: true,
  }],
};
```

- [ ] **Step 2: Script de boot do Edge**

Create `scripts/start-edge.bat`:

```batch
@echo off
REM Inicia o serviço contagem-edge via pm2 e abre a UI do operador
cd /d "C:\Sistema de Contagem Rei AutoParts"
call pm2 start ecosystem.config.cjs
REM Espera 3s servidor subir
timeout /t 3 /nobreak >nul
REM Monitor 1 — operador (janela normal)
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "http://localhost:3000/operador/"
```

- [ ] **Step 3: Script do kiosk TV**

Create `scripts/kiosk-tv.bat`:

```batch
@echo off
REM Abre Chrome em kiosk no Monitor 2 apontando para a TV
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --start-fullscreen --window-position=1920,0 "http://localhost:3000/tv/"
```

(Ajustar `--window-position` para o offset real do segundo monitor.)

- [ ] **Step 4: Documentar autostart**

Append ao README:

```markdown
## Autostart (Windows)

1. Instalar pm2 globalmente: `npm install -g pm2 pm2-windows-startup`
2. Habilitar autostart: `pm2-startup install` + `pm2 save`
3. Adicionar `scripts/start-edge.bat` e `scripts/kiosk-tv.bat` à pasta `shell:startup` do Windows.
```

- [ ] **Step 5: Commit**

```bash
git add ecosystem.config.cjs scripts/start-edge.bat scripts/kiosk-tv.bat README.md
git commit -m "feat(ops): pm2 ecosystem + Windows kiosk boot scripts"
```

---

## Fase 9 — Verificação end-to-end

### Task 27: Checklist manual E2E

**Files:**
- Create: `docs/checklist-e2e.md`

- [ ] **Step 1: Escrever checklist**

Create `docs/checklist-e2e.md`:

```markdown
# Checklist E2E — Pré-produção

Executar uma vez antes de liberar para produção. Cada ✓ deve ser marcado com evidência (screenshot ou nota).

## Pré-requisitos
- [ ] Supabase acessível (`curl https://supabase.pcpsuporterei.site/rest/v1/`)
- [ ] Supabase com migrations 001 e 002 aplicadas
- [ ] ERP já populou pelo menos 1 embarque aberto e 1 OP
- [ ] Câmera 1 com porta 8500 habilitada + Método de alternação = Painel/PC/Rede/Troca automática
- [ ] (Opcional se testando com 2 câmeras) Câmera 2 com mesma configuração
- [ ] `npm install` executado
- [ ] `.env` preenchido com IP das câmeras e credenciais

## Golden path
- [ ] `npm run dev` → servidor sobe sem erro
- [ ] `curl localhost:3000/health` → retorna JSON com `status=ok`
- [ ] Abrir `http://localhost:3000/operador/` → UI carrega, badge ONLINE verde
- [ ] Dropdown de embarque populado (reverse poller trouxe dados)
- [ ] Dropdown de OP populado
- [ ] Lista de operadores presente
- [ ] Selecionar embarque + OP + operador → sistema aloca câmera 1
- [ ] Pesquisar programa da câmera → lista filtra
- [ ] Selecionar programa → confirmar → câmera física muda programa (conferir no IV Smart Navigator)
- [ ] Passar 5 peças reais → Monitor 2 (TV) mostra 5
- [ ] Passar mais 5 → Monitor 2 mostra 10

## Resiliência
- [ ] Desconectar cabo de rede do Edge PC
- [ ] Badge vira OFFLINE amarelo
- [ ] Passar mais 5 peças → Monitor 2 mostra 15 (contagem segue)
- [ ] Reconectar cabo
- [ ] Badge vira RECOVERY azul → depois ONLINE verde
- [ ] No Supabase: `SELECT quantidade_total FROM sistema_contagem.sessoes_contagem WHERE id = '<uuid>'` → 15

## Encerramento
- [ ] Clicar "Encerrar" → modal pede caixa
- [ ] Informar "CX-001" → sessão encerra, câmera suspende (OE,0)
- [ ] Conferir: câmera não envia mais pulsos (passar peça e verificar que contagem não muda)
- [ ] Abrir nova sessão no mesmo embarque e tentar caixa "CX-001" novamente
- [ ] Sistema bloqueia com mensagem clara

## Relatórios
- [ ] `GET /relatorios/embarque/<n>?fmt=pdf` → baixa PDF válido
- [ ] `GET /relatorios/embarque/<n>?fmt=xlsx` → baixa XLSX válido
- [ ] `GET /relatorios/embarque/<n>?fmt=csv` → baixa CSV válido

## Fechamento de embarque
- [ ] ERP preenche `numero_nota_fiscal` do embarque no Supabase
- [ ] Próximo poll (30s) traz embarque com status=fechado
- [ ] UI esconde o embarque da lista de "abertos"
- [ ] Tentar abrir nova sessão nele → sistema bloqueia
```

- [ ] **Step 2: Commit**

```bash
git add docs/checklist-e2e.md
git commit -m "docs: add pre-production E2E checklist"
```

---

## Self-review do plano

Antes de entregar, verificação rápida:

**Cobertura do spec:**
- Seção 1 (objetivo) → Tasks 1-27 cobrem todos os critérios de sucesso
- Seção 2 (stack) → Task 1 (package.json) + 21 (Tailwind CDN)
- Seção 3 (arquitetura) → Tasks 2-23 mapeiam 1:1 com os 7 módulos
- Seção 4 (dados) → Tasks 3, 6, 20 (migrations locais + espelhos + Supabase migration 002)
- Seção 5 (Keyence) → Tasks 7-9 (parser, client, manager)
- Seção 6 (fluxo operador) → Tasks 14, 18 (sessão service + rotas)
- Seção 7 (sync) → Tasks 10-13 (healthcheck, pusher, poller, worker)
- Seção 8 (API) → Tasks 17, 18, 19 (todas as rotas listadas)
- Seção 9 (testes) → Tasks 24, 25, 27 (fake, ping, checklist)
- Seção 10 (princípios) → enforçados ao longo das tasks

**Consistência de tipos:**
- `cameraId` (number 1/2) usado consistentemente em Camera Manager e Contagem Service
- `status` de sessão sempre string (`ativa`/`encerrada`/`cancelada`)
- Funções do domain retornam `buscarPorId` para pegar estado atual

**Sem placeholders:** cada step tem código ou comando concreto.

---

## Handoff de execução

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-sistema-contagem-rei-autoparts.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — eu despacho um subagente fresco por task, reviso entre tasks, iteração rápida e isolada. Cada task fica limpa e rastreável.

**2. Inline Execution** — executo as tasks nesta sessão usando executing-plans, com checkpoints para sua revisão em lotes.

**Which approach?**
