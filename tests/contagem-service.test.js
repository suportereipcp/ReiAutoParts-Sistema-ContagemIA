import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessao, buscarAtivaPorCamera } from '../src/db/queries/sessoes.js';
import { criarContagemService } from '../src/domain/contagem-service.js';

function setup() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1' });
  upsertOperador(db, { codigo: '001', nome: 'F', ativo: true });
  criarSessao(db, { id: 'u1', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-04-17T10:00:00Z' });
  return db;
}

function auditFake() {
  const chamadas = [];
  return { chamadas, appendPulso: async (id, p) => { chamadas.push({ id, p }); } };
}

test('processarPulso incrementa contagem na sessão ativa', () => {
  const db = setup();
  const broadcasts = [];
  const svc = criarContagemService({
    db,
    registrarEvento: () => {},
    enfileirarSync: () => {},
    broadcast: (ev, p) => broadcasts.push({ ev, p }),
  });
  svc.processarPulso({ cameraId: 1, contagem: 5, total_dia: 5, brilho: 128 });
  const s = buscarAtivaPorCamera(db, 1);
  assert.equal(s.quantidade_total, 5);
  assert.equal(broadcasts[0].ev, 'contagem.incrementada');
});

test('pulso sem sessão ativa é descartado e logado WARN', () => {
  const db = openDatabase(':memory:');
  const eventos = [];
  const svc = criarContagemService({
    db,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    broadcast: () => {},
  });
  svc.processarPulso({ cameraId: 2, contagem: 1, total_dia: 1, brilho: 0 });
  assert.equal(eventos[0].nivel, 'WARN');
});

test('segundo pulso usa delta absoluto da câmera', () => {
  const db = setup();
  const svc = criarContagemService({
    db, registrarEvento(){}, enfileirarSync(){}, broadcast(){},
  });
  svc.processarPulso({ cameraId: 1, contagem: 5 });
  svc.processarPulso({ cameraId: 1, contagem: 8 });
  const s = buscarAtivaPorCamera(db, 1);
  assert.equal(s.quantidade_total, 8);
});

test('processarPulso chama pulseAuditService.appendPulso', async () => {
  const db = setup();
  const audit = auditFake();
  const svc = criarContagemService({
    db,
    registrarEvento: () => {},
    enfileirarSync: () => {},
    broadcast: () => {},
    pulseAuditService: audit,
    now: () => '2026-05-19T10:00:01.000Z',
  });

  await svc.processarPulso({ cameraId: 1, contagem: 1, total_dia: 100, brilho: 50 });

  assert.equal(audit.chamadas.length, 1);
  assert.equal(audit.chamadas[0].id, 'u1');
  assert.deepEqual(audit.chamadas[0].p, { t: '2026-05-19T10:00:01.000Z', n: 1, d: 100, b: 50 });
});

test('processarPulso sem sessao ativa nao chama audit', async () => {
  const db = setup();
  db.prepare(`UPDATE sessoes_contagem SET status = 'encerrada' WHERE id = 'u1'`).run();
  const audit = auditFake();
  const svc = criarContagemService({
    db,
    registrarEvento: () => {},
    enfileirarSync: () => {},
    broadcast: () => {},
    pulseAuditService: audit,
    now: () => '2026-05-19T10:00:01.000Z',
  });

  await svc.processarPulso({ cameraId: 1, contagem: 1, total_dia: 100, brilho: 0 });
  assert.equal(audit.chamadas.length, 0);
});
