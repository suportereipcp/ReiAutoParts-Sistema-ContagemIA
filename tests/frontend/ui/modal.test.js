import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Modal } from '../../../public/js/ui/primitives/modal.js';

beforeEach(() => criarDOM('<div id="root"></div>'));
afterEach(() => limparDOM());

test('abrir anexa ao document.body', () => {
  const m = Modal({ title: 'Nova Carga' });
  m.abrir();
  const overlay = document.querySelector('[data-modal-overlay]');
  assert.ok(overlay);
  assert.match(overlay.className, /backdrop-blur-sm/);
});

test('fechar remove', () => {
  const m = Modal({ title: 'x' });
  m.abrir();
  m.fechar();
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('Escape fecha', () => {
  const m = Modal({ title: 'x' });
  m.abrir();
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('onFechar invocado no fechar', () => {
  let n = 0;
  const m = Modal({ title: 'x', onFechar: () => n++ });
  m.abrir();
  m.fechar();
  assert.equal(n, 1);
});
