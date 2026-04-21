import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { TabelaCaixas } from '../../../public/js/ui/composites/tabela-caixas.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderiza linha por caixa', () => {
  const el = TabelaCaixas({ caixas: [
    { numero_caixa: 'CX-1', codigo_op: 'OP1', quantidade_total: 10 },
    { numero_caixa: 'CX-2', codigo_op: 'OP1', quantidade_total: 20 },
  ]});
  assert.equal(el.querySelectorAll('[data-linha-caixa]').length, 2);
});

test('mensagem quando vazio', () => {
  const el = TabelaCaixas({ caixas: [] });
  assert.match(el.textContent, /Nenhuma caixa/);
});
