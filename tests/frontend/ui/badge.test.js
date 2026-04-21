import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { SyncBadge } from '../../../public/js/ui/primitives/badge.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('ONLINE → verde e texto Online', () => {
  const el = SyncBadge('ONLINE');
  assert.match(el.className, /bg-emerald/);
  assert.equal(el.textContent.trim(), 'Online');
});

test('OFFLINE → âmbar e texto Offline', () => {
  const el = SyncBadge('OFFLINE');
  assert.match(el.className, /bg-amber/);
});

test('RECOVERY → azul', () => {
  const el = SyncBadge('RECOVERY');
  assert.match(el.className, /bg-sky/);
});

test('DESCONHECIDO → slate neutro', () => {
  const el = SyncBadge('DESCONHECIDO');
  assert.match(el.className, /bg-slate/);
});
