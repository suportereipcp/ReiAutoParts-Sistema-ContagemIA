import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Input } from '../../../public/js/ui/primitives/input.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Input cria wrapper com label em uppercase tracking-widest', () => {
  const el = Input({ label: 'Ordem', placeholder: 'OP-1', id: 'in-op' });
  const lab = el.querySelector('label');
  const inp = el.querySelector('input');
  assert.match(lab.className, /uppercase/);
  assert.match(lab.className, /tracking-widest/);
  assert.equal(inp.placeholder, 'OP-1');
  assert.equal(inp.id, 'in-op');
  assert.match(inp.className, /bg-surface-container-high/);
  assert.match(inp.className, /border-none/);
});

test('type=password aceito', () => {
  const el = Input({ label: 'Senha', type: 'password' });
  assert.equal(el.querySelector('input').type, 'password');
});

test('onInput ouve input', () => {
  const el = Input({ label: 'x', onInput: (v) => (el._capturado = v) });
  const inp = el.querySelector('input');
  inp.value = 'abc';
  inp.dispatchEvent(new Event('input'));
  assert.equal(el._capturado, 'abc');
});
