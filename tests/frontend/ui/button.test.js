import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Button } from '../../../public/js/ui/primitives/button.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('variante primary aplica zen-satin', () => {
  const el = Button({ texto: 'Continuar', variante: 'primary' });
  assert.match(el.className, /zen-satin/);
  assert.equal(el.textContent, 'Continuar');
});

test('variante secondary sem background', () => {
  const el = Button({ texto: 'Cancelar', variante: 'secondary' });
  assert.doesNotMatch(el.className, /zen-satin/);
  assert.match(el.className, /text-primary/);
});

test('onClick é chamado', () => {
  let clicado = 0;
  const el = Button({ texto: 'x', onClick: () => clicado++ });
  el.click();
  assert.equal(clicado, 1);
});

test('iconOnly tem rounded-full', () => {
  const el = Button({ variante: 'icon-only', icone: 'search' });
  assert.match(el.className, /rounded-full/);
});

test('disabled seta atributo', () => {
  const el = Button({ texto: 'x', disabled: true });
  assert.equal(el.disabled, true);
});

test('variante danger aplica bg-error e shadow-error/20', () => {
  const el = Button({ texto: 'Danger', variante: 'danger' });
  assert.match(el.className, /bg-error/);
  assert.match(el.className, /shadow-error\/20/);
});

test('variante outline-danger aplica border-error e text-error', () => {
  const el = Button({ texto: 'Outline Danger', variante: 'outline-danger' });
  assert.match(el.className, /border-error/);
  assert.match(el.className, /text-error/);
});

test('size sm aplica classes corretas', () => {
  const el = Button({ texto: 'Small', size: 'sm' });
  assert.match(el.className, /text-xs/);
  assert.match(el.className, /px-3 py-1\.5/);
});

test('size md (default) aplica classes corretas', () => {
  const el = Button({ texto: 'Medium' });
  assert.match(el.className, /text-sm/);
  assert.match(el.className, /px-6 py-3/);
});
