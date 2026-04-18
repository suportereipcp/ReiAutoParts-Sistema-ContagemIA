import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { enfileirar, listarPendentes, marcarSincronizado, marcarFalha, contarPendentes } from '../src/db/queries/outbox.js';

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

test('contarPendentes retorna apenas não sincronizados', () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 't', { a: 1 });
  const id = enfileirar(db, 't', { a: 2 });
  marcarSincronizado(db, id);
  assert.equal(contarPendentes(db), 1);
});
