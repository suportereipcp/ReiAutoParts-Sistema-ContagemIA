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

test('aprovarSessao transiciona para aprovada', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service, broadcasts, syncs } = criarServico(db);
  service.aprovarSessao('s1', 'APROV1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'aprovada');
  assert.equal(s.aprovada_por, 'APROV1');
  assert.equal(s.aprovada_em, '2026-05-01T10:00:00.000Z');
  assert.equal(syncs.length, 1);
  assert.equal(syncs[0].tabela, 'sessoes_contagem');
  assert.deepEqual(syncs[0].payload, { id: 's1' });
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].tipo, 'sessao.aprovada');
  assert.deepEqual(broadcasts[0].dados, { sessao_id: 's1' });
});

test('reprovarSessao transiciona para reprovada', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service, broadcasts, syncs } = criarServico(db);
  service.reprovarSessao('s1', 'APROV1');
  const s = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 's1'`).get();
  assert.equal(s.faturamento_status, 'reprovada');
  assert.equal(s.aprovada_por, 'APROV1');
  assert.equal(s.aprovada_em, '2026-05-01T10:00:00.000Z');
  assert.equal(syncs.length, 1);
  assert.equal(syncs[0].tabela, 'sessoes_contagem');
  assert.deepEqual(syncs[0].payload, { id: 's1' });
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].tipo, 'sessao.reprovada');
  assert.deepEqual(broadcasts[0].dados, { sessao_id: 's1' });
});

test('aprovarSessao rejeita aprovador invalido', () => {
  const db = criarDb();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.aprovarSessao('s1', 'INVALIDO'), (err) => {
    assert.match(err.message, /inválido/);
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('aprovarSessao rejeita aprovador inativo', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('INATIVO', 'X', 0, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.aprovarSessao('s1', 'INATIVO'), (err) => {
    assert.match(err.message, /inativo/);
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('reprovarSessao rejeita aprovador invalido', () => {
  const db = criarDb();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.reprovarSessao('s1', 'INVALIDO'), (err) => {
    assert.match(err.message, /inválido/);
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('reprovarSessao rejeita aprovador inativo', () => {
  const db = criarDb();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('INATIVO', 'X', 0, datetime('now'))`).run();
  inserirSessao(db, 's1', { faturamento_status: 'pendente_aprovacao' });
  const { service } = criarServico(db);
  assert.throws(() => service.reprovarSessao('s1', 'INATIVO'), (err) => {
    assert.match(err.message, /inativo/);
    assert.equal(err.statusCode, 400);
    return true;
  });
});
