import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasFaturamento } from '../src/http/routes/faturamento.js';

function criarServico(overrides = {}) {
  return {
    previewMassa: async (n) => ({ caixas: 2, etiquetas: 4 }),
    reimpressaoMassa: async (n, op) => ({ etiquetas: 4, caixas: 2, caixas_puladas: [] }),
    listarSegregadas: (n) => [{ id: 's1', numero_caixa: 'CX1', faturamento_status: 'pendente_aprovacao' }],
    aprovarSessao: (id, aprov) => {},
    reprovarSessao: (id, aprov) => {},
    sugerirRealocacoes: (n) => [],
    confirmarRealocacao: (id, dest) => {},
    gerenciarAprovadores: () => ({
      listar: () => [{ codigo: 'A1', nome: 'Ana', ativo: 1 }],
      inserir: () => {},
      desativar: () => {},
    }),
    ...overrides,
  };
}

async function criarApp(overrides = {}) {
  const app = Fastify();
  rotasFaturamento(app, { faturamentoService: criarServico(overrides) });
  return app;
}

test('GET /faturamento/embarques/:n/reimpressao-massa/preview retorna contagem', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/embarques/E1/reimpressao-massa/preview' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { caixas: 2, etiquetas: 4 });
});

test('POST /faturamento/embarques/:n/reimpressao-massa dispara a massa', async () => {
  const app = await criarApp();
  const res = await app.inject({
    method: 'POST', url: '/faturamento/embarques/E1/reimpressao-massa',
    payload: { codigo_operador: 'A' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).etiquetas, 4);
});

test('POST /faturamento/embarques/:n/reimpressao-massa requer codigo_operador', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/embarques/E1/reimpressao-massa', payload: {} });
  assert.equal(res.statusCode, 400);
});

test('GET /faturamento/embarques/:n/segregadas retorna lista', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/embarques/E1/segregadas' });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).length, 1);
});

test('POST /faturamento/sessoes/:id/aprovar valida payload', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/aprovar', payload: { codigo_aprovador: 'A1' } });
  assert.equal(res.statusCode, 200);
});

test('POST /faturamento/sessoes/:id/reprovar valida payload', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/reprovar', payload: { codigo_aprovador: 'A1' } });
  assert.equal(res.statusCode, 200);
});

test('GET /faturamento/aprovadores lista aprovadores', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'GET', url: '/faturamento/aprovadores' });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body)[0].codigo, 'A1');
});

test('POST /faturamento/aprovadores insere aprovador', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/aprovadores', payload: { codigo: 'B2', nome: 'Bruno' } });
  assert.equal(res.statusCode, 201);
});

test('POST /faturamento/sessoes/:id/realocar confirma realocacao', async () => {
  const app = await criarApp();
  const res = await app.inject({ method: 'POST', url: '/faturamento/sessoes/s1/realocar', payload: { embarque_destino: 'E2' } });
  assert.equal(res.statusCode, 200);
});
