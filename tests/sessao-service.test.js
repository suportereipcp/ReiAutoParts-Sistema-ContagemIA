import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';

function setup(overrides = {}) {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'IT1', quantidade_prevista: 100 });
  upsertOP(db, { codigo_op: 'OP2', item_codigo: 'IT2', quantidade_prevista: 100 });
  upsertOperador(db, { codigo: '001', nome: 'Fulano', ativo: true });
  const fakeCamera1 = {
    cameraId: 1, estado: 'suspensa',
    ativada: [],
    reinicios: 0,
    encerramentos: 0,
    async ativarSessao(args) { this.ativada.push(args); this.estado = 'ativa'; },
    async encerrarSessao() { this.encerramentos++; this.estado = 'suspensa'; },
    async reiniciarContagem() { this.reinicios++; },
  };
  const fakeCamera2 = {
    cameraId: 2, estado: 'suspensa',
    ativada: [],
    reinicios: 0,
    encerramentos: 0,
    async ativarSessao(args) { this.ativada.push(args); this.estado = 'ativa'; },
    async encerrarSessao() { this.encerramentos++; this.estado = 'suspensa'; },
    async reiniciarContagem() { this.reinicios++; },
  };
  const cameraManagers = new Map([[1, fakeCamera1], [2, fakeCamera2]]);
  const eventos = [];
  let seq = 0;
  const svc = criarSessaoService({
    db,
    cameraManagers,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    gerarUUID: () => `uuid-fake-${++seq}`,
    broadcast: () => {},
    caixaLabelService: overrides.caixaLabelService,
  });
  return { db, svc, fakeCamera1, fakeCamera2, eventos };
}

test('abrir + confirmar uma sessão', async () => {
  const { svc, fakeCamera1 } = setup();
  const s = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  assert.equal(s.camera_id, 1);
  await svc.confirmar(s.id, { programaNumero: 2, programaNome: 'PECA-X' });
  assert.equal(fakeCamera1.ativada.length, 1);
  assert.equal(fakeCamera1.estado, 'ativa');
});

test('abrir falha se embarque fechado', async () => {
  const { svc, db } = setup();
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'fechado' });
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 }),
    /embarque.*fechado/i
  );
});

test('abrir falha se operador desconhecido', async () => {
  const { svc } = setup();
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '999', camera_id: 1 }),
    /operador/i
  );
});

test('abrir falha se câmera desconectada', async () => {
  const { svc, fakeCamera1 } = setup();
  fakeCamera1.estado = 'desconectada';
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 }),
    /desconectada/i
  );
});

test('abrir falha se câmera desconhecida', async () => {
  const { svc } = setup();
  await assert.rejects(
    svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 99 }),
    /desconhecida/i
  );
});

test('abrir bloqueia camera com sessao ativa e retorna mensagem para o formulario', async () => {
  const { svc } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });

  await assert.rejects(
    () => svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP2', codigo_operador: '001', camera_id: 1 }),
    {
      message: 'Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.',
    },
  );
  assert.equal(s1.camera_id, 1);
});

test('encerrar permite reutilizar caixa existente quando OP é a mesma', async () => {
  const { svc, db } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });
  await svc.encerrar(s1.id, { numero_caixa: 'CX-001' });

  const s2 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2 });
  await svc.confirmar(s2.id, { programaNumero: 2, programaNome: 'PECA-X' });
  await svc.encerrar(s2.id, { caixa_id: 'CX-001' });

  const rows = db.prepare('SELECT numero_caixa, codigo_op, status FROM sessoes_contagem WHERE numero_caixa = ? ORDER BY id').all('CX-001');
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.codigo_op === 'OP1'));
});

test('encerrar bloqueia reutilizar caixa existente quando OP diverge', async () => {
  const { svc } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });
  await svc.encerrar(s1.id, { numero_caixa: 'CX-001' });

  const s2 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP2', codigo_operador: '001', camera_id: 2 });
  await svc.confirmar(s2.id, { programaNumero: 3, programaNome: 'PECA-Y' });

  await assert.rejects(
    svc.encerrar(s2.id, { caixa_id: 'CX-001' }),
    /outro item|outra op|outra OP/i
  );
});

test('encerrar gera identificador interno para caixa sem número', async () => {
  const { svc, db } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });
  const r1 = await svc.encerrar(s1.id, { criar_caixa_sem_numero: true });
  const final1 = r1.sessao ?? r1;

  const s2 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2 });
  await svc.confirmar(s2.id, { programaNumero: 2, programaNome: 'PECA-X' });
  const r2 = await svc.encerrar(s2.id, { criar_caixa_sem_numero: true });
  const final2 = r2.sessao ?? r2;

  assert.match(final1.numero_caixa, /^__SEM_NUMERO__/);
  assert.match(final2.numero_caixa, /^__SEM_NUMERO__/);
  assert.notEqual(final1.numero_caixa, final2.numero_caixa);
  const rows = db.prepare('SELECT numero_caixa FROM sessoes_contagem WHERE numero_caixa LIKE ? ORDER BY numero_caixa').all('__SEM_NUMERO__%');
  assert.equal(rows.length, 2);
});

test('encerrar emite etiqueta automatica e nao reverte sessao quando falha', async () => {
  const { svc } = setup({ caixaLabelService: { emitirPorEncerramento: async () => { throw new Error('offline'); } } });
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });
  const resp = await svc.encerrar(s1.id, { numero_caixa: 'CX-001' });
  assert.equal(resp.sessao.status, 'encerrada');
  assert.equal(resp.etiqueta.status, 'erro');
  assert.equal(resp.etiqueta.erro, 'offline');
});

test('reiniciar contagem zera sessão ativa sem cancelar a sessão', async () => {
  const { svc, db, fakeCamera1 } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });
  db.prepare('UPDATE sessoes_contagem SET quantidade_total = 17 WHERE id = ?').run(s1.id);

  const reiniciada = await svc.reiniciarContagem(s1.id);

  assert.equal(reiniciada.quantidade_total, 0);
  assert.equal(reiniciada.status, 'ativa');
  assert.equal(fakeCamera1.reinicios, 1);
});

test('reiniciar sessão cancela a sessão ativa e suspende a câmera', async () => {
  const { svc, fakeCamera1 } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  await svc.confirmar(s1.id, { programaNumero: 2, programaNome: 'PECA-X' });

  const cancelada = await svc.reiniciarSessao(s1.id);

  assert.equal(cancelada.status, 'cancelada');
  assert.equal(fakeCamera1.encerramentos, 1);
  assert.equal(fakeCamera1.estado, 'suspensa');
});
