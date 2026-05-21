# Etiqueta NF + Segregação + Realocação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o ciclo da etiqueta de caixa em relação à Nota Fiscal: detectar chegada da NF, finalizar embarque, habilitar reimpressão em massa com NF, segregar caixas com sessão pendente, permitir aprovação/reprovação por aprovadores autorizados e realocar itens reprovados para embarques futuros.

**Architecture:** `faturamento-service.js` é o dono único das regras de negócio; o `reverse-poller` detecta transição NF e delega; queries em `faturamento.js` encapsulam o acesso ao banco. Frontend vanilla JS com páginas e modais isolados.

**Tech Stack:** Node.js 20 ESM, SQLite (better-sqlite3), Fastify, node:test, vanilla JS + Tailwind CDN.

---

## Fase 1 — Fundação: modelo de dados, serviço de domínio, reimpressão em massa, UI básica

### Task 1: Migração SQLite local (modelo de dados)

**Files:**
- Create: `src/db/migrations/005_faturamento.sql`

- [ ] **Step 1: Escrever a migração**

```sql
-- 005_faturamento.sql
ALTER TABLE sessoes_contagem ADD COLUMN faturamento_status TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE sessoes_contagem ADD COLUMN aprovada_por TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN aprovada_em TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN embarque_destino TEXT;

ALTER TABLE embarques ADD COLUMN finalizada_em TEXT;

CREATE TABLE IF NOT EXISTS aprovadores (
  codigo  TEXT PRIMARY KEY,
  nome    TEXT NOT NULL,
  ativo   INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Verificar que a migration roda sem erro**

```bash
node --eval "import('./src/db/sqlite.js').then(m => m.getDb()).then(() => console.log('ok'))"
```

Esperado: `ok` (sem exceção).

- [ ] **Step 3: Commit**

```bash
git add src/db/migrations/005_faturamento.sql
git commit -m "feat(db): migration 005 — faturamento_status, aprovadores, embarques.finalizada_em"
```

---

### Task 2: Migração Supabase (colunas replicadas)

**Files:**
- Create: `supabase/migrations/005_faturamento.sql`

- [ ] **Step 1: Escrever a migração Supabase**

```sql
-- supabase/migrations/005_faturamento.sql
ALTER TABLE sessoes_contagem ADD COLUMN IF NOT EXISTS faturamento_status TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE sessoes_contagem ADD COLUMN IF NOT EXISTS aprovada_por TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN IF NOT EXISTS aprovada_em TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN IF NOT EXISTS embarque_destino TEXT;
-- aprovadores e embarques.finalizada_em são local-only; não sincronizam
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/005_faturamento.sql
git commit -m "feat(supabase): migration 005 — faturamento_status em sessoes_contagem"
```

---

### Task 3: Queries de faturamento

**Files:**
- Create: `src/db/queries/faturamento.js`
- Create: `tests/faturamento-queries.test.js`

- [ ] **Step 1: Escrever os testes que falham**

```js
// tests/faturamento-queries.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  buscarSessoesSegregadasPorEmbarque,
  listarCaixasElegiveisParaMassa,
  buscarSessoesDaCaixaEfetiva,
  buscarAprovador,
  listarAprovadores,
  inserirAprovador,
  desativarAprovador,
  buscarSessoesReprovadas,
  atualizarFaturamentoStatus,
  finalizarEmbarque,
} from '../src/db/queries/faturamento.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E1', 'aberto')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  return db;
}

function inserirSessao(db, { id, embarque = 'E1', caixa = 'CX1', op = 'OP1', status = 'encerrada', faturamento_status = 'regular', embarque_destino = null }) {
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status, embarque_destino)
    VALUES (?, ?, ?, 'A', 1, ?, 10,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', ?, ?, ?)
  `).run(id, embarque, op, caixa, status, faturamento_status, embarque_destino);
}

test('buscarSessoesSegregadasPorEmbarque retorna pendente e reprovada', () => {
  const db = criarDb();
  inserirSessao(db, { id: 's1', faturamento_status: 'regular' });
  inserirSessao(db, { id: 's2', faturamento_status: 'pendente_aprovacao' });
  inserirSessao(db, { id: 's3', faturamento_status: 'reprovada' });
  const resultado = buscarSessoesSegregadasPorEmbarque(db, 'E1');
  assert.equal(resultado.length, 2);
  const ids = resultado.map(s => s.id).sort();
  assert.deepEqual(ids, ['s2', 's3']);
});

test('listarCaixasElegiveisParaMassa exclui caixas com sessao segregada', () => {
  const db = criarDb();
  inserirSessao(db, { id: 's1', caixa: 'CX1', faturamento_status: 'regular' });
  inserirSessao(db, { id: 's2', caixa: 'CX2', faturamento_status: 'pendente_aprovacao' });
  inserirSessao(db, { id: 's3', caixa: 'CX3', faturamento_status: 'aprovada' });
  const caixas = listarCaixasElegiveisParaMassa(db, 'E1');
  const nums = caixas.map(c => c.numero_caixa).sort();
  assert.deepEqual(nums, ['CX1', 'CX3']);
});

test('buscarSessoesDaCaixaEfetiva considera embarque_destino', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E2', 'aberto')`).run();
  inserirSessao(db, { id: 's1', embarque: 'E1', caixa: 'CX1', faturamento_status: 'realocada', embarque_destino: 'E2' });
  const sessoes = buscarSessoesDaCaixaEfetiva(db, 'E2', 'CX1');
  assert.equal(sessoes.length, 1);
  assert.equal(sessoes[0].id, 's1');
});

test('CRUD aprovadores', () => {
  const db = criarDb();
  inserirAprovador(db, { codigo: 'APROV1', nome: 'Carlos' });
  const aprov = buscarAprovador(db, 'APROV1');
  assert.equal(aprov.nome, 'Carlos');
  assert.equal(aprov.ativo, 1);
  const lista = listarAprovadores(db);
  assert.equal(lista.length, 1);
  desativarAprovador(db, 'APROV1');
  const inativo = buscarAprovador(db, 'APROV1');
  assert.equal(inativo.ativo, 0);
});

test('buscarSessoesReprovadas retorna apenas reprovadas sem destino', () => {
  const db = criarDb();
  inserirSessao(db, { id: 's1', faturamento_status: 'reprovada' });
  inserirSessao(db, { id: 's2', faturamento_status: 'reprovada', embarque_destino: 'E2' });
  inserirSessao(db, { id: 's3', faturamento_status: 'regular' });
  const resultado = buscarSessoesReprovadas(db);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id, 's1');
});

test('atualizarFaturamentoStatus atualiza coluna', () => {
  const db = criarDb();
  inserirSessao(db, { id: 's1', faturamento_status: 'regular' });
  atualizarFaturamentoStatus(db, 's1', { status: 'aprovada', aprovada_por: 'APROV1', aprovada_em: '2026-05-01T10:00:00.000Z' });
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'aprovada');
  assert.equal(s.aprovada_por, 'APROV1');
});

test('finalizarEmbarque seta finalizada_em e status', () => {
  const db = criarDb();
  finalizarEmbarque(db, 'E1', '2026-05-01T10:00:00.000Z');
  const e = db.prepare(`SELECT * FROM embarques WHERE numero_embarque = 'E1'`).get();
  assert.equal(e.finalizada_em, '2026-05-01T10:00:00.000Z');
  assert.equal(e.status, 'faturado');
});
```

- [ ] **Step 2: Rodar os testes para confirmar falha**

```bash
node --test tests/faturamento-queries.test.js
```

Esperado: erro de módulo não encontrado.

- [ ] **Step 3: Implementar `src/db/queries/faturamento.js`**

```js
// src/db/queries/faturamento.js

