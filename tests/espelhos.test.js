import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador, lerCursor, salvarCursor, buscarEmbarque, listarEmbarquesAbertos, listarOperadoresAtivos } from '../src/db/queries/espelhos.js';

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
