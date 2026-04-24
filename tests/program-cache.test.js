import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProgramCache } from '../src/camera/program-cache.js';

async function tmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'program-cache-'));
}

test('ProgramCache salva e carrega programas por camera em pastas separadas', async () => {
  const baseDir = await tmpDir();
  const cache1 = new ProgramCache({ baseDir, cameraId: 1, now: () => new Date('2026-04-24T12:00:00.000Z') });
  const cache2 = new ProgramCache({ baseDir, cameraId: 2, now: () => new Date('2026-04-24T13:00:00.000Z') });

  await cache1.salvar([{ numero: 0, nome: 'PECA-A' }]);
  await cache2.salvar([{ numero: 7, nome: 'PECA-B' }]);

  assert.deepEqual(await cache1.carregar(), [{ numero: 0, nome: 'PECA-A' }]);
  assert.deepEqual(await cache2.carregar(), [{ numero: 7, nome: 'PECA-B' }]);

  const raw1 = JSON.parse(await fs.readFile(path.join(baseDir, 'camera-1', 'programas.json'), 'utf8'));
  const raw2 = JSON.parse(await fs.readFile(path.join(baseDir, 'camera-2', 'programas.json'), 'utf8'));
  assert.equal(raw1.cameraId, 1);
  assert.equal(raw1.atualizadoEm, '2026-04-24T12:00:00.000Z');
  assert.equal(raw2.cameraId, 2);
  assert.equal(raw2.atualizadoEm, '2026-04-24T13:00:00.000Z');
});

test('ProgramCache retorna lista vazia quando arquivo ainda nao existe', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: 1 });

  assert.deepEqual(await cache.carregar(), []);
  assert.deepEqual(cache.listar(), []);
});

test('ProgramCache converte cameraId string para numero antes de salvar', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: '1' });

  await cache.salvar([{ numero: 1, nome: 'PECA-A' }]);

  const raw = JSON.parse(await fs.readFile(path.join(baseDir, 'camera-1', 'programas.json'), 'utf8'));
  assert.equal(raw.cameraId, 1);
});

test('ProgramCache salva chamadas concorrentes sem misturar listas', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: 1 });
  const mkdirOriginal = fs.mkdir;
  let liberarPrimeiroMkdir;
  const primeiroMkdir = new Promise((resolve) => {
    liberarPrimeiroMkdir = resolve;
  });
  let primeiroMkdirIniciado;
  const primeiroMkdirIniciadoPromise = new Promise((resolve) => {
    primeiroMkdirIniciado = resolve;
  });
  let chamadas = 0;

  fs.mkdir = async (...args) => {
    chamadas += 1;
    if (chamadas === 1) {
      primeiroMkdirIniciado();
      await primeiroMkdir;
    }

    return mkdirOriginal(...args);
  };

  try {
    const primeiroSalvar = cache.salvar([{ numero: 1, nome: 'PRIMEIRA' }]);
    await primeiroMkdirIniciadoPromise;
    const segundoSalvar = cache.salvar([{ numero: 2, nome: 'SEGUNDA' }]);
    const segundoResultado = await segundoSalvar;
    liberarPrimeiroMkdir();
    const primeiroResultado = await primeiroSalvar;

    assert.deepEqual(segundoResultado, [{ numero: 2, nome: 'SEGUNDA' }]);
    assert.deepEqual(primeiroResultado, [{ numero: 1, nome: 'PRIMEIRA' }]);
  } finally {
    fs.mkdir = mkdirOriginal;
    liberarPrimeiroMkdir();
  }
});

test('ProgramCache normaliza e filtra programas carregados', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: 1 });

  await cache.salvar([
    { numero: '2', nome: ' PECA-X ' },
    { numero: 3, nome: '' },
    { numero: Number.NaN, nome: 'INVALIDA' },
  ]);

  assert.deepEqual(cache.listar('peca'), [{ numero: 2, nome: 'PECA-X' }]);
});
