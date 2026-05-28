import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalPacklistCaixa } from '../../../public/js/ui/composites/modal-packlist-caixa.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessoes = [
  { id: 'S1', codigo_op: 'OP-1234', programa_nome: 'Filtro de oleo', quantidade_total: 150, codigo_operador: 'OP01', encerrada_em: '2026-05-28T14:23:00Z' },
  { id: 'S2', codigo_op: 'OP-1234', programa_nome: 'Filtro de oleo', quantidade_total: 80, codigo_operador: 'OP02', encerrada_em: '2026-05-28T15:10:00Z' },
];

test('renderiza cabecalho com numero da caixa e OP', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  assert.match(document.body.textContent, /CX-007/);
  assert.match(document.body.textContent, /OP-1234/);
});

test('lista cada sessao com qtd, operador e horario', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-sessao]');
  assert.equal(linhas.length, 2);
  assert.match(linhas[0].textContent, /150/);
  assert.match(linhas[0].textContent, /OP01/);
  assert.match(linhas[1].textContent, /80/);
  assert.match(linhas[1].textContent, /OP02/);
});

test('rotula Sem numero quando caixaId tem prefixo', () => {
  abrirModalPacklistCaixa({ caixaId: '__SEM_NUMERO__003', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  assert.match(document.body.textContent, /Sem n.mero #3/);
});

test('exibe total somado das sessoes', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  const total = document.querySelector('[data-packlist-total]');
  assert.ok(total);
  assert.match(total.textContent, /230/);
});

test('botao Concluir chama onConfirmar', () => {
  let chamou = false;
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => { chamou = true; }, onVoltar: () => {} });
  document.querySelector('[data-acao-concluir]').click();
  assert.equal(chamou, true);
});

test('botao Voltar chama onVoltar e nao chama onConfirmar', () => {
  let confirmou = false; let voltou = false;
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => { confirmou = true; }, onVoltar: () => { voltou = true; } });
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(voltou, true);
  assert.equal(confirmou, false);
});
