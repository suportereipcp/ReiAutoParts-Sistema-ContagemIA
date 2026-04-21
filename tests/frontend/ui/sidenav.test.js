import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { SideNav } from '../../../public/js/ui/primitives/sidenav.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('SideNav gera aside fixed w-64', () => {
  const el = SideNav({
    titulo: 'Rei AutoParts',
    subtitulo: 'Inspeção Silenciosa',
    itens: [
      { id: 'inicial', label: 'Inicial', icone: 'dashboard', href: '#/' },
      { id: 'cargas', label: 'Cargas', icone: 'package_2', href: '#/cargas' },
    ],
    ativo: 'inicial',
  });
  assert.equal(el.tagName, 'ASIDE');
  assert.match(el.className, /w-64/);
  assert.match(el.className, /fixed/);
});

test('marca item ativo visualmente', () => {
  const el = SideNav({ titulo: 't', itens: [{ id: 'a', label: 'A', icone: 'x', href: '#/' }], ativo: 'a' });
  const ativoEl = el.querySelector('[data-ativo="true"]');
  assert.ok(ativoEl);
  assert.match(ativoEl.textContent, /A/);
});

test('itens geram âncoras com href correto', () => {
  const el = SideNav({ titulo: 't', itens: [{ id: 'b', label: 'B', icone: 'x', href: '#/b' }] });
  const anchor = el.querySelector('a[href="#/b"]');
  assert.ok(anchor);
});
