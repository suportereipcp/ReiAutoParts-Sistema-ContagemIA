import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarPoller } from '../src/sync/reverse-poller.js';
import { buscarEmbarque, lerCursor, ultimoPoll } from '../src/db/queries/espelhos.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  return db;
}

test('poller chama aoReceberNF em transicao NF vazio->preenchido', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', NULL)`).run();

  const chamados = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E1', status: 'aberto', numero_nota_fiscal: '12345', atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: (n) => chamados.push(n), notificarEmbarqueNovo: () => {} },
  });

  await poller.tick();
  assert.deepEqual(chamados, ['E1']);
});

test('poller nao chama aoReceberNF quando NF nao muda', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();

  const chamados = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E1', status: 'aberto', numero_nota_fiscal: '12345', atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: (n) => chamados.push(n), notificarEmbarqueNovo: () => {} },
  });

  await poller.tick();
  assert.deepEqual(chamados, []);
});

test('poller chama notificarEmbarqueNovo para embarque novo', async () => {
  const db = criarDb();
  const novos = [];
  const poller = criarPoller({
    db,
    buscarAlteracoes: async (tabela) => {
      if (tabela === 'embarques') return [{ numero_embarque: 'E2', status: 'aberto', numero_nota_fiscal: null, atualizado_em: '2026-05-01T10:00:00.000Z' }];
      return [];
    },
    logger: { info: () => {} },
    faturamentoService: { aoReceberNF: () => {}, notificarEmbarqueNovo: (n) => novos.push(n) },
  });

  await poller.tick();
  assert.deepEqual(novos, ['E2']);
});

test('poller funciona sem faturamentoService (retrocompatibilidade)', async () => {
  const db = criarDb();
  const poller = criarPoller({
    db,
    buscarAlteracoes: async () => [],
    logger: { info: () => {} },
    // no faturamentoService
  });
  // Should not throw
  await assert.doesNotReject(() => poller.tick());
});

test('poller sincroniza e avança cursor', async () => {
  const db = criarDb();
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
  const db = criarDb();
  const poller = criarPoller({
    db,
    buscarAlteracoes: async () => [],
    logger: { info(){}, warn(){}, error(){} },
  });
  await poller.tick();
  assert.ok(ultimoPoll(db, 'embarques'));
});

test('poller faz refresh completo de embarques para captar fechamento sem novo atualizado_em', async () => {
  const db = criarDb();
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
