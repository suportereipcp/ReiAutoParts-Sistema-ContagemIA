import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalAprovarSessao } from '../../../public/js/ui/composites/modal-aprovar-sessao.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessaoMock = {
  id: 'SESS-100',
  numero_caixa: 'CX-456',
  item_codigo: 'SKU-789',
  codigo_op: 'OP-123'
};

test('abrirModalAprovarSessao exibe titulo, subtitulo e caixa/item no info box para acao=aprovar', () => {
  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const overlay = document.querySelector('[data-modal-overlay]');
  assert.ok(overlay);

  // Assert title & subtitle
  const titleEl = overlay.querySelector('h2');
  const subtitleEl = overlay.querySelector('p');
  assert.equal(titleEl.textContent, 'Aprovar Sessão');
  assert.equal(subtitleEl.textContent, 'Autorize a alteração de status da contagem para fins de faturamento.');

  // Assert info box
  const infoBoxText = overlay.querySelector('.bg-surface-container-high').textContent;
  assert.match(infoBoxText, /Caixa:\s*CX-456/);
  assert.match(infoBoxText, /Item:\s*SKU-789/);
});

test('abrirModalAprovarSessao exibe titulo, subtitulo e caixa/op no info box se item_codigo for nulo para acao=reprovar', () => {
  abrirModalAprovarSessao({
    sessao: {
      id: 'SESS-100',
      numero_caixa: 'CX-456',
      codigo_op: 'OP-123'
    },
    acao: 'reprovar',
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const overlay = document.querySelector('[data-modal-overlay]');
  assert.ok(overlay);

  // Assert title for reprovar
  const titleEl = overlay.querySelector('h2');
  assert.equal(titleEl.textContent, 'Reprovar Sessão');

  // Assert info box fallback to OP code
  const infoBoxText = overlay.querySelector('.bg-surface-container-high').textContent;
  assert.match(infoBoxText, /Caixa:\s*CX-456/);
  assert.match(infoBoxText, /Item:\s*OP-123/);
});

test('campo de entrada de codigo do aprovador existe com os atributos apropriados', () => {
  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const inputEl = document.getElementById('maCodigoAprov');
  assert.ok(inputEl, 'O input deve existir com id maCodigoAprov');
  assert.equal(inputEl.getAttribute('data-input'), 'codigo-aprovador');
  assert.equal(inputEl.getAttribute('placeholder'), 'Digite o código do aprovador...');
  assert.equal(inputEl.required, true);

  // Check label
  const labelEl = document.querySelector('label[for="maCodigoAprov"]');
  assert.ok(labelEl);
  assert.equal(labelEl.textContent, 'Código do Aprovador');
});

test('valida o preenchimento obrigatorio do codigo do aprovador', () => {
  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc: {},
    onConcluido: () => {}
  });

  const confirmBtn = document.querySelector('[data-btn-confirmar]');
  assert.ok(confirmBtn);

  confirmBtn.click();

  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Código do aprovador é obrigatório/);
});

test('chama faturamentoSvc.aprovarSessao, fecha o modal e dispara onConcluido no sucesso', async () => {
  let chamadoCom = null;
  let concluidoChamado = false;

  const faturamentoSvc = {
    aprovarSessao: async (id, codigo) => {
      chamadoCom = { id, codigo };
    }
  };

  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc,
    onConcluido: () => { concluidoChamado = true; }
  });

  const inputEl = document.getElementById('maCodigoAprov');
  inputEl.value = 'APROV-999';

  const confirmBtn = document.querySelector('[data-btn-confirmar]');
  await confirmBtn.click();

  assert.deepEqual(chamadoCom, { id: 'SESS-100', codigo: 'APROV-999' });
  assert.equal(concluidoChamado, true);

  // Check success toast
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Sessão aprovada com sucesso/);

  // Modal should be closed
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('chama faturamentoSvc.reprovarSessao, fecha o modal e dispara onConcluido no sucesso', async () => {
  let chamadoCom = null;
  let concluidoChamado = false;

  const faturamentoSvc = {
    reprovarSessao: async (id, codigo) => {
      chamadoCom = { id, codigo };
    }
  };

  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'reprovar',
    faturamentoSvc,
    onConcluido: () => { concluidoChamado = true; }
  });

  const inputEl = document.getElementById('maCodigoAprov');
  inputEl.value = 'APROV-888';

  const confirmBtn = document.querySelector('[data-btn-confirmar]');
  await confirmBtn.click();

  assert.deepEqual(chamadoCom, { id: 'SESS-100', codigo: 'APROV-888' });
  assert.equal(concluidoChamado, true);

  // Check success toast
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Sessão reprovada com sucesso/);

  // Modal should be closed
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('desabilita elementos durante chamada da API e reabilita em caso de erro', async () => {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const faturamentoSvc = {
    aprovarSessao: async () => {
      await promise;
      throw new Error('Erro de permissão');
    }
  };

  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc,
    onConcluido: () => {}
  });

  const inputEl = document.getElementById('maCodigoAprov');
  inputEl.value = 'APROV-FAIL';

  const confirmBtn = document.querySelector('[data-btn-confirmar]');
  const cancelBtn = document.querySelector('[data-btn-cancelar]');

  // Trigger submission
  confirmBtn.click();

  // Wait a moment for async operations to process up to the first await
  await new Promise(resolve => setTimeout(resolve, 10));

  // Assert elements are disabled
  assert.equal(inputEl.disabled, true);
  assert.equal(confirmBtn.disabled, true);
  assert.equal(cancelBtn.disabled, true);

  // Resolve API promise with failure
  resolvePromise();

  // Wait for click handler to finalize
  await new Promise(resolve => setTimeout(resolve, 10));

  // Assert error toast is shown
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Erro de permissão/);

  // Assert elements are re-enabled
  assert.equal(inputEl.disabled, false);
  assert.equal(confirmBtn.disabled, false);
  assert.equal(cancelBtn.disabled, false);

  // Modal should remain open
  assert.ok(document.querySelector('[data-modal-overlay]'));
});

test('permite submeter pressionando a tecla Enter', async () => {
  let chamadoCom = null;
  const faturamentoSvc = {
    aprovarSessao: async (id, codigo) => {
      chamadoCom = { id, codigo };
    }
  };

  abrirModalAprovarSessao({
    sessao: sessaoMock,
    acao: 'aprovar',
    faturamentoSvc,
    onConcluido: () => {}
  });

  const inputEl = document.getElementById('maCodigoAprov');
  inputEl.value = 'APROV-ENTER';

  // Dispatch keydown Enter
  const event = new window.Event('keydown');
  event.key = 'Enter';
  inputEl.dispatchEvent(event);

  await new Promise(resolve => setTimeout(resolve, 10));

  assert.deepEqual(chamadoCom, { id: 'SESS-100', codigo: 'APROV-ENTER' });
});
