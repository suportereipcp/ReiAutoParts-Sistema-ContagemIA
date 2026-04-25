# Etiquetas de Caixa ZPL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir e reimprimir etiquetas ZPL auditaveis para caixas ao encerrar sessoes de contagem.

**Architecture:** `sessoes_contagem` continua sendo a fonte historica da caixa. Um service de etiquetas monta um documento logico, o renderer converte esse documento em uma ou mais partes ZPL, e uma fila local tenta enviar as partes para o transporte configurado. O fluxo de sessao nunca e revertido por falha de impressao.

**Tech Stack:** Node.js 20 ESM, Fastify, better-sqlite3, node:test, frontend vanilla JS.

---

## File Structure

- Create: `src/db/migrations/003_etiquetas_caixa.sql`
  - Tabelas SQLite `etiquetas_caixa` e `etiquetas_caixa_partes`.
- Create: `supabase/migrations/003_etiquetas_caixa.sql`
  - Schema equivalente no Supabase, sem execucao automatica.
- Create: `src/db/queries/etiquetas.js`
  - CRUD pequeno para emissoes, partes, status e historico.
- Modify: `src/config.js`
  - Configuracao `labels` e `printer`.
- Modify: `.env.example`
  - Novas variaveis de etiqueta/impressora.
- Create: `src/labels/caixa-label-service.js`
  - Documento logico, persistencia de emissao, reimpressao e chamada da fila.
- Create: `src/labels/zpl-renderer.js`
  - Template ZPL simples, paginacao e sanitizacao basica.
- Create: `src/printer/print-queue.js`
  - Envio de partes pendentes, status agregado e erros.
- Create: `src/printer/transports/tcp.js`
  - Transporte TCP 9100.
- Create: `src/printer/transports/spooler.js`
  - Stub explicito para spooler ainda nao confirmado.
- Create: `src/printer/transports/disabled.js`
  - Modo local: armazena ZPL e marca como pendente sem enviar hardware.
- Create: `src/http/routes/etiquetas.js`
  - Reimpressao, listagem e retry.
- Modify: `src/domain/sessao-service.js`
  - Chamada de emissao automatica apos encerrar.
- Modify: `src/http/routes/sessoes.js`
  - Retorno `{ sessao, etiqueta }`.
- Modify: `src/server.js`
  - Instancia services, fila, transporte e rota.
- Modify: `src/sync/outbox-pusher.js` and `src/server.js`
  - Enviar tabelas de etiqueta para Supabase pelo outbox.
- Modify: `public/js/domain/sessoes-service.js`
  - Normalizar retorno antigo/novo de encerramento.
- Create: `public/js/domain/etiquetas-service.js`
  - Client de reimpressao/listagem/retry.
- Modify: `public/js/app.js`
  - Injetar `etiquetasSvc`.
- Modify: `public/js/ui/composites/tabela-caixas.js`
  - Botao de reimpressao por caixa.
- Modify: `public/js/pages/detalhes-carga.js`
  - Conectar reimpressao e feedback de impressao apos encerramento.

---

### Task 1: Schema e queries de etiquetas

**Files:**
- Create: `src/db/migrations/003_etiquetas_caixa.sql`
- Create: `supabase/migrations/003_etiquetas_caixa.sql`
- Create: `src/db/queries/etiquetas.js`
- Test: `tests/etiquetas-queries.test.js`

- [ ] **Step 1: Write failing query tests**

Create `tests/etiquetas-queries.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  criarEtiquetaCaixa,
  inserirPartesEtiqueta,
  buscarEtiquetaPorId,
  listarPartesPendentes,
  marcarParteImpressa,
  marcarParteErro,
  atualizarStatusEtiquetaPorPartes,
  listarEtiquetasDaCaixa,
} from '../src/db/queries/etiquetas.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  return db;
}

test('cria emissao e partes pendentes', () => {
  const db = criarDb();
  criarEtiquetaCaixa(db, {
    id: 'etq-1',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    sessao_origem_id: 's1',
    codigo_operador: 'OPR',
    motivo: 'encerramento',
    partes_total: 2,
    criada_em: '2026-04-25T10:00:00.000Z',
  });
  inserirPartesEtiqueta(db, 'etq-1', [
    { id: 'p1', parte_numero: 1, partes_total: 2, payload_zpl: '^XA^FDParte 1/2^FS^XZ' },
    { id: 'p2', parte_numero: 2, partes_total: 2, payload_zpl: '^XA^FDParte 2/2^FS^XZ' },
  ], '2026-04-25T10:00:00.000Z');

  assert.equal(buscarEtiquetaPorId(db, 'etq-1').status, 'pendente');
  assert.equal(listarPartesPendentes(db).length, 2);
});

test('atualiza status agregado para impressa quando todas as partes imprimem', () => {
  const db = criarDb();
  criarEtiquetaCaixa(db, {
    id: 'etq-1',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    codigo_operador: 'OPR',
    motivo: 'reimpressao',
    partes_total: 1,
    criada_em: '2026-04-25T10:00:00.000Z',
  });
  inserirPartesEtiqueta(db, 'etq-1', [
    { id: 'p1', parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' },
  ], '2026-04-25T10:00:00.000Z');

  marcarParteImpressa(db, 'p1', '2026-04-25T10:01:00.000Z');
  atualizarStatusEtiquetaPorPartes(db, 'etq-1', '2026-04-25T10:01:00.000Z');

  assert.equal(buscarEtiquetaPorId(db, 'etq-1').status, 'impressa');
});

test('mantem etiqueta em erro quando alguma parte falha', () => {
  const db = criarDb();
  criarEtiquetaCaixa(db, {
    id: 'etq-1',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    codigo_operador: 'OPR',
    motivo: 'reimpressao',
    partes_total: 1,
    criada_em: '2026-04-25T10:00:00.000Z',
  });
  inserirPartesEtiqueta(db, 'etq-1', [
    { id: 'p1', parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' },
  ], '2026-04-25T10:00:00.000Z');

  marcarParteErro(db, 'p1', 'sem impressora');
  atualizarStatusEtiquetaPorPartes(db, 'etq-1', '2026-04-25T10:01:00.000Z');

  const etiqueta = buscarEtiquetaPorId(db, 'etq-1');
  assert.equal(etiqueta.status, 'erro');
  assert.equal(etiqueta.erro_detalhe, 'sem impressora');
});

test('lista emissoes da caixa por data decrescente', () => {
  const db = criarDb();
  criarEtiquetaCaixa(db, {
    id: 'old',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    codigo_operador: 'OPR',
    motivo: 'encerramento',
    partes_total: 1,
    criada_em: '2026-04-25T10:00:00.000Z',
  });
  criarEtiquetaCaixa(db, {
    id: 'new',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    codigo_operador: 'OPR',
    motivo: 'reimpressao',
    partes_total: 1,
    criada_em: '2026-04-25T11:00:00.000Z',
  });

  assert.deepEqual(listarEtiquetasDaCaixa(db, 'E1', 'CX1').map((e) => e.id), ['new', 'old']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/etiquetas-queries.test.js
```

