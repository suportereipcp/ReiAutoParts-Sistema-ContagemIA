import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { buscarEmbarque, lerCursor, ultimoPoll } from '../src/db/queries/espelhos.js';
import { criarPoller } from '../src/sync/reverse-poller.js';

test('poller sincroniza e avança cursor', async () => {
  const db = openDatabase(':memory:');
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') {
        return [
          { numero_embarque: 'E1', status: 'aberto', atualizado_em: '2026-04-17T10:00:00Z' },
          { numero_embarque: 'E2', status: 'aberto', atualizado_em: '2026-04-17T11:00:00Z' },
        ];
      }
      return [];
    },
    logger: { info(){}, warn(){}, error(){} },
  });
  await poller.tick();
  assert.equal(buscarEmbarque(db, 'E1').status, 'aberto');
  assert.equal(lerCursor(db, 'embarques'), '2026-04-17T11:00:00Z');
});

test('tick marca ultimoPoll mesmo quando sem alterações', async () => {
  const db = openDatabase(':memory:');
  const poller = criarPoller({
    db,
    buscarAlteracoes: async () => [],
    logger: { info(){}, warn(){}, error(){} },
  });
  await poller.tick();
  assert.ok(ultimoPoll(db, 'embarques'));
});
