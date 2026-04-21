import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderSelecaoCarga } from '../../../public/js/pages/selecao-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderSelecaoCarga lista cargas do catálogo', async () => {
  const ctx = {
    catalogos: {
      embarquesAbertos: async () => [
        { numero_embarque: '01', motorista: 'E', placa: 'X-1', data_criacao: '2026-04-18T00:00:00Z' },
        { numero_embarque: '02', motorista: 'M', placa: 'X-2', data_criacao: '2026-04-19T00:00:00Z' },
      ],
    },
  };
  const el = await renderSelecaoCarga(ctx);
  const cards = el.querySelectorAll('a[href^="#/cargas/"]');
  assert.equal(cards.length, 2);
});

test('botão Nova Carga presente', async () => {
  const ctx = { catalogos: { embarquesAbertos: async () => [] } };
  const el = await renderSelecaoCarga(ctx);
  const btn = el.querySelector('[data-abrir-nova-carga]');
  assert.ok(btn);
});