Expected: fail because `src/db/queries/etiquetas.js` and migration `003_etiquetas_caixa.sql` do not exist.

- [ ] **Step 3: Create SQLite migration**

Create `src/db/migrations/003_etiquetas_caixa.sql`:

```sql
CREATE TABLE IF NOT EXISTS etiquetas_caixa (
    id                TEXT PRIMARY KEY,
    numero_embarque   TEXT NOT NULL,
    numero_caixa      TEXT NOT NULL,
    sessao_origem_id  TEXT,
    codigo_operador   TEXT NOT NULL,
    motivo            TEXT NOT NULL CHECK (motivo IN ('encerramento', 'reimpressao')),
    status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    partes_total      INTEGER NOT NULL CHECK (partes_total > 0),
    erro_detalhe      TEXT,
    criada_em         TEXT NOT NULL,
    impressa_em       TEXT,
    FOREIGN KEY (sessao_origem_id) REFERENCES sessoes_contagem(id)
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_lookup
    ON etiquetas_caixa (numero_embarque, numero_caixa, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_status
    ON etiquetas_caixa (status);

CREATE TABLE IF NOT EXISTS etiquetas_caixa_partes (
    id             TEXT PRIMARY KEY,
    etiqueta_id    TEXT NOT NULL REFERENCES etiquetas_caixa(id) ON DELETE CASCADE,
    parte_numero   INTEGER NOT NULL CHECK (parte_numero > 0),
    partes_total   INTEGER NOT NULL CHECK (partes_total > 0),
    payload_zpl    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    tentativas     INTEGER NOT NULL DEFAULT 0,
    erro_detalhe   TEXT,
    criada_em      TEXT NOT NULL,
    impressa_em    TEXT,
    UNIQUE (etiqueta_id, parte_numero)
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_partes_pendentes
    ON etiquetas_caixa_partes (status, criada_em);
```

- [ ] **Step 4: Create Supabase migration**

Create `supabase/migrations/003_etiquetas_caixa.sql`:

```sql
CREATE TABLE IF NOT EXISTS sistema_contagem.etiquetas_caixa (
    id                UUID PRIMARY KEY,
    numero_embarque   TEXT NOT NULL,
    numero_caixa      TEXT NOT NULL,
    sessao_origem_id  UUID,
    codigo_operador   TEXT NOT NULL,
    motivo            TEXT NOT NULL CHECK (motivo IN ('encerramento', 'reimpressao')),
    status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    partes_total      INTEGER NOT NULL CHECK (partes_total > 0),
    erro_detalhe      TEXT,
    criada_em         TIMESTAMPTZ NOT NULL,
    impressa_em       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_lookup
    ON sistema_contagem.etiquetas_caixa (numero_embarque, numero_caixa, criada_em DESC);

CREATE TABLE IF NOT EXISTS sistema_contagem.etiquetas_caixa_partes (
    id             UUID PRIMARY KEY,
    etiqueta_id    UUID NOT NULL REFERENCES sistema_contagem.etiquetas_caixa(id) ON DELETE CASCADE,
    parte_numero   INTEGER NOT NULL CHECK (parte_numero > 0),
    partes_total   INTEGER NOT NULL CHECK (partes_total > 0),
    payload_zpl    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    tentativas     INTEGER NOT NULL DEFAULT 0,
    erro_detalhe   TEXT,
    criada_em      TIMESTAMPTZ NOT NULL,
    impressa_em    TIMESTAMPTZ,
    UNIQUE (etiqueta_id, parte_numero)
);

GRANT ALL ON sistema_contagem.etiquetas_caixa TO service_role;
GRANT ALL ON sistema_contagem.etiquetas_caixa_partes TO service_role;
```

- [ ] **Step 5: Create query module**

Create `src/db/queries/etiquetas.js`:

```js
export function criarEtiquetaCaixa(db, dados) {
  db.prepare(`
    INSERT INTO etiquetas_caixa (
      id, numero_embarque, numero_caixa, sessao_origem_id,
      codigo_operador, motivo, status, partes_total, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)
  `).run(
    dados.id,
    dados.numero_embarque,
    dados.numero_caixa,
    dados.sessao_origem_id ?? null,
    dados.codigo_operador,
    dados.motivo,
    dados.partes_total,
    dados.criada_em
  );
}

export function inserirPartesEtiqueta(db, etiquetaId, partes, criadaEm) {
  const stmt = db.prepare(`
    INSERT INTO etiquetas_caixa_partes (
      id, etiqueta_id, parte_numero, partes_total, payload_zpl, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const parte of partes) {
      stmt.run(parte.id, etiquetaId, parte.parte_numero, parte.partes_total, parte.payload_zpl, criadaEm);
    }
  });
  tx();
}

export function buscarEtiquetaPorId(db, id) {
  return db.prepare(`SELECT * FROM etiquetas_caixa WHERE id = ?`).get(id);
}

export function listarEtiquetasDaCaixa(db, numeroEmbarque, numeroCaixa) {
  return db.prepare(`
    SELECT * FROM etiquetas_caixa
     WHERE numero_embarque = ?
       AND numero_caixa = ?
     ORDER BY criada_em DESC
  `).all(numeroEmbarque, numeroCaixa);
}

export function listarPartesPendentes(db, limite = 50) {
  return db.prepare(`
    SELECT p.*, e.numero_embarque, e.numero_caixa
      FROM etiquetas_caixa_partes p
      JOIN etiquetas_caixa e ON e.id = p.etiqueta_id
     WHERE p.status = 'pendente'
     ORDER BY p.criada_em, p.parte_numero
     LIMIT ?
  `).all(limite);
}

export function marcarParteImpressa(db, parteId, impressaEm) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'impressa',
           tentativas = tentativas + 1,
           erro_detalhe = NULL,
           impressa_em = ?
     WHERE id = ?
  `).run(impressaEm, parteId);
}

export function marcarParteErro(db, parteId, erroDetalhe) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'erro',
           tentativas = tentativas + 1,
           erro_detalhe = ?
     WHERE id = ?
  `).run(erroDetalhe, parteId);
}

