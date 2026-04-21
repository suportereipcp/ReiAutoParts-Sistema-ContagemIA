import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { PainelContagem } from '../../../public/js/ui/composites/painel-contagem.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('exibe contador gigante', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 42, camera_id: 1, programa_nome: 'PECA-B' } });
  const num = el.querySelector('[data-contagem]');
  assert.equal(num.textContent.replace(/\s/g, ''), '42');
});

test('atualizar substitui valor', () => {
  const painel = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1 } });
  painel.querySelector('[data-contagem]').textContent = '10';
  assert.equal(painel.querySelector('[data-contagem]').textContent, '10');
});
