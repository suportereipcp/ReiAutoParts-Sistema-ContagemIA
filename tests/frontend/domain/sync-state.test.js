import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarSyncState } from '../../../public/js/domain/sync-state.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('estado inicial é DESCONHECIDO', () => {
  const s = criarSyncState();
  assert.equal(s.atual().estado, 'DESCONHECIDO');
});

test('aplicaHealth atualiza estado + outbox', () => {
  const s = criarSyncState();
  s.aplicaHealth({ sync: { estado: 'ONLINE', outbox_pendentes: 3 } });
  assert.equal(s.atual().estado, 'ONLINE');
  assert.equal(s.atual().outbox_pendentes, 3);
});

test('notifica subscribers ao mudar', () => {
  const s = criarSyncState();
  const vistos = [];
  s.subscribe(e => vistos.push(e.estado));
  s.aplicaHealth({ sync: { estado: 'ONLINE', outbox_pendentes: 0 } });
  s.aplicaHealth({ sync: { estado: 'OFFLINE', outbox_pendentes: 2 } });
  assert.deepEqual(vistos, ['ONLINE', 'OFFLINE']);
});

test('aplicaEventoWS({estado}) atualiza', () => {
  const s = criarSyncState();
  s.aplicaEventoWS({ estado: 'RECOVERY' });
  assert.equal(s.atual().estado, 'RECOVERY');
});
