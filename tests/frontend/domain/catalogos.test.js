import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCatalogos } from '../../../public/js/domain/catalogos.js';

function fakeApi() {
  const c = {
    gets: [],
    async get(path) { c.gets.push(path); return c._resp[path] ?? []; },
    _resp: {},
  };
  return c;
}

test('embarquesAbertos usa cache na 2a chamada', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=aberto'] = [{ numero_embarque: '01' }];
  const cat = criarCatalogos({ api });
  await cat.embarquesAbertos();
  await cat.embarquesAbertos();
  assert.equal(api.gets.length, 1);
});

test('invalidarEmbarques força refetch', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=aberto'] = [];
  const cat = criarCatalogos({ api });
  await cat.embarquesAbertos();
  cat.invalidarEmbarques();
  await cat.embarquesAbertos();
  assert.equal(api.gets.length, 2);
});

test('programas por câmera com filtro', async () => {
  const api = fakeApi();
  api._resp['/programas?camera=1&q=B'] = [{ numero: 1, nome: 'PECA-B' }];
  const cat = criarCatalogos({ api });
  const r = await cat.programas(1, 'B');
  assert.equal(r[0].nome, 'PECA-B');
});
