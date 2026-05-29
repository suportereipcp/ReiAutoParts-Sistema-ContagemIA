import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderSelecaoCarga } from '../../../public/js/pages/selecao-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function ctxComEmbarques(embarques, sessoesAtivas = []) {
  return {
    catalogos: {
      embarques: async () => embarques,
    },
    api: {
      get: async (path) => {
        if (path === '/sessoes') return sessoesAtivas;
        return [];
      },
    },
    faturamentoSvc: {
      previewMassa: async () => ({ caixas: 0, etiquetas: 0 }),
    },
  };
}

test('renderSelecaoCarga vira gerenciador com stats, tabs e tabela de abertas', async () => {
  const ctx = ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
    { numero_embarque: 'SHP-0127', status: 'aberto', data_criacao: '2026-04-17T09:15:00Z', qtd_caixas: 0, qtd_pecas: 0 },
    { numero_embarque: 'SHP-0100', status: 'fechado', numero_nota_fiscal: 'NF-1', qtd_pecas: 400 },
  ]);
  const el = await renderSelecaoCarga(ctx);
  assert.ok(el.querySelector('[data-stat="produtividade"]'));
  assert.ok(el.querySelector('[data-stat="pendentes-nota"]'));
  assert.ok(el.querySelector('[data-tab-cargas="abertas"]'));
  assert.ok(el.querySelector('[data-tab-cargas="expedidas"]'));
  assert.match(el.textContent, /Relatório de Cargas em Processo/);
  assert.equal(el.querySelectorAll('[data-linha-embarque]').length, 2);
  assert.match(el.textContent, /SHP-0126/);
  assert.match(el.textContent, /1\.250/);
});

test('cada linha aberta tem botao Iniciar Contagem quando cameras livres', async () => {
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
    { numero_embarque: 'SHP-0127', status: 'aberto', data_criacao: '2026-04-17T09:15:00Z', qtd_caixas: 0, qtd_pecas: 0 },
  ]));
  const botoes = el.querySelectorAll('[data-acao-iniciar]');
  assert.equal(botoes.length, 2);
});

test('status badge mostra Disponivel quando nao ha sessoes ativas', async () => {
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
  ]));
  const linha = el.querySelector('[data-linha-embarque="SHP-0126"]');
  assert.match(linha.textContent, /Disponivel/);
});

test('status badge mostra Em contagem quando embarque tem sessao ativa', async () => {
  const sessoes = [
    { numero_embarque: 'SHP-0126', camera_id: 1, status: 'ativa' },
  ];
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
  ], sessoes));
  const linha = el.querySelector('[data-linha-embarque="SHP-0126"]');
  assert.match(linha.textContent, /Em contagem/);
});

test('Iniciar Contagem desabilitado quando todas cameras ocupadas pelo mesmo embarque', async () => {
  const sessoes = [
    { numero_embarque: 'SHP-0127', camera_id: 1, status: 'ativa' },
    { numero_embarque: 'SHP-0127', camera_id: 2, status: 'ativa' },
  ];
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0127', status: 'aberto', data_criacao: '2026-04-17T09:15:00Z', qtd_caixas: 0, qtd_pecas: 0 },
  ], sessoes));
  const btnDisabled = el.querySelector('[data-acao-iniciar-disabled="SHP-0127"]');
  assert.ok(btnDisabled);
  assert.equal(el.querySelector('[data-acao-iniciar="SHP-0127"]'), null);
});

test('clicar na aba Expedidas troca a tabela e navega para detalhe expedido', async () => {
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
    { numero_embarque: 'SHP-0999', status: 'fechado', numero_nota_fiscal: 'NF-999', data_criacao: '2026-04-16T08:30:00Z', qtd_pecas: 900 },
  ]));
  document.body.appendChild(el);
  el.querySelector('[data-tab-cargas="expedidas"]').click();
  assert.match(el.textContent, /Relatório de Cargas Expedidas/);
  assert.equal(el.querySelectorAll('[data-linha-embarque]').length, 1);
  el.querySelector('[data-acao-carga="SHP-0999"]').click();
  assert.equal(window.location.hash, '#/expedidas/SHP-0999');
});

test('sem cargas abertas, expedidas vira aba inicial', async () => {
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0999', status: 'fechado', numero_nota_fiscal: 'NF-999', data_criacao: '2026-04-16T08:30:00Z', qtd_pecas: 900 },
  ]));
  assert.match(el.textContent, /Relatório de Cargas Expedidas/);
  assert.equal(el.querySelector('[data-tab-cargas="expedidas"]').dataset.ativo, 'true');
});

test('alerta de pendencia de nota fiscal considera cargas fechadas sem nota', async () => {
  const el = await renderSelecaoCarga(ctxComEmbarques([
    { numero_embarque: 'SHP-0126', status: 'aberto' },
    { numero_embarque: 'SHP-0999', status: 'fechado', numero_nota_fiscal: null },
    { numero_embarque: 'SHP-1000', status: 'fechado', numero_nota_fiscal: '' },
    { numero_embarque: 'SHP-1001', status: 'fechado', numero_nota_fiscal: 'NF-1001' },
  ]));
  const alerta = el.querySelector('[data-stat="pendentes-nota"]');
  assert.match(alerta.textContent, /2/);
});
