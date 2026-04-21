import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarApi } from '../../../public/js/infra/api.js';

let fetchCalls;
function fakeFetch(resp) {
  fetchCalls = [];
  return async (url, opts) => { fetchCalls.push({ url, opts }); return resp; };
}

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('get retorna JSON em caso de 2xx', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: true, json: async () => ({ a: 1 }) }) });
  const r = await api.get('/foo');
  assert.deepEqual(r, { a: 1 });
  assert.equal(fetchCalls[0].url, 'http://x/foo');
});

test('post envia JSON e Content-Type', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: true, json: async () => ({ ok: true }) }) });
  await api.post('/bar', { n: 2 });
  const opts = fetchCalls[0].opts;
  assert.equal(opts.method, 'POST');
  assert.equal(opts.headers['Content-Type'], 'application/json');
  assert.equal(opts.body, '{"n":2}');
});

test('erro HTTP 4xx captura mensagem do corpo', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: false, status: 400, json: async () => ({ erro: 'bad' }), statusText: 'Bad Request' }) });
  await assert.rejects(api.post('/x', {}), /bad/);
});

test('erro sem JSON usa statusText', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: false, status: 500, json: async () => { throw new Error('no json'); }, statusText: 'Server Error' }) });
  await assert.rejects(api.post('/x', {}), /Server Error/);
});
