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
