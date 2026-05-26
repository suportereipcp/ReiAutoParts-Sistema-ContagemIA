import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarSessoesState } from '../../../public/js/domain/sessoes-state.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('carregarAtivas povoa por câmera', () => {
  const s = criarSessoesState();
  s.carregarAtivas([
    { id: 'a', camera_id: 1, quantidade_total: 10 },
    { id: 'b', camera_id: 2, quantidade_total: 0 },
  ]);
  assert.equal(s.porCamera(1).id, 'a');
  assert.equal(s.porCamera(2).quantidade_total, 0);
});

test('incrementa quantidade_total por evento WS', () => {
  const s = criarSessoesState();
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 5 }]);
  s.aplicaContagem({ camera_id: 1, sessao_id: 'a', quantidade_total: 8 });
  assert.equal(s.porCamera(1).quantidade_total, 8);
});

test('aplicaAtualizacao substitui o registro quando a sessão segue ativa', () => {
  const s = criarSessoesState();
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 5, status: 'ativa', programa_nome: 'PECA-A' }]);
  s.aplicaAtualizacao({ id: 'a', camera_id: 1, quantidade_total: 5, status: 'ativa', programa_nome: 'PECA-B' });
  assert.equal(s.porCamera(1).programa_nome, 'PECA-B');
  assert.equal(s.porCamera(1).status, 'ativa');
});

test('aplicaAtualizacao remove a sessão quando encerrada ou cancelada', () => {
  const s = criarSessoesState();
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 5, status: 'ativa' }]);
  s.aplicaAtualizacao({ id: 'a', camera_id: 1, status: 'encerrada' });
  assert.equal(s.porCamera(1), undefined);

  s.carregarAtivas([{ id: 'b', camera_id: 2, quantidade_total: 0, status: 'ativa' }]);
  s.aplicaAtualizacao({ id: 'b', camera_id: 2, status: 'cancelada' });
  assert.equal(s.porCamera(2), undefined);
});

test('notifica subscribers', () => {
  const s = criarSessoesState();
  let n = 0;
  s.subscribe(() => n++);
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 0 }]);
  s.aplicaContagem({ camera_id: 1, sessao_id: 'a', quantidade_total: 1 });
  assert.equal(n, 2);
});
