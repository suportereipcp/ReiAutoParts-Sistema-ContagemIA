import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import {
  buscarProgramaCalibracao,
  excluirProgramaCalibracao,
  listarProgramasCalibracao,
  proximaVersaoCalibracao,
  salvarCicloCalibracao,
} from '../src/db/queries/calibracao.js';

const TAMANHOS = ['nano', 'small', 'medium'];

function programas(prefixo, versao) {
  return TAMANHOS.map((tamanho, index) => ({
    id: `${prefixo}-${tamanho}`,
    tamanho,
    programa_numero: 120 + index,
    programa_nome: `CAL-${tamanho.toUpperCase()}-V${versao}`,
    modelo_path: `data/modelos/${prefixo}-${tamanho}.pt`,
  }));
}

test('salvarCicloCalibracao persiste um programa por tamanho e versao', () => {
  const db = openDatabase(':memory:');

  salvarCicloCalibracao(db, {
    camera_id: 1,
    versao: 1,
    treinado_em: '2026-05-04T10:00:00.000Z',
    programas: programas('c1v1', 1),
  });

  const rows = listarProgramasCalibracao(db, 1);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.tamanho), TAMANHOS);
  assert.ok(rows.every((row) => row.camera_id === 1));
  assert.ok(rows.every((row) => row.versao === 1));
});

test('novo ciclo substitui as tres versoes anteriores da camera', () => {
  const db = openDatabase(':memory:');
  salvarCicloCalibracao(db, {
    camera_id: 1,
    versao: 1,
    treinado_em: '2026-05-04T10:00:00.000Z',
    programas: programas('c1v1', 1),
  });

  salvarCicloCalibracao(db, {
    camera_id: 1,
    versao: 2,
    treinado_em: '2026-05-04T11:00:00.000Z',
    programas: programas('c1v2', 2),
  });

  const rows = listarProgramasCalibracao(db, 1);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.id), ['c1v2-nano', 'c1v2-small', 'c1v2-medium']);
  assert.ok(rows.every((row) => row.versao === 2));
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM programas_calibracao WHERE camera_id = 1').get().total, 3);
});

test('excluirProgramaCalibracao remove um tamanho sem afetar os demais', () => {
  const db = openDatabase(':memory:');
  salvarCicloCalibracao(db, {
    camera_id: 2,
    versao: 1,
    treinado_em: '2026-05-04T10:00:00.000Z',
    programas: programas('c2v1', 1),
  });

  const removido = excluirProgramaCalibracao(db, 'c2v1-small');

  assert.equal(removido, true);
  assert.equal(buscarProgramaCalibracao(db, 'c2v1-small'), null);
  assert.deepEqual(listarProgramasCalibracao(db, 2).map((row) => row.tamanho), ['nano', 'medium']);
});

test('proximaVersaoCalibracao incrementa por camera', () => {
  const db = openDatabase(':memory:');
  salvarCicloCalibracao(db, {
    camera_id: 1,
    versao: 4,
    treinado_em: '2026-05-04T10:00:00.000Z',
    programas: programas('c1v4', 4),
  });

  assert.equal(proximaVersaoCalibracao(db, 1), 5);
  assert.equal(proximaVersaoCalibracao(db, 2), 1);
});
