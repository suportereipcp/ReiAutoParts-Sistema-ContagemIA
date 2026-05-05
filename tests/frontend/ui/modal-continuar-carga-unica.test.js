import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirContinuarCargaUnica } from '../../../public/js/ui/composites/modal-continuar-carga-unica.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessaoFake = {
  id: 'S1',
  codigo_op: 'OP-2024-8842',
  codigo_operador: '1807',
  camera_id: 1,
  numero_embarque: 'EB-01',
  programa_nome: 'Disco Freio Ventilado T-800',
};

test('abre modal com stage continuar-unica e item identificado', () => {
  abrirContinuarCargaUnica({ sessao: sessaoFake });
  assert.ok(document.querySelector('[data-stage="continuar-unica"]'));
  assert.ok(document.querySelector('[data-item-identificado]'));
  assert.ok(document.querySelector('[data-item-preview]'));
  assert.ok(document.querySelector('[data-accento-modal]'));
  assert.match(document.body.textContent, /Carga Atual/);
  assert.match(document.body.textContent, /Disco Freio Ventilado T-800/);
});

test('OP vem preenchida e readonly', () => {
  abrirContinuarCargaUnica({ sessao: sessaoFake });
  const input = document.querySelector('[data-input="codigo_op"]');
  assert.equal(input.value, 'OP-2024-8842');
  assert.equal(input.readOnly, true);
});

test('clicar Continuar dispara callback com operador digitado', () => {
  let payload = null;
  abrirContinuarCargaUnica({ sessao: sessaoFake, onContinuar: (p) => { payload = p; } });
  const oper = document.querySelector('[data-input="codigo_operador"]');
  oper.value = '9988';
  document.querySelector('[data-submit-continuar]').click();
  assert.equal(payload?.codigoOperador, '9988');
  assert.equal(payload?.sessao?.id, 'S1');
});

test('Continuar sem operador mostra erro e não chama callback', () => {
  let called = false;
  abrirContinuarCargaUnica({ sessao: { ...sessaoFake, codigo_operador: '' }, onContinuar: () => { called = true; } });
  document.querySelector('[data-submit-continuar]').click();
  assert.equal(called, false);
});
