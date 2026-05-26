import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarImagemCamera } from '../src/camera/live-image.js';

function fetchFake({ ok = true, status = 200, bytes = 'jpeg-bytes' } = {}) {
  const chamadas = [];
  const fetchFn = async (url, opts) => {
    chamadas.push({ url, opts });
    return {
      ok,
      status,
      arrayBuffer: async () => new TextEncoder().encode(bytes).buffer,
    };
  };
  return { fetchFn, chamadas };
}

test('buscarImagemCamera monta a URL com ip, portaImagem e iliveimage.jpg', async () => {
  const { fetchFn, chamadas } = fetchFake();
  await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn });
  assert.match(chamadas[0].url, /^http:\/\/1\.2\.3\.4:80\/iliveimage\.jpg\?\d+$/);
});

test('buscarImagemCamera usa porta customizada quando informada', async () => {
  const { fetchFn, chamadas } = fetchFake();
  await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 8080 }, { fetchFn });
  assert.match(chamadas[0].url, /:8080\/iliveimage\.jpg/);
});

test('buscarImagemCamera retorna um Buffer com os bytes da câmera', async () => {
  const { fetchFn } = fetchFake({ bytes: 'ABC' });
  const buf = await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn });
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString(), 'ABC');
});

test('buscarImagemCamera lança erro em status não-ok', async () => {
  const { fetchFn } = fetchFake({ ok: false, status: 503 });
  await assert.rejects(
    () => buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn }),
    /HTTP 503/
  );
});
