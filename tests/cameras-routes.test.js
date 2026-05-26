import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasCameras } from '../src/http/routes/cameras.js';

const CAMERAS = [
  { id: 1, ip: '1.2.3.4', portaImagem: 80 },
  { id: 2, ip: '1.2.3.5', portaImagem: 80 },
];

async function app({ buscarImagem }) {
  const fastify = Fastify({ logger: false });
  rotasCameras(fastify, { cameras: CAMERAS, buscarImagem });
  await fastify.ready();
  return fastify;
}

test('GET /cameras/:id/live-image devolve a imagem da câmera correta', async () => {
  const usadas = [];
  const fastify = await app({
    async buscarImagem(cam) { usadas.push(cam.id); return Buffer.from('IMG-2'); },
  });

  const r = await fastify.inject({ method: 'GET', url: '/cameras/2/live-image' });

  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /image\/jpeg/);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.rawPayload.toString(), 'IMG-2');
  assert.deepEqual(usadas, [2]);
});

test('GET /cameras/:id/live-image responde 404 para câmera desconhecida', async () => {
  const fastify = await app({ async buscarImagem() { return Buffer.from('x'); } });
  const r = await fastify.inject({ method: 'GET', url: '/cameras/99/live-image' });
  assert.equal(r.statusCode, 404);
  assert.match(r.json().erro, /camera 99 desconhecida/i);
});

test('GET /cameras/:id/live-image responde 503 quando a busca falha', async () => {
  const fastify = await app({
    async buscarImagem() { throw new Error('timeout'); },
  });
  const r = await fastify.inject({ method: 'GET', url: '/cameras/1/live-image' });
  assert.equal(r.statusCode, 503);
  assert.match(r.json().erro, /imagem indispon[ií]vel/i);
});
