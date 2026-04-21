import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Icon } from '../../../public/js/ui/primitives/icon.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Icon cria span material-symbols-outlined', () => {
  const el = Icon('factory');
  assert.equal(el.tagName, 'SPAN');
  assert.match(el.className, /material-symbols-outlined/);
  assert.equal(el.textContent, 'factory');
});

test('Icon aceita classes extras', () => {
  const el = Icon('check_circle', { className: 'text-secondary' });
  assert.match(el.className, /text-secondary/);
});
