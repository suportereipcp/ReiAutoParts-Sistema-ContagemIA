import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarWS } from '../../../public/js/infra/ws.js';

class FakeWS {
  constructor() { this.handlers = {}; FakeWS.last = this; }
  addEventListener(ev, fn) { (this.handlers[ev] ??= []).push(fn); }
  dispatch(ev, data) { for (const fn of (this.handlers[ev] ?? [])) fn(data); }
}

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('despacha evento customizado ao receber mensagem', async () => {
  const ws = criarWS({ url: 'ws://x', WS: FakeWS });
  let capturado = null;
  document.addEventListener('ws:sync.status', (e) => { capturado = e.detail; });
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'sync.status', payload: { estado: 'ONLINE' } }) });
  assert.deepEqual(capturado, { estado: 'ONLINE' });
});

test('on registra listener com remoção', () => {
  const ws = criarWS({ url: 'ws://x', WS: FakeWS });
  let n = 0;
  const off = ws.on('contagem.incrementada', () => n++);
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'contagem.incrementada', payload: {} }) });
  off();
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'contagem.incrementada', payload: {} }) });
  assert.equal(n, 1);
});
