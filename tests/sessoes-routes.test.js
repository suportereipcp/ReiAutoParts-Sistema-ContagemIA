import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';
import { rotasSessoes } from '../src/http/routes/sessoes.js';

async function bootstrap() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1' });
  upsertOperador(db, { codigo: '001', nome: 'F', ativo: true });
  const fakeCamera = {
    cameraId: 1, estado: 'suspensa',
    async ativarSessao() { this.estado = 'ativa'; },
    async encerrarSessao() { this.estado = 'suspensa'; },
  };
  const svc = criarSessaoService({
    db, cameraManagers: new Map([[1, fakeCamera]]),
    registrarEvento(){}, enfileirarSync(){}, gerarUUID: () => 'u1', broadcast(){},
  });
  const fastify = Fastify({ logger: false });
  rotasSessoes(fastify, { sessaoService: svc });
  await fastify.ready();
  return { fastify, db };
}

test('POST /sessoes cria sessão', async () => {
  const { fastify } = await bootstrap();
  const r = await fastify.inject({
    method: 'POST', url: '/sessoes',
    payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 },
  });
  assert.equal(r.statusCode, 201);
  const body = r.json();
  assert.equal(body.id, 'u1');
  assert.equal(body.camera_id, 1);
});

test('POST /sessoes/:id/confirmar ativa câmera', async () => {
  const { fastify } = await bootstrap();
  await fastify.inject({ method: 'POST', url: '/sessoes', payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 } });
  const r = await fastify.inject({
    method: 'POST', url: '/sessoes/u1/confirmar',
    payload: { programaNumero: 2, programaNome: 'X' },
  });
  assert.equal(r.statusCode, 200);
});

test('POST /sessoes/:id/encerrar retorna 400 sem caixa', async () => {
  const { fastify } = await bootstrap();
  await fastify.inject({ method: 'POST', url: '/sessoes', payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 } });
  await fastify.inject({ method: 'POST', url: '/sessoes/u1/confirmar', payload: { programaNumero: 2, programaNome: 'X' } });
  const r = await fastify.inject({ method: 'POST', url: '/sessoes/u1/encerrar', payload: {} });
  assert.equal(r.statusCode, 400);
});

test('GET /sessoes?embarque=E1 delega para listarPorEmbarque', async () => {
  const chamadas = [];
  const service = {
    listarAtivas: () => [],
    listarPorEmbarque: (n) => { chamadas.push(n); return [{ id: 'x', numero_embarque: n }]; },
  };
  const f = Fastify();
  rotasSessoes(f, { sessaoService: service });
  const r = await f.inject({ method: 'GET', url: '/sessoes?embarque=E1' });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(chamadas, ['E1']);
});
