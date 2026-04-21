import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDashboard } from '../../../public/js/pages/dashboard.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function ctxSync(api = { get: async () => [] }) {
  return { sync: { atual: () => ({ estado: 'ONLINE' }) }, api };
}

test('renderDashboard retorna container com 3 quick actions', () => {
  const el = renderDashboard(ctxSync());
  const botoes = el.querySelectorAll('[data-quick-action]');
  assert.equal(botoes.length, 3);
  assert.match(botoes[0].textContent, /Nova Contagem/);
  assert.match(botoes[1].textContent, /Continuar Carga/);
  assert.match(botoes[2].textContent, /Emitir Relatórios/);
});

test('quick action Nova Contagem linka para /cargas', () => {
  const el = renderDashboard(ctxSync());
  const a = el.querySelector('[data-quick-action="nova-contagem"]');
  assert.equal(a.getAttribute('href'), '#/cargas');
});

test('Continuar Carga sem sessões ativas exibe toast informativo', async () => {
  const ctx = ctxSync({ get: async () => [] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Nenhuma carga pendente/);
});

test('Continuar Carga com 1 sessão abre modal único', async () => {
  const ctx = ctxSync({ get: async () => [{ id: 'S1', numero_embarque: 'EB-01', codigo_op: 'OP-1', camera_id: 1, programa_nome: 'PECA' }] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.ok(document.querySelector('[data-stage="continuar-unica"]'));
});

test('Continuar Carga com múltiplas sessões abre modal wide', async () => {
  const ctx = ctxSync({ get: async () => [
    { id: 'S1', numero_embarque: 'EB-01', camera_id: 1 },
    { id: 'S2', numero_embarque: 'EB-02', camera_id: 2 },
  ] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.ok(document.querySelector('[data-stage="continuar-multipla"]'));
});
