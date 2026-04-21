import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSessoesService } from '../../../public/js/domain/sessoes-service.js';

function fakeApi() {
  const c = {
    posts: [],
    async post(path, body) { c.posts.push({ path, body }); return c._resp ?? { id: 'x' }; },
  };
  return c;
}

test('abrir envia payload para POST /sessoes', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  api._resp = { id: 'u1', camera_id: 1 };
  const r = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '1', camera_id: 1 });
  assert.equal(api.posts[0].path, '/sessoes');
  assert.equal(r.id, 'u1');
});

test('confirmar manda programa', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  await svc.confirmar('u1', { programaNumero: 2, programaNome: 'PECA-X' });
  assert.equal(api.posts[0].path, '/sessoes/u1/confirmar');
  assert.deepEqual(api.posts[0].body, { programaNumero: 2, programaNome: 'PECA-X' });
});

test('encerrar envia numero_caixa', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  await svc.encerrar('u1', 'CX-9');
  assert.deepEqual(api.posts[0].body, { numero_caixa: 'CX-9' });
});
