import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalEmitir } from '../../../public/js/ui/composites/modal-emitir-relatorio.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('modal mostra 3 opções de formato', () => {
  abrirModalEmitir({ numero: '01', onBaixar: () => {} });
  assert.ok(document.querySelector('[data-fmt="csv"]'));
  assert.ok(document.querySelector('[data-fmt="xlsx"]'));
  assert.ok(document.querySelector('[data-fmt="pdf"]'));
});

test('clicar no formato chama onBaixar com o fmt', () => {
  let chamado = null;
  abrirModalEmitir({ numero: '01', onBaixar: (fmt) => { chamado = fmt; } });
  document.querySelector('[data-fmt="xlsx"]').click();
  assert.equal(chamado, 'xlsx');
});
