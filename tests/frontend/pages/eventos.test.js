import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderEventos } from '../../../public/js/pages/eventos.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderEventos exibe tabela com eventos do api', async () => {
  const ctx = { api: { get: async () => [
    { nivel: 'INFO', categoria: 'SESSAO', mensagem: 'Abriu', timestamp: '2026-04-20T10:00:00Z' },
    { nivel: 'ERROR', categoria: 'SYNC', mensagem: 'Falha', timestamp: '2026-04-20T10:01:00Z' },
  ]}};
  const el = await renderEventos(ctx);
  assert.equal(el.querySelectorAll('[data-linha-evento]').length, 2);
});

test('renderEventos adiciona log ao vivo quando camera.trafego chega por websocket', async () => {
  const ctx = { api: { get: async () => [] } };
  const el = await renderEventos(ctx);
  document.body.appendChild(el);

  document.dispatchEvent(new CustomEvent('ws:camera.trafego', {
    detail: {
      camera_id: 1,
      timestamp: '2026-05-05T12:00:00Z',
      linha: 'RT,01995,--,01,0000001,0000123',
      status: 'contagem_lida',
      parsed: { tipo: 'pulso', ferramenta: 1, contagem: 1, total_dia: 123 },
    },
  }));

  const linhas = el.querySelectorAll('[data-log-camera]');
  assert.equal(linhas.length, 1);
  assert.match(linhas[0].textContent, /Camera 1/);
  assert.match(linhas[0].textContent, /Contagem lida/);
  assert.match(linhas[0].textContent, /RT,01995,--,01,0000001,0000123/);
  assert.match(linhas[0].textContent, /"contagem":1/);
  assert.equal(el.querySelector('[data-log-camera-vazio]')?.hidden, true);
});

test('renderEventos mantém uma linha por impulso recebido da camera', async () => {
  const ctx = { api: { get: async () => [] } };
  const el = await renderEventos(ctx);
  document.body.appendChild(el);

  for (const contagem of [1, 2]) {
    document.dispatchEvent(new CustomEvent('ws:camera.trafego', {
      detail: {
        camera_id: 1,
        timestamp: '2026-05-05T12:00:00Z',
        linha: `RT,01995,--,01,${String(contagem).padStart(7, '0')},0000123`,
        status: 'contagem_lida',
        parsed: { tipo: 'pulso', ferramenta: 1, contagem, total_dia: 123 },
      },
    }));
  }

  const linhas = el.querySelectorAll('[data-log-camera]');
  assert.equal(linhas.length, 2);
  assert.match(el.textContent, /ASCII\/CSV recebido/);
  assert.match(el.textContent, /JSON interpretado/);
  assert.match(linhas[0].textContent, /0000002/);
  assert.match(linhas[1].textContent, /0000001/);
});

test('renderEventos usa area com scroll e agrupa por dia e camera', async () => {
  const ctx = { api: { get: async () => [] } };
  const el = await renderEventos(ctx);
  document.body.appendChild(el);

  document.dispatchEvent(new CustomEvent('ws:camera.trafego', {
    detail: {
      camera_id: 1,
      timestamp: '2026-05-05T12:00:00Z',
      linha: 'RT,04123,--,01,0000001,0000005',
      status: 'contagem_lida',
      parsed: { tipo: 'pulso', ferramenta: 1, contagem: 1, total_dia: 5 },
    },
  }));

  const scroll = el.querySelector('[data-log-camera-scroll]');
  assert.ok(scroll.className.includes('overflow-auto'));
  assert.match(el.querySelector('[data-log-camera-grupo]')?.textContent ?? '', /05\/05\/2026 - Camera 1/);
});

test('renderEventos filtra log ao vivo por camera', async () => {
  const ctx = { api: { get: async () => [] } };
  const el = await renderEventos(ctx);
  document.body.appendChild(el);

  for (const camera_id of [1, 2]) {
    document.dispatchEvent(new CustomEvent('ws:camera.trafego', {
      detail: {
        camera_id,
        timestamp: '2026-05-05T12:00:00Z',
        linha: `RT,0412${camera_id},--,01,0000001,000000${camera_id}`,
        status: 'contagem_lida',
        parsed: { tipo: 'pulso', ferramenta: 1, contagem: 1, total_dia: camera_id },
      },
    }));
  }

  const filtroCamera = el.querySelector('[data-filtro-log-camera]');
  filtroCamera.value = '2';
  filtroCamera.dispatchEvent(new Event('change'));

  const linhas = [...el.querySelectorAll('[data-log-camera]')];
  assert.equal(linhas.length, 1);
  assert.match(linhas[0].textContent, /Camera 2/);
  assert.doesNotMatch(linhas[0].textContent, /Camera 1/);
});
