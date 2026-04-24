import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizarCacheProgramasAoConectar } from '../src/camera/programas-boot.js';

test('atualizarCacheProgramasAoConectar carrega cache e atualiza camera livre', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'suspensa',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); return [{ numero: 1, nome: 'A' }]; },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache', 'atualizar-programas']);
});

test('atualizarCacheProgramasAoConectar nao varre camera com sessao ativa no banco', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'suspensa',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => true,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache']);
});

test('atualizarCacheProgramasAoConectar mantem cache em disco quando refresh falha', async () => {
  const avisos = [];
  const manager = {
    cameraId: 2,
    estado: 'suspensa',
    async carregarCacheProgramas() {},
    async atualizarProgramas() { throw new Error('timeout comando PNR'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn: (payload, msg) => avisos.push({ payload, msg }) },
  });

  assert.equal(avisos.length, 1);
  assert.match(avisos[0].msg, /falha ao atualizar cache de programas/i);
});

test('atualizarCacheProgramasAoConectar nao varre camera desconectada', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'desconectada',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache']);
});
