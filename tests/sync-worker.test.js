import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSyncWorker } from '../src/sync/sync-worker.js';

function criarDeps({ pingFalha = false, pusherOk = true } = {}) {
  return {
    healthchecker: {
      estado: pingFalha ? 'down' : 'up',
      async tick() { return this.estado; },
    },
    pusher: {
      drenar: async () => { if (!pusherOk) throw new Error('push falhou'); },
    },
    poller: {
      tick: async () => {},
    },
    logger: { info(){}, warn(){}, error(){} },
  };
}

test('boot em ONLINE com dependências sadias', () => {
  const w = criarSyncWorker(criarDeps());
  assert.equal(w.estado, 'ONLINE');
});

test('down no healthchecker leva a OFFLINE', async () => {
  const deps = criarDeps({ pingFalha: true });
  const w = criarSyncWorker(deps);
  await w.tick();
  assert.equal(w.estado, 'OFFLINE');
});

test('transição OFFLINE → RECOVERY → ONLINE', async () => {
  const deps = criarDeps({ pingFalha: true });
  const w = criarSyncWorker(deps);
  await w.tick();
  assert.equal(w.estado, 'OFFLINE');
  deps.healthchecker.estado = 'up';
  await w.tick();
  assert.equal(w.estado, 'ONLINE');
});
