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
  buscarEmbarque,
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

test('buscarEmbarque retorna embarque por numero', () => {
  const db = criarDb();
  const e = buscarEmbarque(db, 'E1');
  assert.equal(e.numero_embarque, 'E1');
  assert.equal(e.status, 'aberto');
});

test('buscarEmbarque retorna undefined para embarque inexistente', () => {
  const db = criarDb();
  const e = buscarEmbarque(db, 'INEXISTENTE');
  assert.equal(e, undefined);
});