export function buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT * FROM sessoes_contagem
    WHERE numero_embarque = ?
      AND faturamento_status IN ('pendente_aprovacao', 'reprovada')
    ORDER BY iniciada_em
  `).all(numeroEmbarque);
}

export function listarCaixasElegiveisParaMassa(db, numeroEmbarque) {
  return db.prepare(`
    SELECT DISTINCT numero_caixa
    FROM sessoes_contagem
    WHERE numero_embarque = ?
      AND status = 'encerrada'
      AND numero_caixa NOT IN (
        SELECT numero_caixa FROM sessoes_contagem
        WHERE numero_embarque = ?
          AND faturamento_status IN ('pendente_aprovacao', 'reprovada')
      )
  `).all(numeroEmbarque, numeroEmbarque);
}

export function buscarSessoesDaCaixaEfetiva(db, embarqueEfetivo, numeroCaixa) {
  return db.prepare(`
    SELECT * FROM sessoes_contagem
    WHERE numero_caixa = ?
      AND status = 'encerrada'
      AND (
        (embarque_destino = ?) OR
        (embarque_destino IS NULL AND numero_embarque = ?)
      )
  `).all(numeroCaixa, embarqueEfetivo, embarqueEfetivo);
}

export function buscarAprovador(db, codigo) {
  return db.prepare(`SELECT * FROM aprovadores WHERE codigo = ?`).get(codigo);
}

export function listarAprovadores(db) {
  return db.prepare(`SELECT * FROM aprovadores ORDER BY nome`).all();
}

export function inserirAprovador(db, { codigo, nome }) {
  db.prepare(`
    INSERT INTO aprovadores (codigo, nome, ativo, criado_em)
    VALUES (?, ?, 1, datetime('now'))
  `).run(codigo, nome);
}

export function desativarAprovador(db, codigo) {
  db.prepare(`UPDATE aprovadores SET ativo = 0 WHERE codigo = ?`).run(codigo);
}

export function buscarSessoesReprovadas(db) {
  return db.prepare(`
    SELECT sc.*, e.numero_nota_fiscal, op.item_codigo, op.item_descricao
    FROM sessoes_contagem sc
    JOIN ordens_producao op ON sc.codigo_op = op.codigo_op
    LEFT JOIN embarques e ON sc.numero_embarque = e.numero_embarque
    WHERE sc.faturamento_status = 'reprovada'
      AND sc.embarque_destino IS NULL
  `).all();
}

export function atualizarFaturamentoStatus(db, sessaoId, { status, aprovada_por = null, aprovada_em = null, embarque_destino = null }) {
  db.prepare(`
    UPDATE sessoes_contagem
    SET faturamento_status = ?,
        aprovada_por = COALESCE(?, aprovada_por),
        aprovada_em  = COALESCE(?, aprovada_em),
        embarque_destino = COALESCE(?, embarque_destino)
    WHERE id = ?
  `).run(status, aprovada_por, aprovada_em, embarque_destino, sessaoId);
}

export function finalizarEmbarque(db, numeroEmbarque, finalizadaEm) {
  db.prepare(`
    UPDATE embarques
    SET finalizada_em = ?, status = 'faturado'
    WHERE numero_embarque = ? AND finalizada_em IS NULL
  `).run(finalizadaEm, numeroEmbarque);
}

export function buscarEmbarque(db, numeroEmbarque) {
  return db.prepare(`SELECT * FROM embarques WHERE numero_embarque = ?`).get(numeroEmbarque);
}
```

- [ ] **Step 4: Rodar os testes para confirmar aprovação**

```bash
node --test tests/faturamento-queries.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/db/queries/faturamento.js tests/faturamento-queries.test.js
git commit -m "feat(db): queries de faturamento — segregacao, aprovadores, finalizarEmbarque"
```

---

### Task 4: faturamento-service — aoReceberNF, embarqueFinalizado, marcarEncerramentoTardio

**Files:**
- Create: `src/domain/faturamento-service.js`
- Create: `tests/faturamento-service.test.js` (parcial — expandido nas tasks 7 e 8)

- [ ] **Step 1: Escrever os testes iniciais**

```js
// tests/faturamento-service.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarFaturamentoService } from '../src/domain/faturamento-service.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  return db;
}

function inserirSessao(db, id, extra = {}) {
  const { caixa = 'CX1', faturamento_status = 'regular', embarque_destino = null } = extra;
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status, embarque_destino)
    VALUES (?, 'E1', 'OP1', 'A', 1, ?, 10,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', ?, ?)
  `).run(id, caixa, faturamento_status, embarque_destino);
}

function criarServico(db, overrides = {}) {
  const broadcasts = [];
  const syncs = [];
  return {
    service: criarFaturamentoService({
      db,
      enfileirarSync: (tabela, payload) => syncs.push({ tabela, payload }),
      registrarEvento: () => {},
      broadcast: (tipo, dados) => broadcasts.push({ tipo, dados }),
      caixaLabelService: overrides.caixaLabelService ?? { emitir: async () => ({ id: 'etq', partes_total: 1 }) },
      now: () => '2026-05-01T10:00:00.000Z',
    }),
    broadcasts,
    syncs,
  };
}

test('embarqueFinalizado retorna false quando finalizada_em e null', () => {
  const db = criarDb();
  const { service } = criarServico(db);
  assert.equal(service.embarqueFinalizado('E1'), false);
});

test('aoReceberNF finaliza embarque e enfileira sync', () => {
  const db = criarDb();
  const { service, broadcasts, syncs } = criarServico(db);
  service.aoReceberNF('E1');
  assert.equal(service.embarqueFinalizado('E1'), true);
  assert.ok(broadcasts.some(b => b.tipo === 'embarque.finalizado'));
  assert.ok(syncs.some(s => s.tabela === 'embarques_status'));
});

test('aoReceberNF e idempotente — segunda chamada nao duplica sync', () => {
  const db = criarDb();
  const { service, syncs } = criarServico(db);
  service.aoReceberNF('E1');
  service.aoReceberNF('E1');
  assert.equal(syncs.filter(s => s.tabela === 'embarques_status').length, 1);
});

