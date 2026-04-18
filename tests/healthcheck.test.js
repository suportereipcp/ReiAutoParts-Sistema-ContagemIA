import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarHealthchecker } from '../src/sync/healthcheck.js';

test('healthchecker marca falhas e sucesso', async () => {
  let respostas = [false, false, false, true];
  const hc = criarHealthchecker({
    ping: async () => { const r = respostas.shift(); if (!r) throw new Error('down'); return true; },
    limite: 3,
  });
  assert.equal(hc.estado, 'up');
  await hc.tick();
  assert.equal(hc.estado, 'up');
  await hc.tick();
  assert.equal(hc.estado, 'up');
  await hc.tick();
  assert.equal(hc.estado, 'down');
  await hc.tick();
  assert.equal(hc.estado, 'up');
});