export function recolocarPartesErroNaFila(db, etiquetaId) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'pendente',
           erro_detalhe = NULL
     WHERE etiqueta_id = ?
       AND status = 'erro'
  `).run(etiquetaId);
  db.prepare(`
    UPDATE etiquetas_caixa
       SET status = 'pendente',
           erro_detalhe = NULL
     WHERE id = ?
  `).run(etiquetaId);
}

export function atualizarStatusEtiquetaPorPartes(db, etiquetaId, impressaEm) {
  const resumo = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) AS erros,
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'impressa' THEN 1 ELSE 0 END) AS impressas,
      COUNT(*) AS total,
      MAX(erro_detalhe) AS erro_detalhe
    FROM etiquetas_caixa_partes
    WHERE etiqueta_id = ?
  `).get(etiquetaId);

  if (resumo.erros > 0) {
    db.prepare(`
      UPDATE etiquetas_caixa
         SET status = 'erro',
             erro_detalhe = ?
       WHERE id = ?
    `).run(resumo.erro_detalhe, etiquetaId);
    return;
  }

  if (resumo.total > 0 && resumo.impressas === resumo.total) {
    db.prepare(`
      UPDATE etiquetas_caixa
         SET status = 'impressa',
             erro_detalhe = NULL,
             impressa_em = ?
       WHERE id = ?
    `).run(impressaEm, etiquetaId);
  }
}
```

- [ ] **Step 6: Run query tests**

Run:

```bash
node --test tests/etiquetas-queries.test.js
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/db/migrations/003_etiquetas_caixa.sql supabase/migrations/003_etiquetas_caixa.sql src/db/queries/etiquetas.js tests/etiquetas-queries.test.js
git commit -m "feat: add caixa label persistence"
```

---

### Task 2: Configuracao de etiquetas e renderer ZPL

**Files:**
- Modify: `src/config.js`
- Modify: `.env.example`
- Create: `src/labels/zpl-renderer.js`
- Test: `tests/config.test.js`
- Test: `tests/zpl-renderer.test.js`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/zpl-renderer.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderizarEtiquetaCaixaZpl } from '../src/labels/zpl-renderer.js';

const documento = {
  numero_embarque: 'E1',
  numero_caixa: 'CX1',
  numero_caixa_exibicao: 'CX1',
  gerada_em: '2026-04-25T10:00:00.000Z',
  motivo: 'encerramento',
  operador_emissao: 'OPR1',
  linhas: [
    {
      ordem: 1,
      sessao_id: 's1',
      codigo_op: 'OP1',
      item_codigo: 'IT1',
      item_descricao: 'Peca dianteira acentuada',
      quantidade_total: 12,
      codigo_operador: 'OPR1',
      iniciada_em: '2026-04-25T09:00:00.000Z',
      encerrada_em: '2026-04-25T10:00:00.000Z',
    },
    {
      ordem: 2,
      sessao_id: 's2',
      codigo_op: 'OP1',
      item_codigo: 'IT1',
      item_descricao: 'Peca dianteira acentuada',
      quantidade_total: 3,
      codigo_operador: 'OPR2',
      iniciada_em: '2026-04-25T11:00:00.000Z',
      encerrada_em: '2026-04-25T11:30:00.000Z',
    },
  ],
};

test('gera ZPL completo com cabecalho e linhas', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 10, larguraDots: 812, alturaDots: 609 });
  assert.equal(partes.length, 1);
  assert.match(partes[0].payload_zpl, /^\^XA/);
  assert.match(partes[0].payload_zpl, /\^XZ$/);
  assert.match(partes[0].payload_zpl, /Caixa: CX1/);
  assert.match(partes[0].payload_zpl, /Parte 1\/1/);
  assert.match(partes[0].payload_zpl, /1 OP1 IT1 QTD 12 OPR OPR1/);
});

test('pagina quando excede limite de linhas', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 1, larguraDots: 812, alturaDots: 609 });
  assert.equal(partes.length, 2);
  assert.match(partes[0].payload_zpl, /Parte 1\/2/);
  assert.match(partes[1].payload_zpl, /Parte 2\/2/);
});

test('remove caracteres fora de ASCII para ZPL inicial', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 10, larguraDots: 812, alturaDots: 609 });
  assert.doesNotMatch(partes[0].payload_zpl, /ç|ã|é|í|ó|ú/);
});
```

- [ ] **Step 2: Extend config test**

Add to `tests/config.test.js`:

```js
test('loadConfig carrega configuracao de etiquetas', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'secret',
    CAMERA_1_IP: '127.0.0.1',
    CAMERA_2_IP: '127.0.0.2',
    LABEL_PRINTER_ENABLED: 'true',
    LABEL_PRINTER_MODE: 'tcp',
    LABEL_PRINTER_HOST: '192.168.0.50',
    LABEL_PRINTER_PORT: '9100',
    LABEL_DPI: '203',
    LABEL_WIDTH_DOTS: '812',
    LABEL_HEIGHT_DOTS: '609',
    LABEL_LINES_PER_PART: '8',
  });

  assert.deepEqual(cfg.labels, {
    dpi: 203,
    widthDots: 812,
    heightDots: 609,
    linesPerPart: 8,
    template: 'caixa-default',
  });
  assert.deepEqual(cfg.printer, {
    enabled: true,
    mode: 'tcp',
    host: '192.168.0.50',
    port: 9100,
    name: undefined,
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
node --test tests/zpl-renderer.test.js tests/config.test.js
```

Expected: fail because renderer and config keys are missing.

- [ ] **Step 4: Implement config**

Modify `src/config.js` by adding to the returned object:

```js
    labels: {
      dpi: Number(env.LABEL_DPI ?? 203),
      widthDots: Number(env.LABEL_WIDTH_DOTS ?? 812),
      heightDots: Number(env.LABEL_HEIGHT_DOTS ?? 609),
      linesPerPart: Number(env.LABEL_LINES_PER_PART ?? 10),
      template: env.LABEL_TEMPLATE ?? 'caixa-default',
    },
    printer: {
      enabled: String(env.LABEL_PRINTER_ENABLED ?? 'false').toLowerCase() === 'true',
      mode: env.LABEL_PRINTER_MODE ?? 'disabled',
      host: env.LABEL_PRINTER_HOST,
      port: Number(env.LABEL_PRINTER_PORT ?? 9100),
      name: env.LABEL_PRINTER_NAME,
    },
```

- [ ] **Step 5: Update env example**

Append to `.env.example`:

