import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';

function setup() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'IT1', quantidade_prevista: 100 });
  upsertOperador(db, { codigo: '001', nome: 'Fulano', ativo: true });
  const fakeCamera = {
    cameraId: 1, estado: 'suspensa',
    ativada: [],
    async ativarSessao(args) { this.ativada.push(args); this.estado = 'ativa'; },
    async encerrarSessao() { this.estado = 'suspensa'; },
  };
  const cameraManagers = new Map([[1, fakeCamera]]);
  const eventos = [];
  const svc = criarSessaoService({
    db,
    cameraManagers,
    registrarEvento: e => eventos.push(e),
    enfileirarSync: () => {},
    gerarUUID: () => 'uuid-fake',
    broadcast: () => {},
  });
  return { db, svc, fakeCamera, eventos };
}

test('abrir + confirmar uma sessão', async () => {
  const { svc, fakeCamera } = setup();
  const s = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });
  assert.equal(s.camera_id, 1);
  await svc.confirmar(s.id, { programaNumero: 2, programaNome: 'PECA-X' });
  assert.equal(fakeCamera.ativada.length, 1);
  assert.equal(fakeCamera.estado, 'ativa');
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
