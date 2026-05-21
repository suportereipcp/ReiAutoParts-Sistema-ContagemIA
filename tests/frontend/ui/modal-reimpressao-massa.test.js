import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalReimpressaoMassa } from '../../../public/js/ui/composites/modal-reimpressao-massa.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('modal exibe resumo de caixas e etiquetas do preview', () => {
  abrirModalReimpressaoMassa({
    embarque: 'SHP-123',
    preview: { caixas: 5, etiquetas: 12 },
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const caixasEl = document.querySelector('[data-display="caixas"]');
  const etiquetasEl = document.querySelector('[data-display="etiquetas"]');

  assert.ok(caixasEl);
  assert.ok(etiquetasEl);
  assert.equal(caixasEl.textContent, '5');
  assert.equal(etiquetasEl.textContent, '12');
});

test('exibe input com id mmCodigoOp e atributo data-input="codigo-operador"', () => {
  abrirModalReimpressaoMassa({
    embarque: 'SHP-123',
    preview: { caixas: 1, etiquetas: 1 },
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const inputEl = document.getElementById('mmCodigoOp');
  assert.ok(inputEl);
  assert.equal(inputEl.getAttribute('data-input'), 'codigo-operador');
});

test('valida codigo do operador obrigatorio', () => {
  abrirModalReimpressaoMassa({
    embarque: 'SHP-123',
    preview: { caixas: 1, etiquetas: 1 },
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const confirmBtn = Array.from(document.querySelectorAll('button')).find(
    b => b.textContent.includes('Confirmar Reimpressão')
  );
  assert.ok(confirmBtn);

  confirmBtn.click();

  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Informe o código do operador/);
});

test('processo de reimpressao com sucesso', async () => {
  let chamadoCom = null;
  let concluidoChamado = false;

  const faturamentoSvc = {
    reimpressaoMassa: async (embarque, codigo) => {
      chamadoCom = { embarque, codigo };
    }
  };

  abrirModalReimpressaoMassa({
    embarque: 'SHP-123',
    preview: { caixas: 5, etiquetas: 10 },
    faturamentoSvc,
    onConcluido: () => { concluidoChamado = true; }
  });

  const inputEl = document.getElementById('mmCodigoOp');
  inputEl.value = 'OPER-777';

  const confirmBtn = Array.from(document.querySelectorAll('button')).find(
    b => b.textContent.includes('Confirmar Reimpressão')
  );

  // Trigger confirm click and wait
  await confirmBtn.click();

  assert.deepEqual(chamadoCom, { embarque: 'SHP-123', codigo: 'OPER-777' });
  assert.equal(concluidoChamado, true);

  // Check success toast
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Reimpressão em massa solicitada com sucesso/);

  // Modal overlay should be removed
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('processo de reimpressao com erro reabilita botao', async () => {
  const faturamentoSvc = {
    reimpressaoMassa: async () => {
      throw new Error('Falha na comunicação');
    }
  };

  abrirModalReimpressaoMassa({
    embarque: 'SHP-123',
    preview: { caixas: 5, etiquetas: 10 },
    faturamentoSvc,
    onConcluido: () => {}
  });

  const inputEl = document.getElementById('mmCodigoOp');
  inputEl.value = 'OPER-777';

  const confirmBtn = Array.from(document.querySelectorAll('button')).find(
    b => b.textContent.includes('Confirmar Reimpressão')
  );

  // Trigger confirm click and wait
  await confirmBtn.click();

  // Check error toast
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Falha na comunicação/);

  // Button should be re-enabled
  assert.equal(confirmBtn.disabled, false);

  // Modal should still be open
  assert.ok(document.querySelector('[data-modal-overlay]'));
});
