import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarCacheProgramasAoConectar } from '../src/camera/programas-boot.js';

test('carregarCacheProgramasAoConectar carrega cache e nao varre a camera', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'suspensa',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); },
  };

  await carregarCacheProgramasAoConectar({
    manager,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache']);
});

test('carregarCacheProgramasAoConectar registra aviso quando carga do cache falha', async () => {
  const avisos = [];
  const manager = {
    cameraId: 2,
    estado: 'suspensa',
    async carregarCacheProgramas() { throw new Error('cache corrompido'); },
    async atualizarProgramas() { throw new Error('nao deveria varrer'); },
  };

  await carregarCacheProgramasAoConectar({
    manager,
    logger: { warn: (payload, msg) => avisos.push({ payload, msg }) },
  });

  assert.equal(avisos.length, 1);
  assert.match(avisos[0].msg, /falha ao carregar cache local de programas/i);
});
