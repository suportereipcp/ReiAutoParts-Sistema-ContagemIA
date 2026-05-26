import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { enfileirar, contarPendentes } from '../src/db/queries/outbox.js';
import { criarPusher } from '../src/sync/outbox-pusher.js';

test('pusher sincroniza itens pendentes', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  enfileirar(db, 'sessoes_contagem', { id: 'u2' });
  const enviados = [];
  const pusher = criarPusher({
    db,
    enviarBatch: async (item) => { enviados.push(item); },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar();
  assert.equal(enviados.length, 2);
  assert.equal(contarPendentes(db), 0);
});

test('pusher deixa item na fila em caso de 5xx', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  const pusher = criarPusher({
    db,
    enviarBatch: async () => { const e = new Error('500'); e.status = 500; throw e; },
    logger: { info(){}, warn(){}, error(){} },
  });
  await assert.rejects(pusher.drenar(), /500/);
  assert.equal(contarPendentes(db), 1);
});

test('pusher move para dead-letter em 4xx', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  const pusher = criarPusher({
    db,
    enviarBatch: async () => { const e = new Error('400'); e.status = 400; throw e; },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar();
  const row = db.prepare('SELECT * FROM outbox').get();
  assert.ok(row.sincronizado_em === null);
  assert.ok(row.erro_detalhe?.includes('400'));
});

test('erro de constraint do Postgres (code 23514, sem status) não trava o ciclo', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'embarques_status', { numero_embarque: '6327', status: 'faturado' }); // item-veneno
  enfileirar(db, 'sessoes_contagem', { id: 'u2' }); // deve sincronizar mesmo assim
  const enviados = [];
  const pusher = criarPusher({
    db,
    enviarBatch: async ({ tabela, payload }) => {
      if (tabela === 'embarques_status') {
        const e = new Error('viola check constraint "embarques_status_check"');
        e.code = '23514';
        throw e;
      }
      enviados.push(payload);
    },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar(); // NÃO deve rejeitar (antes travava → OFFLINE)
  assert.deepEqual(enviados, [{ id: 'u2' }]); // o item bom sincronizou
  assert.equal(contarPendentes(db), 1); // só o item-veneno permanece pendente
});

test('dead-letter por excesso de tentativas mesmo sem status/code', async () => {
  const db = openDatabase(':memory:');
  enfileirar(db, 'sessoes_contagem', { id: 'u1' });
  const pusher = criarPusher({
    db,
    maxTentativas: 1,
    enviarBatch: async () => { throw new Error('erro sem status nem code'); },
    logger: { info(){}, warn(){}, error(){} },
  });
  await pusher.drenar(); // tentativas 0+1 >= 1 → dead-letter, não rejeita
  assert.equal(contarPendentes(db), 1);
});
