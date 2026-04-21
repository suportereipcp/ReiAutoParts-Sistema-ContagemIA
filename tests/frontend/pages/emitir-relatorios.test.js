import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderEmitirRelatorios } from '../../../public/js/pages/emitir-relatorios.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('lista todas as cargas disponíveis', async () => {
  const ctx = {
    api: { get: async () => [
      { numero_embarque: '01', status: 'aberto', data_criacao: '2026-04-18T00:00:00Z' },
      { numero_embarque: '02', status: 'fechado', data_criacao: '2026-04-19T00:00:00Z' },
    ]},
  };
  const el = await renderEmitirRelatorios(ctx);
  assert.equal(el.querySelectorAll('[data-embarque]').length, 2);
});
