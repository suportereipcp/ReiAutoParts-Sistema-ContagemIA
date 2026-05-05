import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque } from '../src/db/queries/espelhos.js';
import { rotasEmbarques } from '../src/http/routes/embarques.js';

test('GET /embarques?status=fechado retorna apenas embarques expedidos', async () => {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertEmbarque(db, { numero_embarque: 'E2', status: 'fechado' });

  const fastify = Fastify();
  rotasEmbarques(fastify, { db });

  const resposta = await fastify.inject({ method: 'GET', url: '/embarques?status=fechado' });
  assert.equal(resposta.statusCode, 200);
  const body = resposta.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].numero_embarque, 'E2');
});

test('GET /embarques sem status retorna abertas e fechadas', async () => {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertEmbarque(db, { numero_embarque: 'E2', status: 'fechado' });

  const fastify = Fastify();
  rotasEmbarques(fastify, { db });

  const resposta = await fastify.inject({ method: 'GET', url: '/embarques' });
  assert.equal(resposta.statusCode, 200);
  const body = resposta.json();
  assert.equal(body.length, 2);
  assert.deepEqual(body.map((item) => item.numero_embarque).sort(), ['E1', 'E2']);
});
