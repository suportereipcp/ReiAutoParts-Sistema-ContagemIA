import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { criarPulseAuditLogger } from '../src/audit/pulse-audit-logger.js';

async function tmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'audit-logger-'));
}

function uploaderFake() {
  const chamadas = [];
  let comportamento = () => ({ status: 'success' });
  return {
    chamadas,
    upload: async (chunk) => { chamadas.push(chunk); return comportamento(chunk); },
    configurar: (fn) => { comportamento = fn; },
  };
}

function gerarUUIDIncremental() { let i = 0; return () => `uuid-${++i}`; }

async function lerLinhas(arquivo) {
  try { return (await fs.readFile(arquivo, 'utf8')).split('\n').filter(Boolean); } catch { return []; }
}

const HEADER_BASE = {
  sessao: 's1', camera: 1, operador: 'OPR', embarque: 'E', op: 'OP', programa: 3,
  iniciada: '2026-05-19T10:00:00.000Z',
};

async function novoLogger({ flushPulses = 50, flushSeconds = 90 } = {}) {
  const base = await tmpDir();
  const up = uploaderFake();
  let agora = Date.parse('2026-05-19T10:00:00.000Z');
  const logger = await criarPulseAuditLogger({
    base, header: HEADER_BASE,
    flushPulses, flushSecondsMs: flushSeconds * 1000, timeZone: 'UTC',
    chunkUploader: up, gerarUUID: gerarUUIDIncremental(),
    now: () => new Date(agora).toISOString(),
    setTimeout: () => null, clearTimeout: () => {},
  });
  return { base, logger, uploaderChamadas: up.chamadas, uploader: up, avancar: (ms) => { agora += ms; } };
}

test('appendPulso escreve no .live', async () => {
  const { base, logger } = await novoLogger();
  await logger.appendPulso({ t: 't', n: 1, d: 1, b: 0 });
  const live = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.live');
  const linhas = await lerLinhas(live);
  assert.equal(linhas.length, 1);
  assert.match(linhas[0], /"n":1/);
});

test('appendPulso cria session-header no primeiro pulso', async () => {
  const { base, logger } = await novoLogger();
  await logger.appendPulso({ t: 't', n: 1, d: 1, b: 0 });
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const header = JSON.parse((await lerLinhas(ndjson))[0]);
  assert.equal(header.type, 'session-header');
  assert.equal(header.status, 'Aberto');
});

test('flush em 50 pulsos gera chunk-start + pulsos + chunk-end + upload-attempt', async () => {
  const { base, logger, uploaderChamadas } = await novoLogger({ flushPulses: 50 });
  for (let i = 1; i <= 50; i++) await logger.appendPulso({ t: 't', n: i, d: i, b: 0 });
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const linhas = await lerLinhas(ndjson);
  const tipos = linhas.map((l) => { try { return JSON.parse(l).type ?? 'pulso'; } catch { return 'pulso'; } });
  assert.equal(tipos[0], 'session-header');
  assert.equal(tipos[1], 'chunk-start');
  assert.equal(tipos.filter((t) => t === 'pulso').length, 50);
  assert.equal(tipos[52], 'chunk-end');
  assert.equal(tipos[53], 'upload-attempt');
  assert.equal(uploaderChamadas.length, 1);
  assert.equal(uploaderChamadas[0].pulsos_json.length, 50);
  const live = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.live');
  assert.equal((await lerLinhas(live)).length, 0);
});

test('flushPorTempo gera chunk mesmo com poucos pulsos', async () => {
  const { base, logger } = await novoLogger({ flushPulses: 50, flushSeconds: 90 });
  for (let i = 1; i <= 3; i++) await logger.appendPulso({ t: 't', n: i, d: i, b: 0 });
  await logger.flushPorTempo();
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const tipos = (await lerLinhas(ndjson)).map((l) => { try { return JSON.parse(l).type ?? 'pulso'; } catch { return 'pulso'; } });
  assert.ok(tipos.includes('chunk-start') && tipos.includes('chunk-end'));
});

test('flush em estado vazio e no-op', async () => {
  const { base, logger, uploaderChamadas } = await novoLogger();
  await logger.flushPorTempo();
  assert.equal(uploaderChamadas.length, 0);
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  assert.equal((await lerLinhas(ndjson)).length, 1);
});

test('upload com falha registra fail e mantem pendente', async () => {
  const base = await tmpDir();
  const up = uploaderFake();
  up.configurar(() => ({ status: 'fail', reason: 'rede' }));
  let agora = Date.parse('2026-05-19T10:00:00.000Z');
  const logger = await criarPulseAuditLogger({
    base, header: HEADER_BASE,
    flushPulses: 2, flushSecondsMs: 90000, timeZone: 'UTC',
    chunkUploader: up, gerarUUID: gerarUUIDIncremental(),
    now: () => new Date(agora).toISOString(),
    setTimeout: () => null, clearTimeout: () => {},
  });
  await logger.appendPulso({ t: 't', n: 1, d: 1, b: 0 });
  await logger.appendPulso({ t: 't', n: 2, d: 2, b: 0 });
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const tentativa = (await lerLinhas(ndjson)).map((l) => JSON.parse(l)).find((e) => e.type === 'upload-attempt');
  assert.equal(tentativa.status, 'fail');
  assert.equal(tentativa.reason, 'rede');
});

test('fechar grava session-status Fechado e remove .live', async () => {
  const { base, logger } = await novoLogger({ flushPulses: 50 });
  await logger.appendPulso({ t: 't', n: 1, d: 1, b: 0 });
  await logger.fechar({ encerradaEm: '2026-05-19T11:00:00.000Z' });
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const eventos = (await lerLinhas(ndjson)).map((l) => JSON.parse(l));
  const status = eventos.filter((e) => e.type === 'session-status').pop();
  assert.equal(status.status, 'Fechado');
  const live = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.live');
  await assert.rejects(fs.access(live));
});

test('fechar com upload falhando grava Envio-Pendente', async () => {
  const base = await tmpDir();
  const up = uploaderFake();
  up.configurar(() => ({ status: 'fail', reason: 'offline' }));
  let agora = Date.parse('2026-05-19T10:00:00.000Z');
  const logger = await criarPulseAuditLogger({
    base, header: HEADER_BASE,
    flushPulses: 1, flushSecondsMs: 90000, timeZone: 'UTC',
    chunkUploader: up, gerarUUID: gerarUUIDIncremental(),
    now: () => new Date(agora).toISOString(),
    setTimeout: () => null, clearTimeout: () => {},
  });
  await logger.appendPulso({ t: 't', n: 1, d: 1, b: 0 });
  await logger.fechar({ encerradaEm: '2026-05-19T11:00:00.000Z' });
  const ndjson = path.join(base, '2026-05-19', 'cam-1', 'sessao-s1.ndjson');
  const conteudo = await fs.readFile(ndjson, 'utf8');
  assert.match(conteudo, /"status":"Envio-Pendente"/);
});