```env
LABEL_PRINTER_ENABLED=false
LABEL_PRINTER_MODE=disabled
LABEL_PRINTER_HOST=
LABEL_PRINTER_PORT=9100
LABEL_PRINTER_NAME=
LABEL_DPI=203
LABEL_WIDTH_DOTS=812
LABEL_HEIGHT_DOTS=609
LABEL_LINES_PER_PART=10
LABEL_TEMPLATE=caixa-default
```

- [ ] **Step 6: Implement renderer**

Create `src/labels/zpl-renderer.js`:

```js
function ascii(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 80);
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function linhaZpl(linha, y) {
  const texto = `${linha.ordem} ${linha.codigo_op} ${linha.item_codigo ?? ''} QTD ${linha.quantidade_total} OPR ${linha.codigo_operador}`;
  const desc = ascii(linha.item_descricao);
  return [
    `^FO30,${y}^A0N,26,26^FD${ascii(texto)}^FS`,
    `^FO30,${y + 30}^A0N,20,20^FD${desc}^FS`,
  ].join('\n');
}

export function renderizarEtiquetaCaixaZpl(documento, config = {}) {
  const linhasPorParte = Number(config.linhasPorParte ?? 10);
  const largura = Number(config.larguraDots ?? 812);
  const altura = Number(config.alturaDots ?? 609);
  const grupos = chunks(documento.linhas, linhasPorParte);
  const total = Math.max(grupos.length, 1);

  return grupos.map((linhas, index) => {
    const parte = index + 1;
    const corpo = linhas.map((linha, linhaIndex) => linhaZpl(linha, 170 + linhaIndex * 62)).join('\n');
    const payload_zpl = [
      '^XA',
      '^CI27',
      `^PW${largura}`,
      `^LL${altura}`,
      '^FO30,25^A0N,34,34^FDETIQUETA DE CAIXA^FS',
      `^FO30,70^A0N,28,28^FDCaixa: ${ascii(documento.numero_caixa_exibicao)}^FS`,
      `^FO30,105^A0N,22,22^FDEmbarque: ${ascii(documento.numero_embarque)}^FS`,
      `^FO30,132^A0N,22,22^FDParte ${parte}/${total} - ${ascii(documento.motivo)}^FS`,
      corpo,
      `^FO30,${altura - 45}^A0N,20,20^FDGerada: ${ascii(documento.gerada_em)} OPR ${ascii(documento.operador_emissao)}^FS`,
      '^XZ',
    ].join('\n');
    return { parte_numero: parte, partes_total: total, payload_zpl };
  });
}
```

- [ ] **Step 7: Run tests**

Run:

```bash
node --test tests/zpl-renderer.test.js tests/config.test.js
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/config.js .env.example src/labels/zpl-renderer.js tests/config.test.js tests/zpl-renderer.test.js
git commit -m "feat: add configurable zpl label renderer"
```

---

### Task 3: Print queue e transportes

**Files:**
- Create: `src/printer/print-queue.js`
- Create: `src/printer/transports/disabled.js`
- Create: `src/printer/transports/tcp.js`
- Create: `src/printer/transports/spooler.js`
- Test: `tests/print-queue.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/print-queue.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarEtiquetaCaixa, inserirPartesEtiqueta, buscarEtiquetaPorId } from '../src/db/queries/etiquetas.js';
import { criarPrintQueue } from '../src/printer/print-queue.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  criarEtiquetaCaixa(db, {
    id: 'etq-1',
    numero_embarque: 'E1',
    numero_caixa: 'CX1',
    codigo_operador: 'OPR',
    motivo: 'encerramento',
    partes_total: 1,
    criada_em: '2026-04-25T10:00:00.000Z',
  });
  inserirPartesEtiqueta(db, 'etq-1', [
    { id: 'p1', parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' },
  ], '2026-04-25T10:00:00.000Z');
  return db;
}

test('marca etiqueta como impressa quando transporte envia parte', async () => {
  const db = criarDb();
  const enviados = [];
  const queue = criarPrintQueue({
    db,
    transport: { enviar: async (payload) => enviados.push(payload) },
    now: () => '2026-04-25T10:01:00.000Z',
  });

  await queue.processarPendentes();

  assert.deepEqual(enviados, ['^XA^XZ']);
  assert.equal(buscarEtiquetaPorId(db, 'etq-1').status, 'impressa');
});

test('marca etiqueta como erro quando transporte falha', async () => {
  const db = criarDb();
  const queue = criarPrintQueue({
    db,
    transport: { enviar: async () => { throw new Error('offline'); } },
    now: () => '2026-04-25T10:01:00.000Z',
  });

  await queue.processarPendentes();

  const etiqueta = buscarEtiquetaPorId(db, 'etq-1');
  assert.equal(etiqueta.status, 'erro');
  assert.equal(etiqueta.erro_detalhe, 'offline');
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
node --test tests/print-queue.test.js
```

Expected: fail because `src/printer/print-queue.js` does not exist.

- [ ] **Step 3: Implement print queue**

Create `src/printer/print-queue.js`:

```js
import {
  listarPartesPendentes,
  marcarParteImpressa,
  marcarParteErro,
  atualizarStatusEtiquetaPorPartes,
} from '../db/queries/etiquetas.js';

export function criarPrintQueue({ db, transport, now = () => new Date().toISOString(), logger } = {}) {
  async function processarPendentes({ limite = 50 } = {}) {
    const partes = listarPartesPendentes(db, limite);
    for (const parte of partes) {
      try {
        await transport.enviar(parte.payload_zpl, parte);
        const instante = now();
        marcarParteImpressa(db, parte.id, instante);
        atualizarStatusEtiquetaPorPartes(db, parte.etiqueta_id, instante);
      } catch (e) {
        marcarParteErro(db, parte.id, e.message);
        atualizarStatusEtiquetaPorPartes(db, parte.etiqueta_id, now());
        logger?.warn?.({ err: e, parteId: parte.id }, 'falha ao imprimir etiqueta');
      }
    }
  }

  return { processarPendentes };
}
```

- [ ] **Step 4: Implement transports**

Create `src/printer/transports/disabled.js`:

```js
export function criarDisabledTransport() {
  return {
    async enviar() {
      throw new Error('impressao desabilitada');
    },
  };
}
```

Create `src/printer/transports/spooler.js`:

```js
export function criarSpoolerTransport() {
  return {
    async enviar() {
      throw new Error('transporte spooler ainda nao configurado');
    },
  };
}
```

Create `src/printer/transports/tcp.js`:

```js
import net from 'node:net';

export function criarTcpTransport({ host, port = 9100, timeoutMs = 5000 } = {}) {
  return {
    enviar(payload) {
      if (!host) throw new Error('LABEL_PRINTER_HOST ausente');
      return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.write(payload, 'utf8', () => socket.end());
        });
        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout ao enviar ZPL'));
        });
        socket.on('error', reject);
        socket.on('close', (hadError) => {
          if (!hadError) resolve();
        });
      });
    },
  };
}
```

