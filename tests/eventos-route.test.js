import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { registrarEvento } from '../src/db/queries/eventos.js';
import { rotasEventos } from '../src/http/routes/eventos.js';

test('GET /eventos retorna últimos 100 por padrão', async () => {
  const db = openDatabase(':memory:');
  for (let i = 0; i < 3; i++) registrarEvento(db, { nivel: 'INFO', categoria: 'SISTEMA', mensagem: `m${i}`, timestamp: new Date().toISOString() });
  const f = Fastify();
  rotasEventos(f, { db });
  const r = await f.inject({ method: 'GET', url: '/eventos' });
  assert.equal(r.statusCode, 200);
  const body = r.json();
  assert.equal(body.length, 3);
});

test('GET /eventos?nivel=ERROR filtra', async () => {
  const db = openDatabase(':memory:');
  registrarEvento(db, { nivel: 'INFO', categoria: 'SISTEMA', mensagem: 'i', timestamp: new Date().toISOString() });
  registrarEvento(db, { nivel: 'ERROR', categoria: 'SISTEMA', mensagem: 'e', timestamp: new Date().toISOString() });
  const f = Fastify();
  rotasEventos(f, { db });
  const r = await f.inject({ method: 'GET', url: '/eventos?nivel=ERROR' });
  const body = r.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].nivel, 'ERROR');
});
