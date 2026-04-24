import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';
import { rotasSessoes } from '../src/http/routes/sessoes.js';

function criarService() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'IT1', quantidade_prevista: 100 });
  upsertOperador(db, { codigo: '001', nome: 'Fulano', ativo: true });
  const camera = {
    cameraId: 1,
    estado: 'suspensa',
    async ativarSessao() { this.estado = 'ativa'; },
    async encerrarSessao() { this.estado = 'suspensa'; },
    async reiniciarContagem() {},
  };
  let seq = 0;
  const sessaoService = criarSessaoService({
    db,
    cameraManagers: new Map([[1, camera]]),
    registrarEvento() {},
    enfileirarSync() {},
    gerarUUID: () => `uuid-${++seq}`,
    broadcast() {},
  });

  return { db, sessaoService };
}

test('service bloqueia abertura quando a camera informada ja possui sessao ativa', async () => {
  const { sessaoService } = criarService();
  await sessaoService.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });

  await assert.rejects(
    () => sessaoService.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 }),
    { message: 'Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.' },
  );
});

test('POST /sessoes retorna mensagem operacional para camera ocupada', async () => {
  const { sessaoService } = criarService();
  const fastify = Fastify({ logger: false });
  rotasSessoes(fastify, { sessaoService });
  await fastify.ready();

  const payload = { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 };
  await fastify.inject({ method: 'POST', url: '/sessoes', payload });
  const resposta = await fastify.inject({ method: 'POST', url: '/sessoes', payload });

  assert.equal(resposta.statusCode, 400);
  assert.equal(resposta.json().erro, 'Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
});