- [ ] **Step 5: Run tests**

```bash
node --test tests/print-queue.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/printer tests/print-queue.test.js
git commit -m "feat: add label print queue"
```

---

### Task 4: Caixa label service

**Files:**
- Create: `src/labels/caixa-label-service.js`
- Test: `tests/caixa-label-service.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/caixa-label-service.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarCaixaLabelService } from '../src/labels/caixa-label-service.js';
import { buscarEtiquetaPorId, listarEtiquetasDaCaixa } from '../src/db/queries/etiquetas.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E1', 'aberto')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1), ('B', 'Bruno', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total, iniciada_em, encerrada_em, status)
    VALUES
      ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 10, '2026-04-25T08:00:00.000Z', '2026-04-25T09:00:00.000Z', 'encerrada'),
      ('s2', 'E1', 'OP1', 'B', 2, 'CX1', 5, '2026-04-25T10:00:00.000Z', '2026-04-25T11:00:00.000Z', 'encerrada')
  `).run();
  return db;
}

test('monta documento logico em ordem cronologica', () => {
  const db = criarDb();
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { linesPerPart: 10, widthDots: 812, heightDots: 609 },
    now: () => '2026-04-25T12:00:00.000Z',
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });

  assert.deepEqual(doc.linhas.map((l) => l.sessao_id), ['s1', 's2']);
  assert.deepEqual(doc.linhas.map((l) => l.ordem), [1, 2]);
});

