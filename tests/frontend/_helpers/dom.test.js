import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from './dom.js';

test('criarDOM injeta document/window globais', () => {
  criarDOM();
  assert.ok(globalThis.document);
  assert.ok(globalThis.window);
  assert.equal(globalThis.document.body.innerHTML, '');
  limparDOM();
});

test('limparDOM remove globais', () => {
  criarDOM();
  limparDOM();
  assert.equal(globalThis.document, undefined);
});

test('criarDOM permite query seletor', () => {
  criarDOM('<div id="x">oi</div>');
  assert.equal(document.getElementById('x').textContent, 'oi');
  limparDOM();
});
