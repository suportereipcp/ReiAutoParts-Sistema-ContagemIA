import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { toast } from '../../../public/js/ui/primitives/toast.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('toast.erro anexa e remove após timeout', async () => {
  toast.erro('Câmera desconectada', { duracaoMs: 50 });
  assert.match(document.body.innerHTML, /Câmera desconectada/);
  await new Promise(r => setTimeout(r, 80));
  assert.doesNotMatch(document.body.innerHTML, /Câmera desconectada/);
});

test('toast.sucesso usa secondary-container', () => {
  toast.sucesso('Caixa encerrada', { duracaoMs: 1000 });
  const el = document.querySelector('[data-toast]');
  assert.match(el.className, /bg-secondary-container/);
});

test('toast.info renderiza bg-surface-container-high', () => {
  toast.info('Aviso', { duracaoMs: 1000 });
  const el = document.querySelector('[data-toast]');
  assert.match(el.className, /bg-surface-container-high/);
});
