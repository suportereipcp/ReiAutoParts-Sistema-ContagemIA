import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderTV } from '../../../public/js/tv-render.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderTV cria 2 painéis quando há 2 câmeras', () => {
  const sessoes = {
    todas: () => [
      { id: 'a', camera_id: 1, quantidade_total: 10, programa_nome: 'PECA-A' },
      { id: 'b', camera_id: 2, quantidade_total: 20, programa_nome: 'PECA-B' },
    ],
  };
  const el = renderTV({ sessoes });
  assert.equal(el.querySelectorAll('[data-sessao-id]').length, 2);
});

test('renderTV mostra placeholder se não há sessões', () => {
  const el = renderTV({ sessoes: { todas: () => [] } });
  assert.match(el.textContent, /Nenhuma sessão ativa/);
});
