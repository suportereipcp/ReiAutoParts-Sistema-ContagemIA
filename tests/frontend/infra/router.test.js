import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarRouter } from '../../../public/js/infra/router.js';

beforeEach(() => criarDOM('<div id="root"></div>'));
afterEach(() => limparDOM());

test('roteia rota exata', async () => {
  let rendered = '';
  const router = criarRouter({
    root: '#root',
    rotas: {
      '/': () => 'inicial',
      '/cargas': () => 'cargas',
    },
    render: (html) => { rendered = html; },
  });
  window.location.hash = '#/cargas';
  await router.resolver();
  assert.equal(rendered, 'cargas');
});

test('fallback para rota desconhecida renderiza "/"', async () => {
  let rendered = '';
  const router = criarRouter({
    root: '#root',
    rotas: { '/': () => 'home' },
    render: (html) => { rendered = html; },
  });
  window.location.hash = '#/xyz';
  await router.resolver();
  assert.equal(rendered, 'home');
});

test('extrai params de rota dinâmica', async () => {
  let capturado = null;
  const router = criarRouter({
    root: '#root',
    rotas: { '/cargas/:numero': (params) => { capturado = params; return 'x'; } },
    render: () => {},
  });
  window.location.hash = '#/cargas/SHP-42';
  await router.resolver();
  assert.deepEqual(capturado, { numero: 'SHP-42' });
});
