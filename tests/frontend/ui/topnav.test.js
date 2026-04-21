import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { TopNav } from '../../../public/js/ui/primitives/topnav.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('TopNav gera header fixed com breadcrumb + slot para badge', () => {
  const badge = document.createElement('span');
  badge.textContent = 'sync';
  const el = TopNav({ caminho: ['Análise', 'Cargas'], badge });
  assert.equal(el.tagName, 'HEADER');
  assert.match(el.textContent, /Análise/);
  assert.match(el.textContent, /Cargas/);
  assert.match(el.textContent, /sync/);
});

test('último item do caminho recebe font-semibold', () => {
  const el = TopNav({ caminho: ['A', 'B'] });
  const spans = el.querySelectorAll('span');
  const last = Array.from(spans).find(s => s.textContent === 'B');
  assert.match(last.className, /font-semibold/);
});
