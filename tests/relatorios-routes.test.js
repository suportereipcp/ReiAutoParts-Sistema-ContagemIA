import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import ExcelJS from 'exceljs';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP } from '../src/db/queries/espelhos.js';
import { criarSessao, encerrarSessao, incrementarContagem } from '../src/db/queries/sessoes.js';
import { rotasRelatorios } from '../src/http/routes/relatorios.js';

async function bootstrap() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'fechado' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'SKU-1', item_descricao: 'Disco Freio' });
  criarSessao(db, {
    id: 'S1',
    numero_embarque: 'E1',
    codigo_op: 'OP1',
    codigo_operador: '1807',
    camera_id: 1,
    programa_numero: 1,
    programa_nome: 'PECA-A',
    iniciada_em: '2026-04-24T10:00:00Z',
  });
  incrementarContagem(db, 'S1', 42);
  encerrarSessao(db, 'S1', 'CX-001', '2026-04-24T10:30:00Z');

  const fastify = Fastify({ logger: false });
  rotasRelatorios(fastify, { db });
  await fastify.ready();
  return { fastify };
}

test('relatorio XLSX destaca o cabecalho com cor e negrito', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E1?fmt=xlsx' });
  assert.equal(resposta.statusCode, 200);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(resposta.rawPayload);
  const sheet = workbook.getWorksheet('Embarque E1');
  const header = sheet.getRow(1);

  assert.equal(header.font.bold, true);
  assert.equal(header.font.color.argb, 'FFFFFFFF');
  assert.equal(header.fill.type, 'pattern');
  assert.equal(header.fill.fgColor.argb, 'FF4A5F66');
});

test('relatorio PDF retorna arquivo com cabecalho visual de embarque', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E1?fmt=pdf' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'application/pdf');
  assert.match(resposta.headers['content-disposition'], /attachment; filename=embarque-E1\.pdf/);
  assert.ok(resposta.rawPayload.length > 1000);
});
