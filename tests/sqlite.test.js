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
