import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderRelatoriosCargasAbertas } from '../../../public/js/pages/relatorios-cargas-abertas.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function apiFake(porRota) {
  return { get: async (path) => (porRota[path] ?? []) };
}

test('renderiza stats + tabs + tabela com embarques abertos', async () => {
  const abertos = [
    { numero_embarque: 'SHP-0126', status: 'aberto', data_criacao: '2026-04-17T08:30:00Z', qtd_caixas: 42, qtd_pecas: 1250 },
    { numero_embarque: 'SHP-0127', status: 'aberto', data_criacao: '2026-04-17T09:15:00Z', qtd_caixas: 0, qtd_pecas: 0 },
  ];
  const todos = [
    ...abertos,
    { numero_embarque: 'SHP-0100', status: 'fechado' },
  ];
  const ctx = { api: apiFake({ '/embarques?status=aberto': abertos, '/embarques': todos }) };
  const el = await renderRelatoriosCargasAbertas(ctx);
  assert.ok(el.querySelector('[data-stat="produtividade"]'));
  assert.ok(el.querySelector('[data-stat="aguardando"]'));
  assert.ok(el.querySelector('[data-tab="expedidas"]'));
  assert.ok(el.querySelector('[data-tab="abertas"]'));
  const linhas = el.querySelectorAll('[data-linha-embarque]');
  assert.equal(linhas.length, 2);
  assert.match(el.textContent, /SHP-0126/);
  assert.match(el.textContent, /1\.250/);
});

test('sem cargas abertas exibe mensagem de vazio', async () => {
  const ctx = { api: apiFake({ '/embarques?status=aberto': [], '/embarques': [] }) };
  const el = await renderRelatoriosCargasAbertas(ctx);
  assert.match(el.textContent, /Nenhuma carga aberta/);
  assert.equal(el.querySelectorAll('[data-linha-embarque]').length, 0);
});

test('botão Detalhes abre modal emitir relatório', async () => {
  const abertos = [{ numero_embarque: 'SHP-9', status: 'aberto', data_criacao: '2026-04-01T00:00:00Z' }];
  const ctx = { api: apiFake({ '/embarques?status=aberto': abertos, '/embarques': abertos }) };
  const el = await renderRelatoriosCargasAbertas(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-acao-detalhes="SHP-9"]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.ok(document.querySelector('[data-modal-overlay]'));
});
