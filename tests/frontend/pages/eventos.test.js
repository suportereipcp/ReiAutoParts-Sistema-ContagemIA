import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderEventos } from '../../../public/js/pages/eventos.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderEventos exibe tabela com eventos do api', async () => {
  const ctx = { api: { get: async () => [
    { nivel: 'INFO', categoria: 'SESSAO', mensagem: 'Abriu', timestamp: '2026-04-20T10:00:00Z' },
    { nivel: 'ERROR', categoria: 'SYNC', mensagem: 'Falha', timestamp: '2026-04-20T10:01:00Z' },
  ]}};
  const el = await renderEventos(ctx);
  assert.equal(el.querySelectorAll('[data-linha-evento]').length, 2);
});
