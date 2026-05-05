import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalEncerrarSessao } from '../../../public/js/ui/composites/modal-encerrar-sessao.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessao = {
  id: 'S1',
  codigo_op: 'OP1',
  numero_embarque: 'E1',
  programa_nome: 'PECA-X',
};

test('permite encerrar em nova caixa numerada', () => {
  let payload = null;
  abrirModalEncerrarSessao({
    sessao,
    caixasExistentes: [],
    onConfirmar: (p) => { payload = p; },
  });
  document.querySelector('[data-input="modo-caixa"][value="nova"]').click();
  document.querySelector('[data-input="numero_caixa"]').value = 'CX-009';
  document.querySelector('[data-submit-encerrar]').click();
  assert.deepEqual(payload, { numero_caixa: 'CX-009' });
});

test('permite encerrar em caixa existente', () => {
  let payload = null;
  abrirModalEncerrarSessao({
    sessao,
    caixasExistentes: [{ id: 'CX-001', label: 'CX-001' }],
    onConfirmar: (p) => { payload = p; },
  });
  document.querySelector('[data-input="modo-caixa"][value="existente"]').click();
  document.querySelector('[data-input="caixa_id"]').value = 'CX-001';
  document.querySelector('[data-submit-encerrar]').click();
  assert.deepEqual(payload, { caixa_id: 'CX-001' });
});

test('permite encerrar em caixa sem número', () => {
  let payload = null;
  abrirModalEncerrarSessao({
    sessao,
    caixasExistentes: [],
    onConfirmar: (p) => { payload = p; },
  });
  document.querySelector('[data-input="modo-caixa"][value="sem-numero"]').click();
  document.querySelector('[data-submit-encerrar]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});
