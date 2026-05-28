import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalEncerrarSessao } from '../../../public/js/ui/composites/modal-encerrar-sessao.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessao = {
  id: 'S1',
  codigo_op: 'OP-A',
  numero_embarque: 'E1',
  programa_nome: 'PECA-X',
};

const sessoesEmbarqueComCaixas = [
  { id: 'S0', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'PECA-X', quantidade_total: 50, encerrada_em: '2026-05-28T10:00:00Z', status: 'encerrada' },
];

test('exibe tres botoes quando o embarque ja tem caixas', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('oculta botao Caixa existente quando nao ha caixas no embarque', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: () => {} });
  assert.equal(document.querySelector('[data-acao-caixa-existente]'), null);
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('clicar em Nova caixa sem numero chama onConfirmar com a flag direta', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});

test('clicar em Nova caixa numerada troca estado, mostra input e Confirmar/Voltar', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: () => {} });
  document.querySelector('[data-acao-nova-numerada]').click();
  assert.ok(document.querySelector('[data-input="numero_caixa"]'));
  assert.ok(document.querySelector('[data-acao-confirmar-numerada]'));
  assert.ok(document.querySelector('[data-acao-voltar-numerada]'));
  assert.equal(document.querySelector('[data-acao-sem-numero]'), null);
});

test('Confirmar de Nova numerada chama onConfirmar com numero_caixa', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-nova-numerada]').click();
  document.querySelector('[data-input="numero_caixa"]').value = 'CX-077';
  document.querySelector('[data-acao-confirmar-numerada]').click();
  assert.deepEqual(payload, { numero_caixa: 'CX-077' });
});

test('Voltar de Nova numerada restaura os tres botoes', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-nova-numerada]').click();
  document.querySelector('[data-acao-voltar-numerada]').click();
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('Caixa existente abre Modal 2 e selecao la chama onConfirmar com caixa_id', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-caixa-existente]').click();
  const linhaCx = document.querySelector('[data-linha-caixa-opcao]');
  assert.ok(linhaCx);
  linhaCx.click();
  document.querySelector('[data-acao-concluir]').click();
  assert.deepEqual(payload, { caixa_id: 'CX-001' });
});

test('Voltar no Modal 2 reabre o Modal 1', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
});

test('Voltar no Modal 3 reabre o Modal 2', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-linha-caixa-opcao]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.ok(document.querySelector('[data-linha-caixa-opcao]'));
});

test('aviso de faturado bloqueia acoes ate checkbox ser marcado', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], embarqueFaturado: true, onConfirmar: (p) => { payload = p; } });
  assert.ok(document.querySelector('[data-input="confirmar-recusa"]'));
  document.querySelector('[data-acao-sem-numero]').click();
  assert.equal(payload, null);
  document.querySelector('[data-input="confirmar-recusa"]').checked = true;
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});

test('estado do checkbox faturado e preservado ao voltar do Modal 2', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, embarqueFaturado: true, onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-input="confirmar-recusa"]').checked = true;
  document.querySelector('[data-input="confirmar-recusa"]').dispatchEvent(new Event('change'));
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(document.querySelector('[data-input="confirmar-recusa"]').checked, true);
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});