test('aoReceberNF nao altera sessoes encerradas regulares', () => {
  const db = criarDb();
  inserirSessao(db, 's1');
  const { service } = criarServico(db);
  service.aoReceberNF('E1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'regular');
});

test('marcarEncerramentoTardio seta pendente_aprovacao', () => {
  const db = criarDb();
  inserirSessao(db, 's1');
  const { service } = criarServico(db);
  service.aoReceberNF('E1');
  service.marcarEncerramentoTardio('s1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'pendente_aprovacao');
});

test('caixaElegivel retorna false quando ha sessao pendente', () => {
  const db = criarDb();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.equal(service.caixaElegivel('E1', 'CX1'), false);
});

test('caixaElegivel retorna true quando todas sessoes sao regular ou aprovada', () => {
  const db = criarDb();
  inserirSessao(db, 's1', { faturamento_status: 'regular' });
  inserirSessao(db, 's2', { faturamento_status: 'aprovada' });
  const { service } = criarServico(db);
  assert.equal(service.caixaElegivel('E1', 'CX1'), true);
});
```

- [ ] **Step 2: Rodar os testes para confirmar falha**

```bash
node --test tests/faturamento-service.test.js
```

Esperado: erro de módulo não encontrado.

- [ ] **Step 3: Implementar `src/domain/faturamento-service.js`**

```js
// src/domain/faturamento-service.js
import {
  buscarSessoesSegregadasPorEmbarque,
  listarCaixasElegiveisParaMassa,
  buscarSessoesDaCaixaEfetiva,
  buscarAprovador,
  listarAprovadores,
  inserirAprovador,
  desativarAprovador,
  buscarSessoesReprovadas,
  atualizarFaturamentoStatus,
  finalizarEmbarque,
  buscarEmbarque,
} from '../db/queries/faturamento.js';

export function criarFaturamentoService({ db, enfileirarSync, registrarEvento, broadcast, caixaLabelService, now = () => new Date().toISOString() }) {

  function embarqueFinalizado(numeroEmbarque) {
    const e = buscarEmbarque(db, numeroEmbarque);
    return Boolean(e?.finalizada_em);
  }

  function aoReceberNF(numeroEmbarque) {
    const e = buscarEmbarque(db, numeroEmbarque);
    if (!e || e.finalizada_em) return;
    finalizarEmbarque(db, numeroEmbarque, now());
    enfileirarSync('embarques_status', { numero_embarque: numeroEmbarque, status: 'faturado' });
    registrarEvento({ tipo: 'SISTEMA', nivel: 'SUCCESS', mensagem: `Embarque ${numeroEmbarque} faturado.` });
    broadcast('embarque.finalizado', { numero_embarque: numeroEmbarque });
  }

  function marcarEncerramentoTardio(sessaoId) {
    atualizarFaturamentoStatus(db, sessaoId, { status: 'pendente_aprovacao' });
    broadcast('sessao.segregada', { sessao_id: sessaoId });
  }

  function caixaElegivel(numeroEmbarque, numeroCaixa) {
    const segregadas = buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque)
      .filter(s => s.numero_caixa === numeroCaixa);
    return segregadas.length === 0;
  }

  function previewMassa(numeroEmbarque) {
    const caixas = listarCaixasElegiveisParaMassa(db, numeroEmbarque);
    const realocadas = db.prepare(`
      SELECT DISTINCT numero_caixa FROM sessoes_contagem
      WHERE embarque_destino = ? AND faturamento_status = 'realocada'
    `).all(numeroEmbarque);
    const todasCaixas = [...new Set([
      ...caixas.map(c => c.numero_caixa),
      ...realocadas.map(c => c.numero_caixa),
    ])];
    let totalEtiquetas = 0;
    for (const caixa of todasCaixas) {
      const sessoes = buscarSessoesDaCaixaEfetiva(db, numeroEmbarque, caixa);
      const itens = new Set(sessoes.map(s => s.codigo_op));
      totalEtiquetas += itens.size;
    }
    return { caixas: todasCaixas.length, etiquetas: totalEtiquetas };
  }

  async function reimpressaoMassa(numeroEmbarque, codigoOperador) {
    const caixas = listarCaixasElegiveisParaMassa(db, numeroEmbarque);
    const realocadas = db.prepare(`
      SELECT DISTINCT numero_caixa FROM sessoes_contagem
      WHERE embarque_destino = ? AND faturamento_status = 'realocada'
    `).all(numeroEmbarque);
    const todasCaixas = [...new Set([
      ...caixas.map(c => c.numero_caixa),
      ...realocadas.map(c => c.numero_caixa),
    ])];

    let totalEtiquetas = 0;
    const caixasPuladas = [];
    for (const caixa of todasCaixas) {
      try {
        const resultado = await caixaLabelService.emitir({
          numero_embarque: numeroEmbarque,
          numero_caixa: caixa,
          motivo: 'reimpressao_massa',
          codigo_operador: codigoOperador,
        });
        totalEtiquetas += resultado.partes_total ?? 1;
      } catch (err) {
        caixasPuladas.push({ caixa, erro: err.message });
      }
    }
    return { etiquetas: totalEtiquetas, caixas: todasCaixas.length, caixas_puladas: caixasPuladas };
  }

  function aprovarSessao(sessaoId, codigoAprovador) {
    const aprov = buscarAprovador(db, codigoAprovador);
    if (!aprov || !aprov.ativo) throw Object.assign(new Error('Aprovador inválido ou inativo.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, {
      status: 'aprovada',
      aprovada_por: codigoAprovador,
      aprovada_em: now(),
    });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.aprovada', { sessao_id: sessaoId });
  }

  function reprovarSessao(sessaoId, codigoAprovador) {
    const aprov = buscarAprovador(db, codigoAprovador);
    if (!aprov || !aprov.ativo) throw Object.assign(new Error('Aprovador inválido ou inativo.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, {
      status: 'reprovada',
      aprovada_por: codigoAprovador,
      aprovada_em: now(),
    });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.reprovada', { sessao_id: sessaoId });
  }

  function sugerirRealocacoes(numeroEmbarqueNovo) {
    return buscarSessoesReprovadas(db);
  }

  function confirmarRealocacao(sessaoId, embarqueDestino) {
    const destino = buscarEmbarque(db, embarqueDestino);
    if (!destino) throw Object.assign(new Error('Embarque destino não encontrado.'), { statusCode: 400 });
    if (destino.finalizada_em) throw Object.assign(new Error('Embarque destino já está faturado.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, { status: 'realocada', embarque_destino: embarqueDestino });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.realocada', { sessao_id: sessaoId, embarque_destino: embarqueDestino });
  }

  function listarSegregadas(numeroEmbarque) {
    return buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque);
  }

  function gerenciarAprovadores() {
    return {
      listar: () => listarAprovadores(db),
      inserir: ({ codigo, nome }) => inserirAprovador(db, { codigo, nome }),
      desativar: (codigo) => desativarAprovador(db, codigo),
    };
  }

  function notificarEmbarqueNovo(numeroEmbarqueNovo) {
    const pendentes = buscarSessoesReprovadas(db);
    if (pendentes.length > 0) {
      broadcast('realocacao.sugerida', { embarque_novo: numeroEmbarqueNovo, total: pendentes.length });
    }
  }

  return {
    embarqueFinalizado,
    aoReceberNF,
    marcarEncerramentoTardio,
    caixaElegivel,
    previewMassa,
    reimpressaoMassa,
    aprovarSessao,
    reprovarSessao,
    sugerirRealocacoes,
    confirmarRealocacao,
    listarSegregadas,
    gerenciarAprovadores,
    notificarEmbarqueNovo,
  };
}
```

- [ ] **Step 4: Rodar os testes**

```bash
node --test tests/faturamento-service.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/domain/faturamento-service.js tests/faturamento-service.test.js
git commit -m "feat(domain): faturamento-service — aoReceberNF, encerramento tardio, segregacao"
```

---

### Task 5: Adaptar caixa-label-service para reter NF em segregadas

**Files:**
- Modify: `src/labels/caixa-label-service.js`
- Modify: `tests/caixa-label-service.test.js`

- [ ] **Step 1: Adicionar testes para retenção de NF**

No arquivo `tests/caixa-label-service.test.js`, adicionar ao final:

```js
test('montarDocumento retém NF quando caixa tem sessao pendente_aprovacao', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql', '005_faturamento.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'faturado', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', 'pendente_aprovacao')
  `).run();

  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });
  assert.equal(doc.numero_nota_fiscal, null);
});

test('montarDocumento inclui NF quando todas sessoes sao aprovada', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql', '005_faturamento.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'faturado', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', 'aprovada')
  `).run();

  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });
  assert.equal(doc.numero_nota_fiscal, '12345');
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
node --test tests/caixa-label-service.test.js
```

Esperado: dois novos testes falham (NF não é retida ainda).

- [ ] **Step 3: Modificar `montarDocumento` em `src/labels/caixa-label-service.js`**

Localizar a linha que define `numero_nota_fiscal` no retorno de `montarDocumento`. Adicionar antes do `return`:

```js
const temSegregada = sessoes.some(s =>
  ['pendente_aprovacao', 'reprovada'].includes(s.faturamento_status)
);
```

E no objeto de retorno, substituir `numero_nota_fiscal: embarque?.numero_nota_fiscal ?? null` por:

```js
numero_nota_fiscal: temSegregada ? null : (embarque?.numero_nota_fiscal ?? null),
```

Também aceitar motivos `reimpressao_massa` e `pos_aprovacao` no array de motivos válidos (se houver validação explícita do campo `motivo`).

- [ ] **Step 4: Adicionar método `emitir` ao `caixaLabelService` (alias de `emitirPorEncerramento` para uso do faturamento-service)**

Localizar a função de encerramento e adicionar:

```js
async function emitir({ numero_embarque, numero_caixa, motivo, codigo_operador }) {
  return reimprimir({ numero_embarque, numero_caixa, codigo_operador, motivo });
}
```

Exportar `emitir` junto com os demais métodos no `return` do service.

- [ ] **Step 5: Rodar os testes**

```bash
node --test tests/caixa-label-service.test.js
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/labels/caixa-label-service.js tests/caixa-label-service.test.js
git commit -m "feat(labels): reter NF para caixas segregadas; adicionar metodo emitir"
```

---

### Task 6: Adaptar reverse-poller para detectar transição NF

**Files:**
- Modify: `src/sync/reverse-poller.js`
- Modify: `tests/reverse-poller.test.js` (criar se não existir)

- [ ] **Step 1: Escrever testes do poller**

```js
// tests/reverse-poller.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarPoller } from '../src/sync/reverse-poller.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  return db;
}

test('poller chama aoReceberNF em transicao NF vazio->preenchido', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', NULL)`).run();

  const chamados = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E1', status: 'aberto', numero_nota_fiscal: '12345', atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: (n) => chamados.push(n), notificarEmbarqueNovo: () => {} },
  });

  await poller.tick();
  assert.deepEqual(chamados, ['E1']);
});

test('poller nao chama aoReceberNF quando NF nao muda', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();

  const chamados = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E1', status: 'aberto', numero_nota_fiscal: '12345', atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: (n) => chamados.push(n), notificarEmbarqueNovo: () => {} },
  });

  await poller.tick();
  assert.deepEqual(chamados, []);
});

test('poller chama notificarEmbarqueNovo para embarque novo', async () => {
  const db = criarDb();
  const novos = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E2', status: 'aberto', numero_nota_fiscal: null, atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: () => {}, notificarEmbarqueNovo: (n) => novos.push(n) },
  });

  await poller.tick();
  assert.deepEqual(novos, ['E2']);
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
node --test tests/reverse-poller.test.js
```

Esperado: testes falham (faturamentoService ignorado no poller atual).

- [ ] **Step 3: Modificar `src/sync/reverse-poller.js`**

```js
// src/sync/reverse-poller.js
import {
  upsertEmbarque, upsertOP, upsertOperador,
  lerCursor, salvarCursor,
} from '../db/queries/espelhos.js';

