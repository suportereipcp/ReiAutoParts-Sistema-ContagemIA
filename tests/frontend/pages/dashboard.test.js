import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDashboard } from '../../../public/js/pages/dashboard.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderDashboard retorna container com 2 quick actions', () => {
  const ctx = { sync: { atual: () => ({ estado: 'ONLINE' }) } };
  const el = renderDashboard(ctx);
  const botoes = el.querySelectorAll('[data-quick-action]');
  assert.equal(botoes.length, 2);
  assert.match(botoes[0].textContent, /Nova Contagem/);
  assert.match(botoes[1].textContent, /Emitir Relatórios/);
});

test('quick action Nova Contagem linka para /cargas', () => {
  const el = renderDashboard({ sync: { atual: () => ({ estado: 'ONLINE' }) } });
  const a = el.querySelector('[data-quick-action="nova-contagem"]');
  assert.equal(a.getAttribute('href'), '#/cargas');
});
