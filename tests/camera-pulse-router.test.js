import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRoteadorPulsoCamera } from '../src/domain/camera-pulse-router.js';

test('roteador envia pulso para calibracao ativa sem chamar contagem', () => {
  const chamadas = [];
  const rotear = criarRoteadorPulsoCamera({
    calibracaoService: {
      temSessaoAtiva: (cameraId) => cameraId === 1,
      processarPulso: (payload) => chamadas.push(['calibracao', payload]),
    },
    contagemService: {
      processarPulso: (payload) => chamadas.push(['contagem', payload]),
    },
  });

  rotear({ cameraId: 1, contagem: 9, total_dia: 10, brilho: 128, pixels_objeto: 640 });

  assert.deepEqual(chamadas, [['calibracao', {
    cameraId: 1,
    contagem: 9,
    total_dia: 10,
    brilho: 128,
    pixels_objeto: 640,
  }]]);
});

test('roteador preserva fluxo de contagem quando nao ha calibracao ativa', () => {
  const chamadas = [];
  const rotear = criarRoteadorPulsoCamera({
    calibracaoService: {
      temSessaoAtiva: () => false,
      processarPulso: (payload) => chamadas.push(['calibracao', payload]),
    },
    contagemService: {
      processarPulso: (payload) => chamadas.push(['contagem', payload]),
    },
  });

  rotear({ cameraId: 2, contagem: 7, total_dia: 20, brilho: 64, pixels_objeto: 800 });

  assert.deepEqual(chamadas, [['contagem', {
    cameraId: 2,
    contagem: 7,
    total_dia: 20,
    brilho: 64,
  }]]);
});
