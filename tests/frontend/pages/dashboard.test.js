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

test('Continuar Carga sem embarques abertos exibe toast informativo', async () => {
  const ctx = ctxSync({ get: async () => [] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Nenhuma carga aberta/);
});

test('Continuar Carga com 1 embarque aberto navega para o detalhe do embarque', async () => {
  const ctx = ctxSync({ get: async () => [{ numero_embarque: 'EB-01' }] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.equal(window.location.hash, '#/cargas/EB-01');
});

test('Continuar Carga com múltiplos embarques abertos navega para a lista de cargas', async () => {
  const ctx = ctxSync({ get: async () => [
    { numero_embarque: 'EB-01' },
    { numero_embarque: 'EB-02' },
  ] });
  const el = renderDashboard(ctx);
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 20));
  assert.equal(window.location.hash, '#/cargas');
});

test('Continuar Carga com 1 sessão ativa abre modal de carga atual', async () => {
  const api = {
    get: async (path) => {
      if (path === '/sessoes') return [{ id: 'S1', numero_embarque: 'EB-01', codigo_op: 'OP-2024-8842', codigo_operador: '1807', programa_nome: 'Disco Freio Ventilado T-800', camera_id: 1 }];
      if (path === '/embarques?status=aberto') return [{ numero_embarque: 'EB-01' }];
      return [];
    },
  };
  const el = renderDashboard(ctxSync(api));
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 30));
  assert.ok(document.querySelector('[data-stage="continuar-unica"]'));
});

test('Continuar Carga com múltiplas sessões ativas abre modal de seleção', async () => {
  const api = {
    get: async (path) => {
      if (path === '/sessoes') return [
        { id: 'S1', numero_embarque: 'EB-01', programa_nome: 'PECA-A', camera_id: 1 },
        { id: 'S2', numero_embarque: 'EB-02', programa_nome: 'PECA-B', camera_id: 2 },
      ];
      if (path === '/embarques?status=aberto') return [{ numero_embarque: 'EB-01' }, { numero_embarque: 'EB-02' }];
      return [];
    },
  };
  const el = renderDashboard(ctxSync(api));
  document.body.appendChild(el);
  el.querySelector('[data-quick-action="continuar-carga"]').click();
  await new Promise(r => setTimeout(r, 30));
  assert.ok(document.querySelector('[data-stage="continuar-multipla"]'));
});
