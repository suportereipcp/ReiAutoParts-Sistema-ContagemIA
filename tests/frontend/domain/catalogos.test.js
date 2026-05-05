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

test('embarquesAbertos refaz consulta para refletir fechamento remoto', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=aberto'] = [{ numero_embarque: '01' }];
  const cat = criarCatalogos({ api });
  const primeira = await cat.embarquesAbertos();
  api._resp['/embarques?status=aberto'] = [];
  const segunda = await cat.embarquesAbertos();
  assert.equal(primeira.length, 1);
  assert.equal(segunda.length, 0);
  assert.equal(api.gets.length, 2);
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

test('operadores usa cache na 2a chamada', async () => {
  const api = fakeApi();
  api._resp['/operadores'] = [{ codigo: '001', nome: 'Fulano' }];
  const cat = criarCatalogos({ api });
  await cat.operadores();
  await cat.operadores();
  assert.equal(api.gets.length, 1);
});

test('programas por câmera com filtro', async () => {
  const api = fakeApi();
  api._resp['/programas?camera=1&q=B'] = [{ numero: 1, nome: 'PECA-B' }];
  const cat = criarCatalogos({ api });
  const r = await cat.programas(1, 'B');
  assert.equal(r[0].nome, 'PECA-B');
});

test('embarques sem filtro consulta endpoint completo', async () => {
  const api = fakeApi();
  api._resp['/embarques'] = [{ numero_embarque: '01' }, { numero_embarque: '02' }];
  const cat = criarCatalogos({ api });
  const r = await cat.embarques();
  assert.equal(r.length, 2);
  assert.equal(api.gets[0], '/embarques');
});

test('embarques com filtro fechado mantém query explícita', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=fechado'] = [{ numero_embarque: '99' }];
  const cat = criarCatalogos({ api });
  const r = await cat.embarques('fechado');
  assert.equal(r.length, 1);
  assert.equal(api.gets[0], '/embarques?status=fechado');
});
