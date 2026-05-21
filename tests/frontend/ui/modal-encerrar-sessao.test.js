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

test('exibe aviso e exige confirmacao se embarqueFaturado for true', () => {
  let payload = null;
  abrirModalEncerrarSessao({
    sessao,
    caixasExistentes: [],
    embarqueFaturado: true,
    onConfirmar: (p) => { payload = p; },
  });

  // Seleciona o modo sem número para evitar validação de número de caixa
  document.querySelector('[data-input="modo-caixa"][value="sem-numero"]').click();

  // Verifica que o aviso foi renderizado
  const alert = document.querySelector('[data-input="confirmar-recusa"]');
  assert.ok(alert, 'Checkbox de confirmação deve estar presente');

  // Clica em confirmar sem marcar o checkbox
  document.querySelector('[data-submit-encerrar]').click();
  assert.equal(payload, null, 'onConfirmar não deve ser chamado sem o checkbox marcado');
  assert.match(document.body.innerHTML, /Você deve confirmar que está ciente do encerramento tardio/);

  // Limpa toast anterior do DOM para evitar falso-positivo se necessário, e marca o checkbox
  alert.checked = true;
  document.querySelector('[data-submit-encerrar]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true }, 'onConfirmar deve ser chamado quando checkbox estiver marcado');
});
