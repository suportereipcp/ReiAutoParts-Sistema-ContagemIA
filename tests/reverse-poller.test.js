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

test('poller faz refresh completo de embarques para captar fechamento sem novo atualizado_em', async () => {
  const db = openDatabase(':memory:');
  let rodada = 0;
  const chamadas = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela, cursor) => {
      chamadas.push({ tabela, cursor });
      if (tabela !== 'embarques') return [];
      rodada += 1;
      if (rodada === 1) {
        return [{ numero_embarque: 'E1', status: 'aberto', atualizado_em: '2026-04-17T10:00:00Z' }];
      }
      return [{ numero_embarque: 'E1', status: 'fechado', atualizado_em: '2026-04-17T10:00:00Z' }];
    },
    logger: { info(){}, warn(){}, error(){} },
  });

  await poller.tick();
  await poller.tick();

  assert.equal(buscarEmbarque(db, 'E1').status, 'fechado');
  const chamadasEmbarques = chamadas.filter((item) => item.tabela === 'embarques');
  assert.equal(chamadasEmbarques.length, 2);
  assert.equal(chamadasEmbarques[0].cursor, null);
  assert.equal(chamadasEmbarques[1].cursor, null);
});
