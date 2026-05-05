import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasCalibracao } from '../src/http/routes/calibracao.js';

async function app(service) {
  const fastify = Fastify({ logger: false });
  rotasCalibracao(fastify, { calibracaoService: service });
  await fastify.ready();
  return fastify;
}

test('GET /calibracao/programas lista por camera', async () => {
  const chamadas = [];
  const fastify = await app({
    listar: (cameraId) => {
      chamadas.push(cameraId);
      return [{ id: 'p1', tamanho: 'nano', camera_id: cameraId }];
    },
  });

  const r = await fastify.inject({ method: 'GET', url: '/calibracao/programas?camera=2' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(chamadas, [2]);
  assert.equal(r.json()[0].camera_id, 2);
});

test('POST /calibracao/programas/treinar regenera trio de programas', async () => {
  const chamadas = [];
  const fastify = await app({
    treinar: (payload) => {
      chamadas.push(payload);
      return [{ id: 'p1', tamanho: 'nano' }, { id: 'p2', tamanho: 'small' }, { id: 'p3', tamanho: 'medium' }];
    },
  });

  const r = await fastify.inject({
    method: 'POST',
    url: '/calibracao/programas/treinar',
    payload: { camera: 1 },
  });

  assert.equal(r.statusCode, 201);
  assert.deepEqual(chamadas, [{ camera_id: 1, programas: undefined }]);
  assert.equal(r.json().length, 3);
});

test('DELETE /calibracao/programas/:id exclui individualmente', async () => {
  const chamadas = [];
  const fastify = await app({
    excluir: (id) => {
      chamadas.push(id);
      return true;
    },
  });

  const r = await fastify.inject({ method: 'DELETE', url: '/calibracao/programas/p2' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { ok: true });
  assert.deepEqual(chamadas, ['p2']);
});

test('POST /calibracao/programas/:id/executar inicia sessao visual', async () => {
  const chamadas = [];
  const fastify = await app({
    executar: async (id) => {
      chamadas.push(id);
      return { id: 's1', programa_id: id, status: 'ativa' };
    },
  });

  const r = await fastify.inject({ method: 'POST', url: '/calibracao/programas/p1/executar' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(chamadas, ['p1']);
  assert.equal(r.json().status, 'ativa');
});

test('POST /calibracao/sessoes/encerrar encerra por camera', async () => {
  const chamadas = [];
  const fastify = await app({
    encerrarPorCamera: async (cameraId) => {
      chamadas.push(cameraId);
      return { camera_id: cameraId, status: 'encerrada' };
    },
  });

  const r = await fastify.inject({
    method: 'POST',
    url: '/calibracao/sessoes/encerrar',
    payload: { camera: 1 },
  });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(chamadas, [1]);
  assert.equal(r.json().status, 'encerrada');
});

test('rotas de execucao retornam conflito para camera ocupada', async () => {
  const fastify = await app({
    executar: async () => {
      throw new Error('Camera 1 possui sessao de contagem ativa.');
    },
  });

  const r = await fastify.inject({ method: 'POST', url: '/calibracao/programas/p1/executar' });

  assert.equal(r.statusCode, 409);
  assert.match(r.json().erro, /sessao de contagem ativa/i);
});
