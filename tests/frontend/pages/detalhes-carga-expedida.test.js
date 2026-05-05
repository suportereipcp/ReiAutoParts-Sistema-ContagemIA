import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDetalhesCargaExpedida } from '../../../public/js/pages/detalhes-carga-expedida.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function fakeCtx({ embarque, caixas }) {
  return {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return embarque;
        if (path.startsWith('/sessoes')) return caixas;
        return [];
      },
    },
  };
}

test('renderiza bento Expedido + logística + tabela com totais', async () => {
  const ctx = fakeCtx({
    embarque: {
      numero_embarque: 'SHP-0125',
      numero_nota_fiscal: 'NF-992110',
      atualizado_em: '2026-04-14T12:00:00Z',
      motorista: 'João Silva',
      placa: 'ABC-1234',
    },
    caixas: [
      { id: 'a', quantidade_total: 450, codigo_op: 'OP-1', codigo_operador: '1807', numero_caixa: 'CX-0012', programa_nome: 'Disco Freio', programa_numero: 3, status: 'encerrada', encerrada_em: '2026-04-14T10:00:00Z' },
      { id: 'b', quantidade_total: 320, codigo_op: 'OP-2', codigo_operador: '1807', numero_caixa: 'CX-0013', programa_nome: 'Cubo Roda', programa_numero: 4, status: 'encerrada', encerrada_em: '2026-04-14T11:00:00Z' },
    ],
  });
  const el = await renderDetalhesCargaExpedida(ctx, 'SHP-0125');
  assert.ok(el.querySelector('[data-bento-resumo]'));
  assert.ok(el.querySelector('[data-bento-logistica]'));
  assert.match(el.textContent, /Status: Expedido/);
  assert.match(el.textContent, /SHP-0125/);
  assert.match(el.textContent, /NF-992110/);
  assert.match(el.textContent, /14\/04\/2026/);
  assert.match(el.textContent, /João Silva/);
  assert.match(el.textContent, /ABC-1234/);
  assert.match(el.textContent, /Detalhamento da Carga/);
  assert.match(el.textContent, /Exportar Manifesto/);
  assert.equal(el.querySelectorAll('[data-linha-caixa]').length, 2);
  assert.match(el.textContent, /770 un/);
});

test('sem caixas encerradas exibe mensagem de vazio', async () => {
  const ctx = fakeCtx({
    embarque: { numero_embarque: 'EB-0', numero_nota_fiscal: null, motorista: null, placa: null },
    caixas: [{ id: 'x', status: 'ativa', quantidade_total: 5 }],
  });
  const el = await renderDetalhesCargaExpedida(ctx, 'EB-0');
  assert.equal(el.querySelectorAll('[data-linha-caixa]').length, 0);
  assert.match(el.textContent, /Nenhuma caixa encerrada/);
});

test('link Exportar Manifesto aponta para XLSX do relatório', async () => {
  const ctx = fakeCtx({
    embarque: { numero_embarque: 'EB-9', numero_nota_fiscal: 'NF-9', motorista: 'X', placa: 'Y' },
    caixas: [],
  });
  const el = await renderDetalhesCargaExpedida(ctx, 'EB-9');
  const btn = el.querySelector('[data-acao="exportar"]');
  assert.ok(btn);
});
