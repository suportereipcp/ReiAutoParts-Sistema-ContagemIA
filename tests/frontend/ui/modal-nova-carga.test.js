import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalNovaCarga } from '../../../public/js/ui/composites/modal-nova-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function fakeCtx() {
  return {
    catalogos: {
      embarquesAbertos: async () => [{ numero_embarque: '01' }],
      operadores: async () => [{ codigo: '1807', nome: 'Emilio' }],
      programas: async (c, q) => [{ numero: 1, nome: 'PECA-B' }],
      invalidarEmbarques: () => {},
    },
    sessoesSvc: {
      abrir: async (form) => ({ id: 'S1', camera_id: form.camera_id }),
      confirmar: async (id, p) => ({ id, programa_numero: p.programaNumero }),
    },
  };
}

test('abre modal com inputs obrigatórios', async () => {
  await abrirModalNovaCarga(fakeCtx());
  assert.ok(document.querySelector('[data-input="numero_embarque"]'));
  assert.ok(document.querySelector('[data-input="codigo_op"]'));
  assert.ok(document.querySelector('[data-input="codigo_operador"]'));
  assert.ok(document.querySelector('[data-input="camera_id"]'));
});

test('submete abertura e avança para seletor de programa', async () => {
  await abrirModalNovaCarga(fakeCtx());
  document.querySelector('[data-input="numero_embarque"]').value = '01';
  document.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  document.querySelector('[data-input="codigo_operador"]').value = '1807';
  document.querySelector('[data-input="camera_id"]').value = '1';
  document.querySelector('[data-submit-abrir]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.ok(document.querySelector('[data-stage="programa"]'));
});

test('aceita embarque pre-preenchido e bloqueado ao abrir pelo detalhe da carga', async () => {
  await abrirModalNovaCarga(fakeCtx(), { numeroEmbarque: '01', bloquearEmbarque: true });
  const input = document.querySelector('[data-input="numero_embarque"]');
  assert.equal(input.value, '01');
  assert.equal(input.readOnly, true);
});
