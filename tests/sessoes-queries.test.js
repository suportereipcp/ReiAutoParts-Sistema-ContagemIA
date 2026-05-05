import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { criarSessao, buscarAtivaPorCamera, incrementarContagem, encerrarSessao, listarPorEmbarque } from '../src/db/queries/sessoes.js';

function setup() {
  const db = openDatabase(':memory:');
  db.prepare('INSERT INTO embarques (numero_embarque, status) VALUES (?, ?)').run('E1', 'aberto');
  db.prepare('INSERT INTO ordens_producao (codigo_op) VALUES (?)').run('OP1');
  db.prepare('INSERT INTO operadores (codigo, nome) VALUES (?, ?)').run('001', 'Fulano');
  return db;
}

test('criarSessao persiste registro ativo', () => {
  const db = setup();
  criarSessao(db, {
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

test('mesma caixa pode receber múltiplas sessões no mesmo embarque', () => {
  const db = setup();
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  encerrarSessao(db, 'u1', 'CX-001', '2026-04-17T11:00:00Z');
  criarSessao(db, { id: 'u2', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2, iniciada_em: '2026-04-17T11:00:00Z' });
  assert.doesNotThrow(() => encerrarSessao(db, 'u2', 'CX-001', '2026-04-17T12:00:00Z'));
  const rows = db.prepare('SELECT * FROM sessoes_contagem WHERE numero_caixa = ?').all('CX-001');
  assert.equal(rows.length, 2);
});

test('listarPorEmbarque retorna todas (ativas + encerradas) do embarque', () => {
  const db = setup();
  db.prepare('INSERT INTO embarques (numero_embarque, status) VALUES (?, ?)').run('E2', 'aberto');
  criarSessao(db, { id: 'a', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-01-01T00:00:00Z' });
  criarSessao(db, { id: 'b', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2, iniciada_em: '2026-01-01T00:01:00Z' });
  encerrarSessao(db, 'b', 'CX-1', '2026-01-01T00:02:00Z');
  criarSessao(db, { id: 'c', numero_embarque: 'E2', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2, iniciada_em: '2026-01-01T00:03:00Z' });
  const r = listarPorEmbarque(db, 'E1');
  assert.equal(r.length, 2);
  assert.ok(r.every(s => s.numero_embarque === 'E1'));
});
