import test from 'node:test';
import assert from 'node:assert/strict';
import { criarEtiquetasService } from '../../../public/js/domain/etiquetas-service.js';

test('reimprimir chama API de etiquetas', async () => {
  const chamadas = [];
  const svc = criarEtiquetasService({
    api: { post: async (url, body) => { chamadas.push({ url, body }); return { id: 'etq-1' }; } },
  });

  const res = await svc.reimprimirCaixa({ numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' });

  assert.equal(res.id, 'etq-1');
  assert.deepEqual(chamadas, [{
    url: '/etiquetas/caixas',
    body: { numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' },
  }]);
});

test('listarCaixa monta query corretamente', async () => {
  const chamadas = [];
  const svc = criarEtiquetasService({
    api: { get: async (url) => { chamadas.push(url); return []; } },
  });
  await svc.listarCaixa('E1', 'CX 1');
  assert.equal(chamadas[0], '/etiquetas/caixas?embarque=E1&caixa=CX%201');
});

test('retry posta em /etiquetas/:id/retry', async () => {
  let url = null;
  const svc = criarEtiquetasService({
    api: { post: async (u) => { url = u; return {}; } },
  });
  await svc.retry('etq-1');
  assert.equal(url, '/etiquetas/etq-1/retry');
});
