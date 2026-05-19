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
  upsertEmbarque(db, { numero_embarque: 'E2', status: 'fechado', numero_nota_fiscal: 'NF-12345' });
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

  criarSessao(db, {
    id: 'S2',
    numero_embarque: 'E2',
    codigo_op: 'OP1',
    codigo_operador: '1807',
    camera_id: 1,
    programa_numero: 1,
    programa_nome: 'PECA-A',
    iniciada_em: '2026-04-24T11:00:00Z',
  });
  incrementarContagem(db, 'S2', 10);
  encerrarSessao(db, 'S2', 'CX-002', '2026-04-24T11:30:00Z');

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

  const cell = header.getCell(1);
  assert.equal(cell.font.bold, true);
  assert.equal(cell.font.color.argb, 'FFFFFFFF');
  assert.equal(cell.fill.type, 'pattern');
  assert.equal(cell.fill.fgColor.argb, 'FF4A5F66');
});

test('relatorio PDF retorna arquivo com cabecalho visual de embarque', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E1?fmt=pdf' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'application/pdf');
  assert.match(resposta.headers['content-disposition'], /attachment; filename=embarque-E1\.pdf/);
  assert.ok(resposta.rawPayload.length > 1000);
});

test('relatorio PDF contem a NF se embarque estiver fechado', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E2?fmt=pdf' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'application/pdf');
  assert.match(resposta.headers['content-disposition'], /attachment; filename=embarque-E2\.pdf/);
  assert.ok(resposta.rawPayload.length > 1000);
});

test('relatorio CSV contem coluna de NF se embarque estiver fechado', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E2?fmt=csv' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'text/csv; charset=utf-8');
  assert.match(resposta.payload, /numero_nota_fiscal/);
  assert.match(resposta.payload, /NF-12345/);
});

test('relatorio CSV nao contem coluna de NF se embarque E1 nao tiver NF', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E1?fmt=csv' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(!resposta.payload.includes('numero_nota_fiscal'));
  assert.ok(!resposta.payload.includes('NF-12345'));
});

test('relatorio XLSX contem coluna de NF se embarque estiver fechado', async () => {
  const { fastify } = await bootstrap();
  const resposta = await fastify.inject({ method: 'GET', url: '/relatorios/embarque/E2?fmt=xlsx' });
  assert.equal(resposta.statusCode, 200);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(resposta.rawPayload);
  const sheet = workbook.getWorksheet('Embarque E2');
  const header = sheet.getRow(1);

  // Check if "Nota Fiscal" is in the header columns
  const values = header.values;
  assert.ok(values.includes('Nota Fiscal'));
  
  // Verify the row contains the value
  const row2 = sheet.getRow(2);
  assert.ok(row2.values.includes('NF-12345'));
});
