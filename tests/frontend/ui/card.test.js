import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Card } from '../../../public/js/ui/primitives/card.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Card cria div com bg-surface-container-lowest rounded-xl', () => {
  const el = Card();
  assert.match(el.className, /bg-surface-container-lowest/);
  assert.match(el.className, /rounded-xl/);
});

test('Card aceita conteúdo', () => {
  const child = document.createElement('p');
  child.textContent = 'hi';
  const el = Card({ children: [child] });
  assert.equal(el.querySelector('p').textContent, 'hi');
});

test('title opcional gera h3', () => {
  const el = Card({ title: 'Sessão Ativa' });
  assert.equal(el.querySelector('h3').textContent, 'Sessão Ativa');
});
