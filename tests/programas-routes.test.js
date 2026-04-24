import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasProgramas } from '../src/http/routes/programas.js';

async function app(cameraManagers) {
  const fastify = Fastify({ logger: false });
  rotasProgramas(fastify, { cameraManagers });
  await fastify.ready();
  return fastify;
}

test('GET /programas retorna apenas cache da camera selecionada', async () => {
  const chamadas = [];
  const fastify = await app(new Map([
    [1, { cameraId: 1, async listarProgramas(q) { chamadas.push(['c1', q]); return [{ numero: 1, nome: 'CAM1-A' }]; } }],
    [2, { cameraId: 2, async listarProgramas(q) { chamadas.push(['c2', q]); return [{ numero: 2, nome: 'CAM2-A' }]; } }],
  ]));

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=2&q=cam2' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 2, nome: 'CAM2-A' }]);
  assert.deepEqual(chamadas, [['c2', 'cam2']]);
});

test('GET /programas nao exige camera conectada quando cache existe', async () => {
  const fastify = await app(new Map([
    [1, {
      cameraId: 1,
      estado: 'desconectada',
      client: { conectado: false },
      async listarProgramas() { return [{ numero: 4, nome: 'CACHE-OFFLINE' }]; },
    }],
  ]));

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=1' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 4, nome: 'CACHE-OFFLINE' }]);
});

test('POST /programas/atualizar atualiza apenas camera selecionada', async () => {
  const chamadas = [];
  const fastify = await app(new Map([
    [1, { cameraId: 1, async atualizarProgramas() { chamadas.push('c1'); return [{ numero: 1, nome: 'A' }]; } }],
    [2, { cameraId: 2, async atualizarProgramas() { chamadas.push('c2'); return [{ numero: 2, nome: 'B' }]; } }],
  ]));

  const r = await fastify.inject({ method: 'POST', url: '/programas/atualizar', payload: { camera: 1 } });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 1, nome: 'A' }]);
  assert.deepEqual(chamadas, ['c1']);
});

test('POST /programas/atualizar bloqueia camera ativa', async () => {
  const fastify = await app(new Map([
    [1, {
      cameraId: 1,
      async atualizarProgramas() {
        throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de atualizar programas.');
      },
    }],
  ]));

  const r = await fastify.inject({ method: 'POST', url: '/programas/atualizar', payload: { camera: 1 } });

  assert.equal(r.statusCode, 409);
  assert.match(r.json().erro, /Camera 1 esta com sessao ativa/);
});

test('GET /programas retorna 404 para camera desconhecida', async () => {
  const fastify = await app(new Map());

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=99' });

  assert.equal(r.statusCode, 404);
  assert.match(r.json().erro, /camera 99 desconhecida/i);
});