const TABELAS = [
  { nome: 'embarques', upsert: upsertEmbarque, estrategia: 'snapshot' },
  { nome: 'ordens_producao', upsert: upsertOP },
  { nome: 'operadores', upsert: upsertOperador },
];

export function criarPoller({ db, buscarAlteracoes, logger, faturamentoService }) {
  return {
    async tick() {
      for (const { nome, upsert, estrategia } of TABELAS) {
        const cursor = lerCursor(db, nome);
        const cursorConsulta = estrategia === 'snapshot' ? null : cursor;
        const registros = await buscarAlteracoes(nome, cursorConsulta);
        if (registros.length === 0) {
          salvarCursor(db, nome, cursor);
          continue;
        }

        if (nome === 'embarques' && faturamentoService) {
          for (const r of registros) {
            const local = db.prepare(`SELECT numero_nota_fiscal, finalizada_em FROM embarques WHERE numero_embarque = ?`).get(r.numero_embarque);
            const nfNova = r.numero_nota_fiscal && (!local || !local.numero_nota_fiscal);
            const embarqueNovo = !local;
            if (nfNova) faturamentoService.aoReceberNF(r.numero_embarque);
            if (embarqueNovo) faturamentoService.notificarEmbarqueNovo(r.numero_embarque);
          }
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

- [ ] **Step 4: Rodar os testes**

```bash
node --test tests/reverse-poller.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/sync/reverse-poller.js tests/reverse-poller.test.js
git commit -m "feat(poller): detectar transicao NF e chamar faturamentoService.aoReceberNF"
```

---

### Task 7: Adaptar sessao-service para bloquear embarque finalizado e marcar tardio

**Files:**
- Modify: `src/domain/sessao-service.js`
- Modify: `tests/sessao-service.test.js` (adicionar testes)

- [ ] **Step 1: Localizar `_validarPreRequisitos` e `encerrar` em `src/domain/sessao-service.js`**

Abrir o arquivo e identificar:
1. Onde `_validarPreRequisitos` lança erros de validação.
2. Onde `encerrar` chama `encerrarSessao` (ou equivalente) após salvar a sessão.

- [ ] **Step 2: Adicionar testes**

Nos testes de sessao-service, acrescentar:

```js
test('_validarPreRequisitos recusa abertura em embarque finalizado', () => {
  // Usar db com embarque E1 tendo finalizada_em preenchida
  // Usar faturamentoService mock que retorna embarqueFinalizado = true
  // Chamar abrirSessao e esperar erro 'Embarque já faturado'
});

test('encerrar tardio marca pendente_aprovacao', async () => {
  // Usar db com embarque E1 finalizado
  // Encerrar sessão existente
  // Verificar faturamento_status = 'pendente_aprovacao'
});
```

Implementar esses testes de acordo com a estrutura existente de testes de sessao-service (usar o padrão de mocks já presente no arquivo).

- [ ] **Step 3: Modificar `src/domain/sessao-service.js`**

Adicionar `faturamentoService = null` ao destructuring do construtor.

Em `_validarPreRequisitos`, antes do `return`, adicionar:

```js
if (faturamentoService?.embarqueFinalizado(numero_embarque)) {
  throw Object.assign(new Error('Embarque já faturado. Não é possível abrir nova sessão.'), { statusCode: 409 });
}
```

Em `encerrar`, após a chamada que persiste/encerra a sessão:

```js
if (faturamentoService?.embarqueFinalizado(sessao.numero_embarque)) {
  faturamentoService.marcarEncerramentoTardio(sessaoId);
}
```

- [ ] **Step 4: Rodar todos os testes de sessao**

```bash
node --test tests/sessao-service.test.js
```

Esperado: todos passam (inclusive os dois novos).

- [ ] **Step 5: Commit**

```bash
git add src/domain/sessao-service.js tests/sessao-service.test.js
git commit -m "feat(domain): sessao-service bloqueia embarque faturado e marca encerramento tardio"
```

---

### Task 8: Adaptar supabase-client para atualizar status do embarque

**Files:**
- Modify: `src/sync/supabase-client.js`

- [ ] **Step 1: Adicionar `atualizarStatusEmbarque` ao final do arquivo**

```js
export async function atualizarStatusEmbarque(sb, { numero_embarque, status }) {
  const { error } = await sb.from('embarques').update({ status }).eq('numero_embarque', numero_embarque);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/sync/supabase-client.js
git commit -m "feat(sync): atualizarStatusEmbarque para propagar faturado ao Supabase"
```

---

### Task 9: Rotas HTTP de faturamento

**Files:**
- Create: `src/http/routes/faturamento.js`
- Create: `tests/faturamento-routes.test.js`

- [ ] **Step 1: Escrever os testes**

```js
// tests/faturamento-routes.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasFaturamento } from '../src/http/routes/faturamento.js';

function criarServico(overrides = {}) {
  return {
    previewMassa: async (n) => ({ caixas: 2, etiquetas: 4 }),
    reimpressaoMassa: async (n, op) => ({ etiquetas: 4, caixas: 2, caixas_puladas: [] }),
    listarSegregadas: (n) => [{ id: 's1', numero_caixa: 'CX1', faturamento_status: 'pendente_aprovacao' }],
    aprovarSessao: (id, aprov) => {},
    reprovarSessao: (id, aprov) => {},
    sugerirRealocacoes: (n) => [],
    confirmarRealocacao: (id, dest) => {},
    gerenciarAprovadores: () => ({
      listar: () => [{ codigo: 'A1', nome: 'Ana', ativo: 1 }],
      inserir: () => {},
      desativar: () => {},
    }),
    ...overrides,
  };
}

async function criarApp(overrides = {}) {
  const app = Fastify();
  rotasFaturamento(app, { faturamentoService: criarServico(overrides) });
  return app;
}

test('GET /faturamento/embarques/:n/reimpressao-massa/preview retorna contagem', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/embarques/E1/reimpressao-massa/preview' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { caixas: 2, etiquetas: 4 });
});

test('POST /faturamento/embarques/:n/reimpressao-massa dispara a massa', async () => {
  const app = await criarApp();
  const res = await app.inject({
    method: 'POST', url: '/faturamento/embarques/E1/reimpressao-massa',
    payload: { codigo_operador: 'A' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).etiquetas, 4);
});

test('POST /faturamento/embarques/:n/reimpressao-massa requer codigo_operador', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/embarques/E1/reimpressao-massa', payload: {} });
  assert.equal(res.statusCode, 400);
});

test('GET /faturamento/embarques/:n/segregadas retorna lista', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/embarques/E1/segregadas' });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).length, 1);
});

test('POST /faturamento/sessoes/:id/aprovar valida payload', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/aprovar', payload: { codigo_aprovador: 'A1' } });
  assert.equal(res.statusCode, 200);
});

test('POST /faturamento/sessoes/:id/reprovar valida payload', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/reprovar', payload: { codigo_aprovador: 'A1' } });
  assert.equal(res.statusCode, 200);
});

test('GET /faturamento/aprovadores lista aprovadores', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/aprovadores' });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body)[0].codigo, 'A1');
});

test('POST /faturamento/aprovadores insere aprovador', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/aprovadores', payload: { codigo: 'B2', nome: 'Bruno' } });
  assert.equal(res.statusCode, 201);
});

test('POST /faturamento/sessoes/:id/realocar confirma realocacao', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/realocar', payload: { embarque_destino: 'E2' } });
  assert.equal(res.statusCode, 200);
});
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
node --test tests/faturamento-routes.test.js
```

Esperado: módulo não encontrado.

- [ ] **Step 3: Implementar `src/http/routes/faturamento.js`**

```js
// src/http/routes/faturamento.js
export function rotasFaturamento(fastify, { faturamentoService }) {
  fastify.get('/faturamento/embarques/:n/reimpressao-massa/preview', async (req) => {
    return faturamentoService.previewMassa(req.params.n);
  });

  fastify.post('/faturamento/embarques/:n/reimpressao-massa', async (req, reply) => {
    const { codigo_operador } = req.body ?? {};
    if (!codigo_operador) return reply.code(400).send({ error: 'codigo_operador obrigatório' });
    return faturamentoService.reimpressaoMassa(req.params.n, codigo_operador);
  });

  fastify.get('/faturamento/embarques/:n/segregadas', async (req) => {
    return faturamentoService.listarSegregadas(req.params.n);
  });

  fastify.post('/faturamento/sessoes/:id/aprovar', async (req, reply) => {
    const { codigo_aprovador } = req.body ?? {};
    if (!codigo_aprovador) return reply.code(400).send({ error: 'codigo_aprovador obrigatório' });
    faturamentoService.aprovarSessao(req.params.id, codigo_aprovador);
    return { ok: true };
  });

  fastify.post('/faturamento/sessoes/:id/reprovar', async (req, reply) => {
    const { codigo_aprovador } = req.body ?? {};
    if (!codigo_aprovador) return reply.code(400).send({ error: 'codigo_aprovador obrigatório' });
    faturamentoService.reprovarSessao(req.params.id, codigo_aprovador);
    return { ok: true };
  });

  fastify.get('/faturamento/embarques/:n/sugestoes-realocacao', async (req) => {
    return faturamentoService.sugerirRealocacoes(req.params.n);
  });

  fastify.post('/faturamento/sessoes/:id/realocar', async (req, reply) => {
    const { embarque_destino } = req.body ?? {};
    if (!embarque_destino) return reply.code(400).send({ error: 'embarque_destino obrigatório' });
    faturamentoService.confirmarRealocacao(req.params.id, embarque_destino);
    return { ok: true };
  });

  const aprovMgr = faturamentoService.gerenciarAprovadores();

  fastify.get('/faturamento/aprovadores', async () => aprovMgr.listar());

  fastify.post('/faturamento/aprovadores', async (req, reply) => {
    const { codigo, nome } = req.body ?? {};
    if (!codigo || !nome) return reply.code(400).send({ error: 'codigo e nome obrigatórios' });
    aprovMgr.inserir({ codigo, nome });
    return reply.code(201).send({ ok: true });
  });

  fastify.delete('/faturamento/aprovadores/:codigo', async (req) => {
    aprovMgr.desativar(req.params.codigo);
    return { ok: true };
  });
}
```

- [ ] **Step 4: Rodar os testes**

```bash
node --test tests/faturamento-routes.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add src/http/routes/faturamento.js tests/faturamento-routes.test.js
git commit -m "feat(http): rotas de faturamento — massa, segregadas, aprovar, aprovadores, realocar"
```

---

### Task 10: Integrar faturamento-service no server.js

**Files:**
- Modify: `src/server.js`

- [ ] **Step 1: Ler `src/server.js` para identificar onde adicionar**

Identificar:
- Import de `criarSessaoService` e `criarCaixaLabelService`.
- Onde `criarPoller` é chamado.
- Onde o pusher de outbox trata os tipos de tabela.
- Onde as rotas são registradas.

- [ ] **Step 2: Adicionar imports ao topo**

```js
import { criarFaturamentoService } from './domain/faturamento-service.js';
import { rotasFaturamento } from './http/routes/faturamento.js';
import { atualizarStatusEmbarque } from './sync/supabase-client.js';
```

- [ ] **Step 3: Instanciar faturamentoService após caixaLabelService**

```js
const faturamentoService = criarFaturamentoService({
  db,
  enfileirarSync,
  registrarEvento,
  broadcast,
  caixaLabelService,
});
```

- [ ] **Step 4: Passar faturamentoService ao sessaoService e ao poller**

No `criarSessaoService({...})`, adicionar `faturamentoService`.
No `criarPoller({...})`, adicionar `faturamentoService`.

- [ ] **Step 5: Adicionar handler de embarques_status no pusher outbox**

Localizar a função pusher que faz `upsertSessao`, `upsertEvento`, etc. Adicionar:

```js
else if (tabela === 'embarques_status') {
  await atualizarStatusEmbarque(sb, payload);
}
```

- [ ] **Step 6: Registrar as rotas de faturamento**

```js
rotasFaturamento(fastify, { faturamentoService });
```

- [ ] **Step 7: Rodar todos os testes**

```bash
npm test
```

Esperado: todos os testes existentes continuam passando.

- [ ] **Step 8: Commit**

```bash
git add src/server.js
git commit -m "feat(server): integrar faturamento-service, rotas e pusher embarques_status"
```

---

### Task 11: Frontend — serviço cliente e seleção de carga

**Files:**
- Create: `public/js/domain/faturamento-service.js`
- Modify: `public/js/pages/selecao-carga.js`

- [ ] **Step 1: Criar `public/js/domain/faturamento-service.js`**

```js
// public/js/domain/faturamento-service.js
export function criarFaturamentoClienteService(baseUrl = '') {
  async function post(url, body) {
    const res = await fetch(baseUrl + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.error ?? `HTTP ${res.status}`), { statusCode: res.status });
    }
    return res.json();
  }

  async function get(url) {
    const res = await fetch(baseUrl + url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  return {
    previewMassa: (embarque) => get(`/faturamento/embarques/${embarque}/reimpressao-massa/preview`),
    reimpressaoMassa: (embarque, codigoOperador) => post(`/faturamento/embarques/${embarque}/reimpressao-massa`, { codigo_operador: codigoOperador }),
    listarSegregadas: (embarque) => get(`/faturamento/embarques/${embarque}/segregadas`),
    aprovarSessao: (sessaoId, codigoAprovador) => post(`/faturamento/sessoes/${sessaoId}/aprovar`, { codigo_aprovador: codigoAprovador }),
    reprovarSessao: (sessaoId, codigoAprovador) => post(`/faturamento/sessoes/${sessaoId}/reprovar`, { codigo_aprovador: codigoAprovador }),
    sugerirRealocacoes: (embarque) => get(`/faturamento/embarques/${embarque}/sugestoes-realocacao`),
    realocarSessao: (sessaoId, embarqueDestino) => post(`/faturamento/sessoes/${sessaoId}/realocar`, { embarque_destino: embarqueDestino }),
    listarAprovadores: () => get('/faturamento/aprovadores'),
    inserirAprovador: ({ codigo, nome }) => post('/faturamento/aprovadores', { codigo, nome }),
    desativarAprovador: (codigo) => fetch(`/faturamento/aprovadores/${codigo}`, { method: 'DELETE' }).then(r => r.json()),
  };
}
```

- [ ] **Step 2: Modificar critério de "expedida" em `public/js/pages/selecao-carga.js`**

Localizar a condição que separa cargas abertas de expedidas. A condição atual usa `embarque.status === 'fechado'`. Substituir por:

```js
const estaExpedida = Boolean(embarque.numero_nota_fiscal);
```

E no botão de atalho de massa, adicionar (dentro do card de carga expedida):

```html
<button class="btn-sm" onclick="ctx.faturamentoSvc.previewMassa('${e.numero_embarque}').then(p => abrirModalMassa('${e.numero_embarque}', p))">
  Imprimir etiquetas finais
</button>
```

(A estrutura exata depende do HTML já gerado; adaptar ao padrão existente de eventos/handlers.)

- [ ] **Step 3: Adicionar `faturamentoSvc` ao contexto em `public/js/app.js`**

Localizar onde `ctx` é construído. Adicionar:

```js
import { criarFaturamentoClienteService } from './domain/faturamento-service.js';
// ...
ctx.faturamentoSvc = criarFaturamentoClienteService();
```

- [ ] **Step 4: Commit**

```bash
git add public/js/domain/faturamento-service.js public/js/pages/selecao-carga.js public/js/app.js
git commit -m "feat(ui): servico cliente faturamento; criterio expedida por NF em selecao-carga"
```

---

### Task 12: Modal de encerramento tardio

**Files:**
- Modify: `public/js/ui/composites/modal-encerrar-sessao.js`
- Modify: `public/js/pages/detalhes-carga.js`

- [ ] **Step 1: Modificar `modal-encerrar-sessao.js`**

Localizar a função que renderiza o modal. Adicionar suporte ao parâmetro `embarqueFaturado`:

```js
export function abrirModalEncerrarSessao({ sessao, embarqueFaturado = false, onConfirmar }) {
  // ... HTML do modal ...
  const avisoFaturado = embarqueFaturado ? `
    <div class="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded p-3 mb-4">
      <strong>Atenção:</strong> Este embarque já foi faturado. A sessão será marcada como pendente de aprovação.
      Contate o Líder para notificar o PCP.
    </div>
    <label class="flex items-center gap-2 mb-4">
      <input type="checkbox" id="confirmarTardio" required />
      <span>Confirmo que estou ciente e desejo encerrar assim mesmo.</span>
    </label>
  ` : '';
  // Inserir avisoFaturado antes dos botões de ação no HTML do modal
  // Ao confirmar, se embarqueFaturado, verificar que o checkbox está marcado
}
```

- [ ] **Step 2: Modificar `public/js/pages/detalhes-carga.js`**

Ao chamar `abrirModalEncerrarSessao`, passar:

```js
embarqueFaturado: Boolean(embarque.numero_nota_fiscal),
```

Também remover (ou condicionar) o botão "Finalizar Carga" que antes era manual — a finalização agora é automática via NF. Se o botão existir, removê-lo ou ocultá-lo quando `embarque.numero_nota_fiscal` estiver preenchido.

- [ ] **Step 3: Commit**

```bash
git add public/js/ui/composites/modal-encerrar-sessao.js public/js/pages/detalhes-carga.js
git commit -m "feat(ui): aviso de encerramento tardio com confirmacao no modal de sessao"
```

---

### Task 13: Modal e UI de reimpressão em massa

**Files:**
- Create: `public/js/ui/composites/modal-reimpressao-massa.js`
- Modify: `public/js/pages/detalhes-carga-expedida.js`

- [ ] **Step 1: Criar `public/js/ui/composites/modal-reimpressao-massa.js`**

```js
// public/js/ui/composites/modal-reimpressao-massa.js
export function abrirModalReimpressaoMassa({ embarque, preview, faturamentoSvc, onConcluido }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">Imprimir Etiquetas Finais</h2>
      <p>Embarque: <strong>${embarque}</strong></p>
      <p>Caixas elegíveis: <strong>${preview.caixas}</strong></p>
      <p>Total de etiquetas: <strong>${preview.etiquetas}</strong></p>
      <div class="form-field">
        <label>Código do operador</label>
        <input id="mmCodigoOp" type="text" placeholder="Ex.: A01" class="input" />
      </div>
      <div class="modal-actions">
        <button id="mmCancelar" class="btn btn-secondary">Cancelar</button>
        <button id="mmConfirmar" class="btn btn-primary">Confirmar e Imprimir</button>
      </div>
      <div id="mmStatus" class="hidden mt-2 text-sm"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#mmCancelar').onclick = () => modal.remove();
  modal.querySelector('#mmConfirmar').onclick = async () => {
    const codigo = modal.querySelector('#mmCodigoOp').value.trim();
    if (!codigo) { modal.querySelector('#mmStatus').textContent = 'Informe o código do operador.'; modal.querySelector('#mmStatus').classList.remove('hidden'); return; }
    modal.querySelector('#mmConfirmar').disabled = true;
    try {
      const resultado = await faturamentoSvc.reimpressaoMassa(embarque, codigo);
      modal.querySelector('#mmStatus').textContent = `${resultado.etiquetas} etiqueta(s) enviada(s) para impressão.`;
      modal.querySelector('#mmStatus').classList.remove('hidden');
      setTimeout(() => { modal.remove(); onConcluido?.(); }, 2000);
    } catch (err) {
      modal.querySelector('#mmStatus').textContent = `Erro: ${err.message}`;
      modal.querySelector('#mmStatus').classList.remove('hidden');
      modal.querySelector('#mmConfirmar').disabled = false;
    }
  };
}
```

- [ ] **Step 2: Modificar `public/js/pages/detalhes-carga-expedida.js`**

Adicionar botão "Imprimir etiquetas finais" e seção "Caixas segregadas":

```js
// No render/init da página, importar e usar:
import { abrirModalReimpressaoMassa } from '../ui/composites/modal-reimpressao-massa.js';

// Botão de massa:
const btnMassa = document.createElement('button');
btnMassa.className = 'btn btn-primary';
btnMassa.textContent = 'Imprimir etiquetas finais';
btnMassa.onclick = async () => {
  const preview = await ctx.faturamentoSvc.previewMassa(embarque.numero_embarque);
  abrirModalReimpressaoMassa({ embarque: embarque.numero_embarque, preview, faturamentoSvc: ctx.faturamentoSvc });
};
```

- [ ] **Step 3: Commit**

```bash
git add public/js/ui/composites/modal-reimpressao-massa.js public/js/pages/detalhes-carga-expedida.js
git commit -m "feat(ui): modal de reimpressao em massa na pagina de detalhes expedida"
```

---

## Fase 2 — Aprovação: aprovadores, listagem de segregadas, aprovar/reprovar

### Task 14: Testes adicionais do faturamento-service (aprovar/reprovar)

**Files:**
- Modify: `tests/faturamento-service.test.js`

- [ ] **Step 1: Adicionar os testes ao arquivo existente**

```js
test('aprovarSessao transiciona para aprovada', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  service.aprovarSessao('s1', 'APROV1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'aprovada');
  assert.equal(s.aprovada_por, 'APROV1');
});

test('reprovarSessao transiciona para reprovada', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  service.reprovarSessao('s1', 'APROV1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'reprovada');
});

test('aprovarSessao rejeita aprovador invalido', () => {
  const db = criarDb();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.aprovarSessao('s1', 'INVALIDO'), /inválido/);
});

test('aprovarSessao rejeita aprovador inativo', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('INATIVO', 'X', 0, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.aprovarSessao('s1', 'INATIVO'), /inativo/);
});
```

- [ ] **Step 2: Rodar os testes**

```bash
node --test tests/faturamento-service.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add tests/faturamento-service.test.js
git commit -m "test(domain): testes de aprovar/reprovar sessao com validacao de aprovador"
```

---

### Task 15: Modal de aprovação/reprovação no frontend

**Files:**
- Create: `public/js/ui/composites/modal-aprovar-sessao.js`
- Modify: `public/js/pages/detalhes-carga-expedida.js`

- [ ] **Step 1: Criar `modal-aprovar-sessao.js`**

```js
// public/js/ui/composites/modal-aprovar-sessao.js
export function abrirModalAprovarSessao({ sessao, acao, faturamentoSvc, onConcluido }) {
  const titulo = acao === 'aprovar' ? 'Aprovar Sessão' : 'Reprovar Sessão';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">${titulo}</h2>
      <p>Caixa: <strong>${sessao.numero_caixa}</strong></p>
      <p>Item: <strong>${sessao.item_codigo ?? sessao.codigo_op}</strong></p>
      <div class="form-field">
        <label>Código do aprovador</label>
        <input id="maCodigoAprov" type="text" placeholder="Ex.: APROV1" class="input" />
      </div>
      <div class="modal-actions">
        <button id="maCancelar" class="btn btn-secondary">Cancelar</button>
        <button id="maConfirmar" class="btn ${acao === 'aprovar' ? 'btn-primary' : 'btn-danger'}">${titulo}</button>
      </div>
      <div id="maStatus" class="hidden mt-2 text-sm text-red-600"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#maCancelar').onclick = () => modal.remove();
  modal.querySelector('#maConfirmar').onclick = async () => {
    const codigo = modal.querySelector('#maCodigoAprov').value.trim();
    if (!codigo) { modal.querySelector('#maStatus').textContent = 'Informe o código do aprovador.'; modal.querySelector('#maStatus').classList.remove('hidden'); return; }
    try {
      if (acao === 'aprovar') await faturamentoSvc.aprovarSessao(sessao.id, codigo);
      else await faturamentoSvc.reprovarSessao(sessao.id, codigo);
      modal.remove();
      onConcluido?.();
    } catch (err) {
      modal.querySelector('#maStatus').textContent = err.message;
      modal.querySelector('#maStatus').classList.remove('hidden');
    }
  };
}
```

- [ ] **Step 2: Adicionar seção de caixas segregadas a `detalhes-carga-expedida.js`**

Após o botão de massa, adicionar renderização de segregadas:

```js
import { abrirModalAprovarSessao } from '../ui/composites/modal-aprovar-sessao.js';

async function renderizarSegregadas(container, embarque, ctx) {
  const segregadas = await ctx.faturamentoSvc.listarSegregadas(embarque.numero_embarque);
  if (!segregadas.length) return;

  const secao = document.createElement('section');
  secao.innerHTML = `<h3 class="section-title">Caixas Segregadas</h3>`;
  const lista = document.createElement('ul');
  lista.className = 'divide-y';
  for (const s of segregadas) {
    const li = document.createElement('li');
    li.className = 'py-2 flex items-center justify-between';
    li.innerHTML = `
      <span>Caixa ${s.numero_caixa} — ${s.faturamento_status}</span>
      <span class="flex gap-2">
        <button class="btn btn-sm btn-primary btn-aprovar">Aprovar</button>
        <button class="btn btn-sm btn-danger btn-reprovar">Reprovar</button>
      </span>
    `;
    li.querySelector('.btn-aprovar').onclick = () => abrirModalAprovarSessao({ sessao: s, acao: 'aprovar', faturamentoSvc: ctx.faturamentoSvc, onConcluido: () => renderizarSegregadas(container, embarque, ctx) });
    li.querySelector('.btn-reprovar').onclick = () => abrirModalAprovarSessao({ sessao: s, acao: 'reprovar', faturamentoSvc: ctx.faturamentoSvc, onConcluido: () => renderizarSegregadas(container, embarque, ctx) });
    lista.appendChild(li);
  }
  secao.appendChild(lista);
  container.appendChild(secao);
}
```

- [ ] **Step 3: Commit**

```bash
git add public/js/ui/composites/modal-aprovar-sessao.js public/js/pages/detalhes-carga-expedida.js
git commit -m "feat(ui): modal de aprovacao/reprovacao e secao de caixas segregadas"
```

---

### Task 16: Página de Gestão de Aprovadores

**Files:**
- Create: `public/js/pages/gestao-aprovadores.js`
- Modify: `public/js/app.js`

- [ ] **Step 1: Criar `public/js/pages/gestao-aprovadores.js`**

```js
// public/js/pages/gestao-aprovadores.js
export async function renderGestaoAprovadores(container, ctx) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Gestão de Aprovadores</h1>
    </div>
    <div class="card mb-4">
      <h2 class="card-title">Adicionar Aprovador</h2>
      <div class="form-row">
        <input id="novoCodigo" type="text" placeholder="Código" class="input" />
        <input id="novoNome"   type="text" placeholder="Nome"   class="input" />
        <button id="btnAdicionar" class="btn btn-primary">Adicionar</button>
      </div>
      <div id="erroAdd" class="hidden text-sm text-red-600 mt-1"></div>
    </div>
    <div id="listaAprovadores" class="card"></div>
  `;

  async function carregarLista() {
    const lista = await ctx.faturamentoSvc.listarAprovadores();
    const el = container.querySelector('#listaAprovadores');
    if (!lista.length) { el.innerHTML = '<p class="text-gray-500">Nenhum aprovador cadastrado.</p>'; return; }
    el.innerHTML = `<ul class="divide-y">${lista.map(a => `
      <li class="py-2 flex items-center justify-between">
        <span>${a.codigo} — ${a.nome} ${a.ativo ? '' : '<span class="badge-inactive">inativo</span>'}</span>
        ${a.ativo ? `<button class="btn btn-sm btn-secondary btn-desativar" data-codigo="${a.codigo}">Desativar</button>` : ''}
      </li>
    `).join('')}</ul>`;
    el.querySelectorAll('.btn-desativar').forEach(btn => {
      btn.onclick = async () => {
        await ctx.faturamentoSvc.desativarAprovador(btn.dataset.codigo);
        carregarLista();
      };
    });
  }

  container.querySelector('#btnAdicionar').onclick = async () => {
    const codigo = container.querySelector('#novoCodigo').value.trim();
    const nome   = container.querySelector('#novoNome').value.trim();
    const erroEl = container.querySelector('#erroAdd');
    if (!codigo || !nome) { erroEl.textContent = 'Preencha código e nome.'; erroEl.classList.remove('hidden'); return; }
    try {
      await ctx.faturamentoSvc.inserirAprovador({ codigo, nome });
      container.querySelector('#novoCodigo').value = '';
      container.querySelector('#novoNome').value = '';
      erroEl.classList.add('hidden');
      carregarLista();
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.classList.remove('hidden');
    }
  };

  carregarLista();
}
```

- [ ] **Step 2: Adicionar rota `/aprovadores` em `public/js/app.js`**

Localizar o objeto/array de rotas do SPA. Adicionar:

```js
import { renderGestaoAprovadores } from './pages/gestao-aprovadores.js';
// ...
'/aprovadores': (container) => renderGestaoAprovadores(container, ctx),
```

Adicionar link de navegação no menu lateral (se houver) ou no cabeçalho.

- [ ] **Step 3: Commit**

```bash
git add public/js/pages/gestao-aprovadores.js public/js/app.js
git commit -m "feat(ui): pagina de gestao de aprovadores"
```

---

## Fase 3 — Realocação: sugestão, confirmação, elegibilidade na massa do destino

### Task 17: Testes de realocação no faturamento-service

**Files:**
- Modify: `tests/faturamento-service.test.js`

- [ ] **Step 1: Adicionar testes de realocação**

```js
test('confirmarRealocacao seta embarque_destino e status realocada', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E2', 'aberto')`).run();
  inserirSessao(db, 's1', { faturamento_status: 'reprovada' });
  const { service } = criarServico(db);
  service.confirmarRealocacao('s1', 'E2');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'realocada');
  assert.equal(s.embarque_destino, 'E2');
});

test('confirmarRealocacao rejeita destino faturado', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, finalizada_em) VALUES ('E2', 'faturado', '2026-05-01T10:00:00.000Z')`).run();
  inserirSessao(db, 's1', { faturamento_status: 'reprovada' });
  const { service } = criarServico(db);
  assert.throws(() => service.confirmarRealocacao('s1', 'E2'), /faturado/);
});

test('reimpressaoMassa inclui sessoes realocadas para o embarque destino', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E2', 'faturado', '99999')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP2', 'IT2', 'Item 2')`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status, embarque_destino)
    VALUES ('sRealocada', 'E1', 'OP2', 'A', 1, 'CX9', 3,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', 'realocada', 'E2')
  `).run();

  const emitidos = [];
  const svc = criarFaturamentoService({
    db,
    enfileirarSync: () => {},
    registrarEvento: () => {},
    broadcast: () => {},
    caixaLabelService: { emitir: async ({ numero_caixa }) => { emitidos.push(numero_caixa); return { partes_total: 1 }; } },
    now: () => '2026-05-01T10:00:00.000Z',
  });

  await svc.reimpressaoMassa('E2', 'A');
  assert.ok(emitidos.includes('CX9'));
});
```

- [ ] **Step 2: Rodar os testes**

```bash
node --test tests/faturamento-service.test.js
```

Esperado: todos os testes passam.

- [ ] **Step 3: Commit**

```bash
git add tests/faturamento-service.test.js
git commit -m "test(domain): testes de realocacao — confirmar destino e elegibilidade na massa"
```

---

### Task 18: Modal de realocação no frontend

**Files:**
- Create: `public/js/ui/composites/modal-realocar-sessao.js`
- Modify: `public/js/pages/detalhes-carga-expedida.js`

- [ ] **Step 1: Criar `modal-realocar-sessao.js`**

```js
// public/js/ui/composites/modal-realocar-sessao.js
export function abrirModalRealocarSessao({ sessao, embarquesAbertos, faturamentoSvc, onConcluido }) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  const opcoes = embarquesAbertos.map(e => `<option value="${e.numero_embarque}">${e.numero_embarque}</option>`).join('');
  modal.innerHTML = `
    <div class="modal-box">
      <h2 class="modal-title">Realocar Sessão</h2>
      <p>Caixa: <strong>${sessao.numero_caixa}</strong></p>
      <div class="form-field">
        <label>Embarque destino</label>
        <select id="mrEmbarque" class="input">
          <option value="">Selecione...</option>
          ${opcoes}
        </select>
      </div>
      <div class="modal-actions">
        <button id="mrCancelar" class="btn btn-secondary">Cancelar</button>
        <button id="mrConfirmar" class="btn btn-primary">Realocar</button>
      </div>
      <div id="mrStatus" class="hidden mt-2 text-sm text-red-600"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#mrCancelar').onclick = () => modal.remove();
  modal.querySelector('#mrConfirmar').onclick = async () => {
    const dest = modal.querySelector('#mrEmbarque').value;
    if (!dest) { modal.querySelector('#mrStatus').textContent = 'Selecione o embarque destino.'; modal.querySelector('#mrStatus').classList.remove('hidden'); return; }
    try {
      await faturamentoSvc.realocarSessao(sessao.id, dest);
      modal.remove();
      onConcluido?.();
    } catch (err) {
      modal.querySelector('#mrStatus').textContent = err.message;
      modal.querySelector('#mrStatus').classList.remove('hidden');
    }
  };
}
```

- [ ] **Step 2: Adicionar botão Realocar nas sessões reprovadas em `detalhes-carga-expedida.js`**

Na renderização da lista de segregadas, para sessões com `faturamento_status === 'reprovada'`, adicionar botão:

```js
import { abrirModalRealocarSessao } from '../ui/composites/modal-realocar-sessao.js';

// Na renderização da li de uma sessão reprovada:
if (s.faturamento_status === 'reprovada') {
  const btnRealocar = li.querySelector('.btn-realocar');
  btnRealocar.onclick = async () => {
    const embarquesAbertos = await fetch('/api/embarques?status=aberto').then(r => r.json()).catch(() => []);
    abrirModalRealocarSessao({ sessao: s, embarquesAbertos, faturamentoSvc: ctx.faturamentoSvc, onConcluido: () => renderizarSegregadas(container, embarque, ctx) });
  };
}
```

(Adaptar a rota de listagem de embarques abertos à API existente no projeto.)

- [ ] **Step 3: Commit**

```bash
git add public/js/ui/composites/modal-realocar-sessao.js public/js/pages/detalhes-carga-expedida.js
git commit -m "feat(ui): modal de realocacao de sessao reprovada"
```

---

### Task 19: Banner de sugestão de realocação ao abrir embarque novo

**Files:**
- Modify: `public/js/pages/detalhes-carga.js`

- [ ] **Step 1: Adicionar banner de sugestão**

No `render` de `detalhes-carga.js`, após carregar os dados do embarque, adicionar:

```js
async function renderizarBannerRealocacao(container, embarque, ctx) {
  const sugestoes = await ctx.faturamentoSvc.sugerirRealocacoes(embarque.numero_embarque);
  if (!sugestoes.length) return;
  const banner = document.createElement('div');
  banner.className = 'banner-warning mb-4';
  banner.innerHTML = `
    <strong>${sugestoes.length} item(s) reprovado(s)</strong> de embarques anteriores podem ser realocados para este embarque.
    <a href="#segregadas" class="link ml-2">Ver sugestões</a>
  `;
  container.prepend(banner);
}
```

Chamar essa função no init da página passando o embarque atual.

- [ ] **Step 2: Commit**

```bash
git add public/js/pages/detalhes-carga.js
git commit -m "feat(ui): banner de sugestao de realocacao ao abrir embarque novo"
```

---

### Task 20: Teste de integração end-to-end do ciclo completo

**Files:**
- Create: `tests/faturamento-ciclo.test.js`

- [ ] **Step 1: Escrever o teste de ciclo completo**

```js
// tests/faturamento-ciclo.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarFaturamentoService } from '../src/domain/faturamento-service.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E2', 'aberto')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  return db;
}

