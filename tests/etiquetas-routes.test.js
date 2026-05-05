import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasEtiquetas } from '../src/http/routes/etiquetas.js';

test('POST /etiquetas/caixas cria reimpressao', async () => {
  const app = Fastify();
  rotasEtiquetas(app, {
    caixaLabelService: {
      reimprimir: async () => ({ id: 'etq-1', status: 'pendente', partes_total: 1 }),
    },
    etiquetasQueries: {
      listarEtiquetasDaCaixa: () => [],
      retryEtiqueta: () => null,
    },
  });

  const res = await app.inject({
    method: 'POST',
    url: '/etiquetas/caixas',
    payload: { numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(JSON.parse(res.body).id, 'etq-1');
});

test('POST /etiquetas/caixas valida campos obrigatorios', async () => {
  const app = Fastify();
  rotasEtiquetas(app, {
    caixaLabelService: { reimprimir: async () => ({}) },
    etiquetasQueries: { listarEtiquetasDaCaixa: () => [], retryEtiqueta: () => null },
  });

  const res = await app.inject({ method: 'POST', url: '/etiquetas/caixas', payload: { numero_embarque: 'E1' } });

  assert.equal(res.statusCode, 400);
});

test('GET /etiquetas/caixas lista historico', async () => {
  const app = Fastify();
  rotasEtiquetas(app, {
    caixaLabelService: { reimprimir: async () => ({}) },
    etiquetasQueries: {
      listarEtiquetasDaCaixa: (e, c) => [{ id: 'etq-1', numero_embarque: e, numero_caixa: c }],
      retryEtiqueta: () => null,
    },
  });

  const res = await app.inject({ method: 'GET', url: '/etiquetas/caixas?embarque=E1&caixa=CX1' });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body)[0].id, 'etq-1');
});

test('POST /etiquetas/:id/retry chama queries.retry', async () => {
  const app = Fastify();
  let chamado = null;
  rotasEtiquetas(app, {
    caixaLabelService: { reimprimir: async () => ({}) },
    etiquetasQueries: {
      listarEtiquetasDaCaixa: () => [],
      retryEtiqueta: async (id) => { chamado = id; return { id, status: 'pendente' }; },
    },
  });

  const res = await app.inject({ method: 'POST', url: '/etiquetas/etq-1/retry' });
  assert.equal(res.statusCode, 200);
  assert.equal(chamado, 'etq-1');
});
