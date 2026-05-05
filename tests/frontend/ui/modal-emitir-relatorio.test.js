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

test('clicar no formato chama onBaixar com o fmt', async () => {
  let chamado = null;
  abrirModalEmitir({ numero: '01', onBaixar: (fmt) => { chamado = fmt; }, duracaoSucessoMs: 1 });
  document.querySelector('[data-fmt="xlsx"]').click();
  await new Promise(r => setTimeout(r, 10));
  assert.equal(chamado, 'xlsx');
});

test('exportacao bem sucedida fecha mensagem e modal apos tempo completo', async () => {
  abrirModalEmitir({ numero: '01', onBaixar: async () => {}, duracaoSucessoMs: 20 });
  document.querySelector('[data-fmt="pdf"]').click();
  await new Promise(r => setTimeout(r, 5));

  assert.ok(document.querySelector('[data-exportacao-sucesso]'));
  assert.ok(document.querySelector('[data-modal-overlay]'));

  await new Promise(r => setTimeout(r, 35));
  assert.equal(document.querySelector('[data-exportacao-sucesso]'), null);
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('fechar mensagem manualmente nao fecha o modal de emitir relatorio', async () => {
  abrirModalEmitir({ numero: '01', onBaixar: async () => {}, duracaoSucessoMs: 100 });
  document.querySelector('[data-fmt="csv"]').click();
  await new Promise(r => setTimeout(r, 5));

  document.querySelector('[data-fechar-exportacao]').click();
  await new Promise(r => setTimeout(r, 5));

  assert.equal(document.querySelector('[data-exportacao-sucesso]'), null);
  assert.ok(document.querySelector('[data-modal-overlay]'));
});