test('cria emissao e partes para reimpressao', async () => {
  const db = criarDb();
  let n = 0;
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => `id-${++n}`,
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { linesPerPart: 10, widthDots: 812, heightDots: 609 },
    now: () => '2026-04-25T12:00:00.000Z',
  });

  const resumo = await service.reimprimir({ numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' });

  assert.equal(resumo.status, 'pendente');
  assert.equal(resumo.partes_total, 1);
  assert.equal(buscarEtiquetaPorId(db, resumo.id).motivo, 'reimpressao');
  assert.equal(listarEtiquetasDaCaixa(db, 'E1', 'CX1').length, 1);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
node --test tests/caixa-label-service.test.js
```

Expected: fail because service does not exist.

- [ ] **Step 3: Implement service**

Create `src/labels/caixa-label-service.js`:

```js
import { criarEtiquetaCaixa, inserirPartesEtiqueta, buscarEtiquetaPorId } from '../db/queries/etiquetas.js';
import { rotuloCaixa } from '../../public/js/domain/caixas.js';

function resumir(etiqueta) {
  if (!etiqueta) return null;
  return { id: etiqueta.id, status: etiqueta.status, partes_total: etiqueta.partes_total };
}

export function criarCaixaLabelService({
  db,
  gerarUUID,
  renderizar,
  printQueue,
  labelsConfig,
  now = () => new Date().toISOString(),
  enfileirarSync,
} = {}) {
  function montarDocumento({ numero_embarque, numero_caixa, motivo, codigo_operador }) {
    const sessoes = db.prepare(`
      SELECT s.*, op.item_codigo, op.item_descricao
        FROM sessoes_contagem s
        LEFT JOIN ordens_producao op ON op.codigo_op = s.codigo_op
       WHERE s.numero_embarque = ?
         AND s.numero_caixa = ?
         AND s.status = 'encerrada'
       ORDER BY s.encerrada_em ASC, s.iniciada_em ASC
    `).all(numero_embarque, numero_caixa);

    if (sessoes.length === 0) throw new Error('Caixa sem historico encerrado para etiqueta.');

    return {
      numero_embarque,
      numero_caixa,
      numero_caixa_exibicao: rotuloCaixa(numero_caixa),
      gerada_em: now(),
      motivo,
      operador_emissao: codigo_operador,
      linhas: sessoes.map((sessao, index) => ({
        ordem: index + 1,
        sessao_id: sessao.id,
        codigo_op: sessao.codigo_op,
        item_codigo: sessao.item_codigo,
        item_descricao: sessao.item_descricao,
        quantidade_total: sessao.quantidade_total,
        codigo_operador: sessao.codigo_operador,
        iniciada_em: sessao.iniciada_em,
        encerrada_em: sessao.encerrada_em,
      })),
    };
  }

  async function emitir({ numero_embarque, numero_caixa, sessao_origem_id = null, codigo_operador, motivo }) {
    const documento = montarDocumento({ numero_embarque, numero_caixa, motivo, codigo_operador });
    const partes = renderizar(documento, {
      linhasPorParte: labelsConfig.linesPerPart,
      larguraDots: labelsConfig.widthDots,
      alturaDots: labelsConfig.heightDots,
    });
    const etiquetaId = gerarUUID();
    const criadaEm = documento.gerada_em;
    const partesComId = partes.map((parte) => ({ ...parte, id: gerarUUID() }));

    criarEtiquetaCaixa(db, {
      id: etiquetaId,
      numero_embarque,
      numero_caixa,
      sessao_origem_id,
      codigo_operador,
      motivo,
      partes_total: partes.length,
      criada_em: criadaEm,
    });
    inserirPartesEtiqueta(db, etiquetaId, partesComId, criadaEm);
    const etiqueta = buscarEtiquetaPorId(db, etiquetaId);
    enfileirarSync?.('etiquetas_caixa', etiqueta);
    await printQueue.processarPendentes();
    return resumir(buscarEtiquetaPorId(db, etiquetaId));
  }

  function emitirPorEncerramento(sessao) {
    return emitir({
      numero_embarque: sessao.numero_embarque,
      numero_caixa: sessao.numero_caixa,
      sessao_origem_id: sessao.id,
      codigo_operador: sessao.codigo_operador,
      motivo: 'encerramento',
    });
  }

  function reimprimir({ numero_embarque, numero_caixa, codigo_operador }) {
    return emitir({ numero_embarque, numero_caixa, codigo_operador, motivo: 'reimpressao' });
  }

  return { montarDocumento, emitirPorEncerramento, reimprimir };
}
```

- [ ] **Step 4: Run tests**

```bash
node --test tests/caixa-label-service.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/labels/caixa-label-service.js tests/caixa-label-service.test.js
git commit -m "feat: add caixa label service"
```

---

### Task 5: Integrar encerramento de sessao com etiqueta automatica

**Files:**
- Modify: `src/domain/sessao-service.js`
- Modify: `src/http/routes/sessoes.js`
- Modify: `src/server.js`
- Test: `tests/sessao-service.test.js`
- Test: `tests/sessoes-routes.test.js`

- [ ] **Step 1: Add failing service test**

Add to `tests/sessao-service.test.js`:

```js
test('encerrar emite etiqueta sem reverter sessao quando impressao falha', async () => {
  const ctx = criarContexto();
  let chamada = false;
  const service = criarSessaoService({
    ...ctx.deps,
    caixaLabelService: {
      emitirPorEncerramento: async () => {
        chamada = true;
        throw new Error('offline');
      },
    },
  });

  const aberta = await service.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: 'A', camera_id: 1 });
  const resposta = await service.encerrar(aberta.id, { numero_caixa: 'CX1' });

  assert.equal(chamada, true);
  assert.equal(resposta.sessao.status, 'encerrada');
  assert.equal(resposta.etiqueta.status, 'erro');
  assert.equal(resposta.etiqueta.erro, 'offline');
});
```

Adjust helper names to match the existing test file. Keep the assertion target: `resposta.sessao.status` and `resposta.etiqueta.status`.

- [ ] **Step 2: Add failing route test**

Add to `tests/sessoes-routes.test.js`:

```js
test('POST /sessoes/:id/encerrar retorna sessao e etiqueta', async () => {
  const app = await criarAppDeTeste({
    sessaoService: {
      encerrar: async () => ({
        sessao: { id: 's1', status: 'encerrada', numero_caixa: 'CX1' },
        etiqueta: { id: 'etq-1', status: 'pendente', partes_total: 1 },
      }),
    },
  });

  const res = await app.inject({
    method: 'POST',
    url: '/sessoes/s1/encerrar',
    payload: { numero_caixa: 'CX1' },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body).etiqueta, { id: 'etq-1', status: 'pendente', partes_total: 1 });
});
```

- [ ] **Step 3: Run focused tests to verify failure**

```bash
node --test tests/sessao-service.test.js tests/sessoes-routes.test.js
```

Expected: fail because `encerrar` still returns only the session or route test helper lacks the new shape.

- [ ] **Step 4: Modify session service**

Modify `src/domain/sessao-service.js`:

```js
export function criarSessaoService({ db, cameraManagers, registrarEvento, enfileirarSync, gerarUUID, broadcast, caixaLabelService }) {
```

Inside `encerrar`, replace the final `return final;` with:

```js
    let etiqueta = null;
    if (caixaLabelService?.emitirPorEncerramento) {
      try {
        etiqueta = await caixaLabelService.emitirPorEncerramento(final);
      } catch (e) {
        etiqueta = { status: 'erro', erro: e.message, partes_total: 0 };
        registrarEvento({
          nivel: 'WARN',
          categoria: 'SISTEMA',
          mensagem: `Etiqueta da caixa ${_rotuloCaixa(caixaId)} não impressa: ${e.message}`,
          codigo_operador: s.codigo_operador,
        });
      }
    }
    return { sessao: final, etiqueta };
```

- [ ] **Step 5: Route keeps new shape**

Modify `src/http/routes/sessoes.js` only if needed. The route can return the service result directly:

```js
const resultado = await sessaoService.encerrar(req.params.id, req.body);
return resultado;
```

- [ ] **Step 6: Wire server services**

Modify `src/server.js` imports and initialization:

```js
import { criarCaixaLabelService } from './labels/caixa-label-service.js';
import { renderizarEtiquetaCaixaZpl } from './labels/zpl-renderer.js';
import { criarPrintQueue } from './printer/print-queue.js';
import { criarDisabledTransport } from './printer/transports/disabled.js';
import { criarTcpTransport } from './printer/transports/tcp.js';
import { criarSpoolerTransport } from './printer/transports/spooler.js';
```

Before creating `sessaoService`:

```js
  const printerTransport = !config.printer.enabled
    ? criarDisabledTransport()
    : config.printer.mode === 'tcp'
      ? criarTcpTransport({ host: config.printer.host, port: config.printer.port })
      : criarSpoolerTransport({ name: config.printer.name });

  const printQueue = criarPrintQueue({ db, transport: printerTransport, logger });
  const caixaLabelService = criarCaixaLabelService({
    db,
    gerarUUID: randomUUID,
    renderizar: renderizarEtiquetaCaixaZpl,
    printQueue,
    labelsConfig: config.labels,
    enfileirarSync,
  });
```

Pass into `criarSessaoService`:

```js
    caixaLabelService,
```

- [ ] **Step 7: Run focused tests**

```bash
node --test tests/sessao-service.test.js tests/sessoes-routes.test.js
```

Expected: all focused tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/domain/sessao-service.js src/http/routes/sessoes.js src/server.js tests/sessao-service.test.js tests/sessoes-routes.test.js
git commit -m "feat: emit labels when closing sessions"
```

---

### Task 6: API de etiquetas e retry

**Files:**
- Create: `src/http/routes/etiquetas.js`
- Modify: `src/server.js`
- Test: `tests/etiquetas-routes.test.js`

- [ ] **Step 1: Write failing route tests**

Create `tests/etiquetas-routes.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasEtiquetas } from '../src/http/routes/etiquetas.js';

test('POST /etiquetas/caixas cria reimpressao', async () => {
  const app = Fastify();
  rotasEtiquetas(app, {
    caixaLabelService: {
      reimprimir: async (payload) => ({ id: 'etq-1', status: 'pendente', partes_total: 1, payload }),
    },
    etiquetasQueries: {
      listarEtiquetasDaCaixa: () => [],
      retryEtiqueta: () => null,
    },
  });

  const res = await app.inject({
    method: 'POST',
    url: '/etiquetas/caixas',
    payload: { numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(JSON.parse(res.body).id, 'etq-1');
});

test('POST /etiquetas/caixas valida campos obrigatorios', async () => {
  const app = Fastify();
  rotasEtiquetas(app, {
    caixaLabelService: { reimprimir: async () => ({}) },
    etiquetasQueries: { listarEtiquetasDaCaixa: () => [], retryEtiqueta: () => null },
  });

  const res = await app.inject({ method: 'POST', url: '/etiquetas/caixas', payload: { numero_embarque: 'E1' } });

  assert.equal(res.statusCode, 400);
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
node --test tests/etiquetas-routes.test.js
```

Expected: fail because route does not exist.

- [ ] **Step 3: Implement route**

Create `src/http/routes/etiquetas.js`:

```js
import { listarEtiquetasDaCaixa, recolocarPartesErroNaFila, buscarEtiquetaPorId } from '../../db/queries/etiquetas.js';

export function rotasEtiquetas(fastify, { db, caixaLabelService, printQueue, etiquetasQueries } = {}) {
  const queries = etiquetasQueries ?? {
    listarEtiquetasDaCaixa: (numeroEmbarque, numeroCaixa) => listarEtiquetasDaCaixa(db, numeroEmbarque, numeroCaixa),
    retryEtiqueta: async (id) => {
      recolocarPartesErroNaFila(db, id);
      await printQueue?.processarPendentes();
      return buscarEtiquetaPorId(db, id);
    },
  };

  fastify.post('/etiquetas/caixas', async (req, reply) => {
    try {
      const { numero_embarque, numero_caixa, codigo_operador } = req.body ?? {};
      if (!numero_embarque || !numero_caixa || !codigo_operador) {
        return reply.code(400).send({ erro: 'numero_embarque, numero_caixa e codigo_operador são obrigatórios.' });
      }
      const etiqueta = await caixaLabelService.reimprimir({ numero_embarque, numero_caixa, codigo_operador });
      return reply.code(201).send(etiqueta);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.get('/etiquetas/caixas', async (req, reply) => {
    const { embarque, caixa } = req.query;
    if (!embarque || !caixa) return reply.code(400).send({ erro: 'embarque e caixa são obrigatórios.' });
    return queries.listarEtiquetasDaCaixa(embarque, caixa);
  });

  fastify.post('/etiquetas/:id/retry', async (req, reply) => {
    try {
      return await queries.retryEtiqueta(req.params.id);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });
}
```

- [ ] **Step 4: Wire server route**

Modify `src/server.js`:

```js
import { rotasEtiquetas } from './http/routes/etiquetas.js';
```

Register after session routes:

```js
  rotasEtiquetas(fastify, { db, caixaLabelService, printQueue });
```

- [ ] **Step 5: Run route tests**

```bash
node --test tests/etiquetas-routes.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/http/routes/etiquetas.js src/server.js tests/etiquetas-routes.test.js
git commit -m "feat: add label reprint api"
```

---

### Task 7: Frontend de reimpressao e feedback

**Files:**
- Create: `public/js/domain/etiquetas-service.js`
- Modify: `public/js/app.js`
- Modify: `public/js/domain/sessoes-service.js`
- Modify: `public/js/ui/composites/tabela-caixas.js`
- Modify: `public/js/pages/detalhes-carga.js`
- Test: `tests/frontend/domain/etiquetas-service.test.js`
- Test: `tests/frontend/domain/sessoes-service.test.js`
- Test: `tests/frontend/ui/tabela-caixas.test.js`
- Test: `tests/frontend/pages/detalhes-carga.test.js`

- [ ] **Step 1: Create failing frontend service test**

Create `tests/frontend/domain/etiquetas-service.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { criarEtiquetasService } from '../../../public/js/domain/etiquetas-service.js';

test('reimprimir chama API de etiquetas', async () => {
  const chamadas = [];
  const svc = criarEtiquetasService({
    api: { post: async (url, body) => { chamadas.push({ url, body }); return { id: 'etq-1' }; } },
  });

  const res = await svc.reimprimirCaixa({ numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' });

  assert.equal(res.id, 'etq-1');
  assert.deepEqual(chamadas, [{
    url: '/etiquetas/caixas',
    body: { numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' },
  }]);
});
```

- [ ] **Step 2: Add failing table test**

Add to `tests/frontend/ui/tabela-caixas.test.js`:

```js
test('TabelaCaixas renderiza acao de reimpressao', () => {
  let caixaClicada = null;
  const el = TabelaCaixas({
    caixas: [{ id: 'CX1', numero_caixa: 'CX1', numero_caixa_exibicao: 'CX1', codigo_op: 'OP1', quantidade_total: 10 }],
    onReimprimir: (caixa) => { caixaClicada = caixa; },
  });

  el.querySelector('[data-reimprimir-caixa]').click();

  assert.equal(caixaClicada.numero_caixa, 'CX1');
});
```

- [ ] **Step 3: Run failing frontend tests**

```bash
node --test tests/frontend/domain/etiquetas-service.test.js tests/frontend/ui/tabela-caixas.test.js
```

Expected: fail because service/action do not exist.

- [ ] **Step 4: Implement etiquetas service**

Create `public/js/domain/etiquetas-service.js`:

```js
export function criarEtiquetasService({ api }) {
  return {
    reimprimirCaixa(payload) {
      return api.post('/etiquetas/caixas', payload);
    },
    listarCaixa(numeroEmbarque, numeroCaixa) {
      return api.get(`/etiquetas/caixas?embarque=${encodeURIComponent(numeroEmbarque)}&caixa=${encodeURIComponent(numeroCaixa)}`);
    },
    retry(id) {
      return api.post(`/etiquetas/${encodeURIComponent(id)}/retry`, {});
    },
  };
}
```

- [ ] **Step 5: Wire app context**

Modify `public/js/app.js`:

```js
import { criarEtiquetasService } from './domain/etiquetas-service.js';
```

Where services are created:

```js
  const etiquetasSvc = criarEtiquetasService({ api });
```

Add to context object:

```js
    etiquetasSvc,
```

- [ ] **Step 6: Normalize session close return**

Modify `public/js/domain/sessoes-service.js` so `encerrar` returns the backend result as-is:

```js
    async encerrar(id, payload) {
      if (typeof payload === 'string') return api.post(`/sessoes/${id}/encerrar`, { numero_caixa: payload });
      return api.post(`/sessoes/${id}/encerrar`, payload);
    },
```

No extra wrapping is needed. Existing callers must read `resultado.sessao ?? resultado`.

- [ ] **Step 7: Add reprint action to table**

Modify `public/js/ui/composites/tabela-caixas.js`:

```js
export function TabelaCaixas({ caixas = [], onReimprimir } = {}) {
```

Use a five-column grid and render button:

```js
      <span class="text-right">
        <button data-reimprimir-caixa class="text-xs font-bold text-primary hover:underline" type="button">Reimprimir</button>
      </span>
```

After setting `innerHTML`, bind:

```js
  [...el.querySelectorAll('[data-linha-caixa]')].forEach((linha, index) => {
    linha.querySelector('[data-reimprimir-caixa]')?.addEventListener('click', () => onReimprimir?.(caixas[index]));
  });
```

- [ ] **Step 8: Wire details page**

Modify `public/js/pages/detalhes-carga.js`:

```js
  async function reimprimirCaixa(caixa) {
    try {
      const codigoOperador = window.prompt('Código do operador para reimpressão');
      if (!codigoOperador) return;
      const etiqueta = await ctx.etiquetasSvc.reimprimirCaixa({
        numero_embarque: numero,
        numero_caixa: caixa.numero_caixa,
        codigo_operador: codigoOperador.trim(),
      });
      toast.info(`Etiqueta ${etiqueta.status}. Partes: ${etiqueta.partes_total ?? 0}`);
    } catch (e) {
      toast.erro(e.message);
    }
  }
```

Change table call:

```js
  el.appendChild(TabelaCaixas({ caixas, onReimprimir: reimprimirCaixa }));
```

Inside `onConfirmar` for session close:

```js
              const resultado = await ctx.sessoesSvc.encerrar(ativa.id, payload);
              const etiqueta = resultado.etiqueta;
              if (etiqueta?.status === 'erro') toast.erro(`Sessão encerrada. Etiqueta não impressa: ${etiqueta.erro ?? 'erro'}`);
              else if (etiqueta) toast.info(`Sessão encerrada. Etiqueta ${etiqueta.status}.`);
              recarregar();
```

- [ ] **Step 9: Run frontend tests**

```bash
node --test tests/frontend/domain/etiquetas-service.test.js tests/frontend/domain/sessoes-service.test.js tests/frontend/ui/tabela-caixas.test.js tests/frontend/pages/detalhes-carga.test.js
```

Expected: all focused frontend tests pass.

- [ ] **Step 10: Commit**

```bash
git add public/js/domain/etiquetas-service.js public/js/app.js public/js/domain/sessoes-service.js public/js/ui/composites/tabela-caixas.js public/js/pages/detalhes-carga.js tests/frontend/domain/etiquetas-service.test.js tests/frontend/domain/sessoes-service.test.js tests/frontend/ui/tabela-caixas.test.js tests/frontend/pages/detalhes-carga.test.js
git commit -m "feat: add label reprint UI"
```

---

### Task 8: Sync das etiquetas

**Files:**
- Modify: `src/sync/supabase-client.js`
- Modify: `src/server.js`
- Test: `tests/outbox-pusher.test.js`

- [ ] **Step 1: Add failing sync test**

Add to `tests/outbox-pusher.test.js` or existing Supabase client tests:

```js
test('pusher envia etiquetas_caixa para Supabase', async () => {
  const enviados = [];
  const pusher = criarPusher({
    db: criarDbComOutbox([{ tabela: 'etiquetas_caixa', payload: { id: 'etq-1' } }]),
    enviarBatch: async (item) => enviados.push(item),
    logger: fakeLogger,
  });

  await pusher.drenar();

  assert.equal(enviados[0].tabela, 'etiquetas_caixa');
});
```

Adjust helper names to match the existing file. The assertion is that table name is not rejected.

- [ ] **Step 2: Implement Supabase upsert helpers**

Modify `src/sync/supabase-client.js`:

```js
export async function upsertEtiquetaCaixa(sb, payload) {
  const { error } = await sb.from('etiquetas_caixa').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertEtiquetaCaixaParte(sb, payload) {
  const { error } = await sb.from('etiquetas_caixa_partes').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}
```

- [ ] **Step 3: Wire server outbox dispatcher**

Modify `src/server.js` import:

```js
import { createSupabase, upsertSessao, upsertEvento, upsertEtiquetaCaixa, upsertEtiquetaCaixaParte, buscarAlteracoes } from './sync/supabase-client.js';
```

Modify `enviarBatch`:

```js
      if (tabela === 'sessoes_contagem') await upsertSessao(sb, payload);
      else if (tabela === 'eventos_log') await upsertEvento(sb, { ...payload, origem: 'edge_pc', id_local: payload.id_local });
      else if (tabela === 'etiquetas_caixa') await upsertEtiquetaCaixa(sb, payload);
      else if (tabela === 'etiquetas_caixa_partes') await upsertEtiquetaCaixaParte(sb, payload);
```

- [ ] **Step 4: Enqueue parts from label service**

Modify `src/labels/caixa-label-service.js` after `inserirPartesEtiqueta`:

```js
    enfileirarSync?.('etiquetas_caixa', buscarEtiquetaPorId(db, etiquetaId));
    for (const parte of partesComId) {
      enfileirarSync?.('etiquetas_caixa_partes', {
        ...parte,
        etiqueta_id: etiquetaId,
        status: 'pendente',
        tentativas: 0,
        erro_detalhe: null,
        criada_em: criadaEm,
        impressa_em: null,
      });
    }
```

Remove the older single enqueue line if duplicated.

- [ ] **Step 5: Run sync-focused tests**

```bash
node --test tests/outbox-pusher.test.js tests/caixa-label-service.test.js
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/sync/supabase-client.js src/server.js src/labels/caixa-label-service.js tests/outbox-pusher.test.js tests/caixa-label-service.test.js
git commit -m "feat: sync label emissions"
```

---

### Task 9: Verificacao final

**Files:**
- Modify: `docs/superpowers/plans/2026-04-25-etiquetas-caixa-zpl.md`

- [ ] **Step 1: Run focused label suite**

```bash
node --test tests/etiquetas-queries.test.js tests/zpl-renderer.test.js tests/print-queue.test.js tests/caixa-label-service.test.js tests/etiquetas-routes.test.js
```

Expected: PASS.

- [ ] **Step 2: Run session and frontend regression**

```bash
node --test tests/sessao-service.test.js tests/sessoes-routes.test.js tests/frontend/domain/etiquetas-service.test.js tests/frontend/ui/tabela-caixas.test.js tests/frontend/pages/detalhes-carga.test.js
```

Expected: PASS.

- [ ] **Step 3: Run full suite**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Inspect worktree**

```bash
git status --short
```

Expected: only planned files changed before final commit, or clean after commits.

- [ ] **Step 5: Update this plan with execution notes**

Add a short "Execution Notes" section with:

```markdown
## Execution Notes

- Implemented through Task N.
- Focused tests passed: `<commands>`.
- Full suite status: `<result>`.
- Hardware print validation pending until printer mode/model is confirmed.
```

- [ ] **Step 6: Commit verification notes**

```bash
git add docs/superpowers/plans/2026-04-25-etiquetas-caixa-zpl.md
git commit -m "docs: record label implementation verification"
```

---

## Self-Review

- Spec coverage: schema, logical document, ZPL pagination, automatic close emission, reprint API, UI action, configurable transport, sync, tests and hardware risks are covered.
- Scope control: final label design and confirmed printer model remain outside implementation.
- Type consistency: public API uses `numero_embarque`, `numero_caixa`, `codigo_operador`, and label summaries use `{ id, status, partes_total }` throughout.
- Residual risk: `spooler` is an explicit stub until Windows driver strategy is validated.
