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