function inserirSessaoEncerrada(db, id, extra = {}) {
  const { caixa = 'CX1', faturamento_status = 'regular' } = extra;
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES (?, 'E1', 'OP1', 'A', 1, ?, 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', ?)
  `).run(id, caixa, faturamento_status);
}

test('ciclo completo: NF → finalizar → tardio → aprovar → massa; e reprovado → realocar', async () => {
  const db = criarDb();
  const emitidos = [];
  const svc = criarFaturamentoService({
    db,
    enfileirarSync: () => {},
    registrarEvento: () => {},
    broadcast: () => {},
    caixaLabelService: {
      emitir: async ({ numero_caixa }) => { emitidos.push(numero_caixa); return { partes_total: 1 }; },
    },
    now: () => '2026-05-01T10:00:00.000Z',
  });

  // Sessão regular encerrada antes da NF
  inserirSessaoEncerrada(db, 'sReg', { caixa: 'CX1' });

  // --- Fase 1: NF chega, embarque finaliza ---
  assert.equal(svc.embarqueFinalizado('E1'), false);
  svc.aoReceberNF('E1');
  assert.equal(svc.embarqueFinalizado('E1'), true);

  // --- Encerramento tardio ---
  inserirSessaoEncerrada(db, 'sTardio', { caixa: 'CX2', faturamento_status: 'regular' });
  svc.marcarEncerramentoTardio('sTardio');
  const tardio = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sTardio'`).get();
  assert.equal(tardio.faturamento_status, 'pendente_aprovacao');

  // Preview: CX1 elegível, CX2 não
  const preview = svc.previewMassa('E1');
  assert.equal(preview.caixas, 1);

  // --- Fase 2: Aprovar sTardio ---
  svc.aprovarSessao('sTardio', 'APROV1');
  const aprovada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sTardio'`).get();
  assert.equal(aprovada.faturamento_status, 'aprovada');
  const previewPos = svc.previewMassa('E1');
  assert.equal(previewPos.caixas, 2);

  // --- Massa após aprovação ---
  await svc.reimpressaoMassa('E1', 'A');
  assert.ok(emitidos.includes('CX1'));
  assert.ok(emitidos.includes('CX2'));

  // --- Fase 3: Reprovar e realocar ---
  inserirSessaoEncerrada(db, 'sReprov', { caixa: 'CX3', faturamento_status: 'regular' });
  svc.reprovarSessao('sReprov', 'APROV1');
  const reprovada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sReprov'`).get();
  assert.equal(reprovada.faturamento_status, 'reprovada');

  const sugestoes = svc.sugerirRealocacoes('E2');
  assert.ok(sugestoes.some(s => s.id === 'sReprov'));

  svc.confirmarRealocacao('sReprov', 'E2');
  const realocada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sReprov'`).get();
  assert.equal(realocada.faturamento_status, 'realocada');
  assert.equal(realocada.embarque_destino, 'E2');

  // Massa do E2 deve incluir a sessão realocada
  const emitidosE2 = [];
  const svcE2 = criarFaturamentoService({
    db,
    enfileirarSync: () => {},
    registrarEvento: () => {},
    broadcast: () => {},
    caixaLabelService: { emitir: async ({ numero_caixa }) => { emitidosE2.push(numero_caixa); return { partes_total: 1 }; } },
    now: () => '2026-05-01T11:00:00.000Z',
  });
  db.prepare(`UPDATE embarques SET numero_nota_fiscal = '99999' WHERE numero_embarque = 'E2'`).run();
  svcE2.aoReceberNF('E2');
  await svcE2.reimpressaoMassa('E2', 'A');
  assert.ok(emitidosE2.includes('CX3'));
});
```

- [ ] **Step 2: Rodar o teste**

```bash
node --test tests/faturamento-ciclo.test.js
```

Esperado: todos os assertions passam.

- [ ] **Step 3: Commit**

```bash
git add tests/faturamento-ciclo.test.js
git commit -m "test(integration): ciclo completo NF->finalizar->tardio->aprovar->massa->realocar"
```

---

### Task 21: Smoke test e checklist final

**Files:** Nenhum arquivo novo.

- [ ] **Step 1: Rodar toda a suite de testes**

```bash
npm test
```

Esperado: todos os testes passam (incluindo os pré-existentes de caixa-label-service, etiquetas-routes, etc.).

- [ ] **Step 2: Iniciar o servidor e verificar rotas**

```bash
npm run dev
```

Verificar:
- `GET http://localhost:3000/faturamento/embarques/E1/reimpressao-massa/preview` responde (mesmo que vazio).
- `GET http://localhost:3000/faturamento/aprovadores` responde `[]`.
- A página de seleção de carga carrega sem erros de console.
- A rota `/aprovadores` é acessível no SPA.

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "chore: smoke test e ajustes finais da Feature 2 — ciclo NF, segregacao, realocacao"
```

---

## Resumo de Arquivos

| Ação | Arquivo |
|---|---|
| Create | `src/db/migrations/005_faturamento.sql` |
| Create | `supabase/migrations/005_faturamento.sql` |
| Create | `src/db/queries/faturamento.js` |
| Create | `src/domain/faturamento-service.js` |
| Create | `src/http/routes/faturamento.js` |
| Create | `public/js/domain/faturamento-service.js` |
| Create | `public/js/ui/composites/modal-reimpressao-massa.js` |
| Create | `public/js/ui/composites/modal-aprovar-sessao.js` |
| Create | `public/js/ui/composites/modal-realocar-sessao.js` |
| Create | `public/js/pages/gestao-aprovadores.js` |
| Create | `tests/faturamento-queries.test.js` |
| Create | `tests/faturamento-routes.test.js` |
| Create | `tests/faturamento-service.test.js` |
| Create | `tests/reverse-poller.test.js` |
| Create | `tests/faturamento-ciclo.test.js` |
| Modify | `src/sync/reverse-poller.js` |
| Modify | `src/sync/supabase-client.js` |
| Modify | `src/labels/caixa-label-service.js` |
| Modify | `src/domain/sessao-service.js` |
| Modify | `src/server.js` |
| Modify | `public/js/app.js` |
| Modify | `public/js/pages/selecao-carga.js` |
| Modify | `public/js/pages/detalhes-carga.js` |
| Modify | `public/js/pages/detalhes-carga-expedida.js` |
| Modify | `public/js/ui/composites/modal-encerrar-sessao.js` |
| Modify | `tests/caixa-label-service.test.js` |
| Modify | `tests/sessao-service.test.js` |
