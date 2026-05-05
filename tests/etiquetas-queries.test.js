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
  recolocarPartesErroNaFila,
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
    sessao_origem_id: null,
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

test('recoloca partes em erro de volta para a fila', () => {
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
  marcarParteErro(db, 'p1', 'falha');
  atualizarStatusEtiquetaPorPartes(db, 'etq-1', '2026-04-25T10:01:00.000Z');

  recolocarPartesErroNaFila(db, 'etq-1');

  assert.equal(buscarEtiquetaPorId(db, 'etq-1').status, 'pendente');
  assert.equal(listarPartesPendentes(db).length, 1);
});
