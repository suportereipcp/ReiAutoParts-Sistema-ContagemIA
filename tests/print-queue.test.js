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
    transport: { enviar: async (payload) => { enviados.push(payload); } },
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
