import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalSelecionarCaixa } from '../../../public/js/ui/composites/modal-selecionar-caixa.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessoesEmbarque = [
  { id: 'S1', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 100, encerrada_em: '2026-05-28T10:00:00Z', status: 'encerrada' },
  { id: 'S2', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 50, encerrada_em: '2026-05-28T10:30:00Z', status: 'encerrada' },
  { id: 'S3', numero_caixa: 'CX-002', codigo_op: 'OP-B', programa_nome: 'Disco', quantidade_total: 200, encerrada_em: '2026-05-28T11:00:00Z', status: 'encerrada' },
  { id: 'S4', numero_caixa: '__SEM_NUMERO__001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 30, encerrada_em: '2026-05-28T09:00:00Z', status: 'encerrada' },
];

test('lista todas as caixas do embarque com numero, OP, total e qtd sessoes', () => {
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-caixa-opcao]');
  assert.equal(linhas.length, 3);
  const textos = [...linhas].map((l) => l.textContent);
  assert.ok(textos.some((t) => /CX-001/.test(t) && /OP-A/.test(t) && /150/.test(t)));
  assert.ok(textos.some((t) => /CX-002/.test(t) && /OP-B/.test(t) && /200/.test(t)));
  assert.ok(textos.some((t) => /Sem n.mero #1/.test(t) && /30/.test(t)));
});

test('marca caixas com OP diferente como desabilitadas', () => {
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const incompativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /OP-B/.test(l.textContent));
  assert.equal(incompativel.dataset.incompativel, 'true');
  assert.match(incompativel.getAttribute('title') ?? '', /incompat/i);
});

test('clicar em caixa compativel chama onSelecionar com o caixaId', () => {
  let selecionado = null;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: (id) => { selecionado = id; }, onVoltar: () => {} });
  const compativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /CX-001/.test(l.textContent));
  compativel.click();
  assert.equal(selecionado, 'CX-001');
});

test('clicar em caixa incompativel NAO chama onSelecionar', () => {
  let selecionado = null;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: (id) => { selecionado = id; }, onVoltar: () => {} });
  const incompativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /OP-B/.test(l.textContent));
  incompativel.click();
  assert.equal(selecionado, null);
});

test('botao Voltar chama onVoltar', () => {
  let voltou = false;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => { voltou = true; } });
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(voltou, true);
});

test('ignora sessoes canceladas e ativas sem caixa', () => {
  const dados = [
    ...sessoesEmbarque,
    { id: 'S5', codigo_op: 'OP-A', status: 'ativa', programa_nome: 'X', quantidade_total: 0 },
    { id: 'S6', numero_caixa: 'CX-X', codigo_op: 'OP-A', status: 'cancelada', quantidade_total: 99, encerrada_em: '2026-05-28T12:00:00Z' },
  ];
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: dados, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-caixa-opcao]');
  assert.equal(linhas.length, 3);
  assert.equal([...linhas].some((l) => /CX-X/.test(l.textContent)), false);
});
