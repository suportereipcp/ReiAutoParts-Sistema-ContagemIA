import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDetalhesCarga } from '../../../public/js/pages/detalhes-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderDetalhesCarga busca embarque + caixas', async () => {
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '01', motorista: 'E', status: 'aberto', data_criacao: '2026-04-18T00:00:00Z' };
        if (path.startsWith('/sessoes')) return [
          { id: 'a', numero_embarque: '01', camera_id: 1, quantidade_total: 5, numero_caixa: 'CX-1', codigo_op: 'OP1', status: 'encerrada', encerrada_em: '2026-04-18T10:00:00Z' },
          { id: 'b', numero_embarque: '01', camera_id: 2, quantidade_total: 3, codigo_op: 'OP1', status: 'ativa', programa_nome: 'PECA-X', iniciada_em: '2026-04-18T11:00:00Z' },
        ];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
  };
  const el = await renderDetalhesCarga(ctx, '01');
  assert.match(el.textContent, /01/);
  assert.match(el.textContent, /CX-1/);
  assert.match(el.textContent, /PECA-X/);
});
