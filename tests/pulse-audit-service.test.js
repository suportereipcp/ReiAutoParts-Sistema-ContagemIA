import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { criarPulseAuditService } from '../src/audit/pulse-audit-service.js';

async function tmpDir() { return fs.mkdtemp(path.join(os.tmpdir(), 'audit-svc-')); }

function uploaderFake(comportamento = () => ({ status: 'success' })) {
  const chamadas = [];
  return { chamadas, upload: async (c) => { chamadas.push(c); return comportamento(c); } };
}

const cfgBase = { flushPulses: 50, flushSeconds: 90, retrySeconds: 60, timeZone: 'UTC' };

async function novoServico() {
  const base = await tmpDir();
  const uploader = uploaderFake();
  const svc = criarPulseAuditService({
    config: { ...cfgBase, baseDir: base },
    chunkUploader: uploader,
    gerarUUID: (() => { let i = 0; return () => `u-${++i}`; })(),
    now: () => '2026-05-19T10:00:00.000Z',
    setTimeout: () => null, clearTimeout: () => {},
    setInterval: () => null, clearInterval: () => {},
    logger: { warn: () => {}, info: () => {}, error: () => {} },
  });
  return { base, uploader, svc };
}

test('abrir cria logger e registra', async () => {
  const { svc } = await novoServico();
  const lg = await svc.abrir({ sessao: 's1', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z' });
  assert.equal(lg.sessaoId, 's1');
  assert.equal(svc.obterLogger('s1'), lg);
});

test('fechar remove logger do registry', async () => {
  const { svc } = await novoServico();
  await svc.abrir({ sessao: 's1', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z' });
  await svc.fechar('s1', { encerradaEm: '2026-05-19T11:00:00.000Z' });
  assert.equal(svc.obterLogger('s1'), undefined);
});

test('appendPulso delega para logger pelo sessaoId', async () => {
  const { svc, uploader } = await novoServico();
  await svc.abrir({ sessao: 's1', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z' });
  for (let i = 1; i <= 50; i++) await svc.appendPulso('s1', { t: 't', n: i, d: i, b: 0 });
  assert.equal(uploader.chamadas.length, 1);
});

test('appendPulso para sessao desconhecida e no-op', async () => {
  const { svc } = await novoServico();
  await assert.doesNotReject(svc.appendPulso('fantasma', { t: 't', n: 1, d: 1, b: 0 }));
});

test('executarRetry ignora Aberto e Fechado, processa Envio-Pendente', async () => {
  const base = await tmpDir();
  const data = '2026-05-19';
  await fs.mkdir(path.join(base, data, 'cam-1'), { recursive: true });
  await fs.writeFile(path.join(base, data, 'cam-1', 'sessao-aberta.ndjson'),
    JSON.stringify({ type: 'session-header', sessao: 'aberta', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z', status: 'Aberto' }) + '\n');
  await fs.writeFile(path.join(base, data, 'cam-1', 'sessao-fechada.ndjson'),
    [
      JSON.stringify({ type: 'session-header', sessao: 'fechada', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z', status: 'Aberto' }),
      JSON.stringify({ type: 'session-status', status: 'Fechado', at: '2026-05-19T11:00:00.000Z' }),
    ].join('\n') + '\n');
  await fs.writeFile(path.join(base, data, 'cam-1', 'sessao-pendente.ndjson'),
    [
      JSON.stringify({ type: 'session-header', sessao: 'pendente', camera: 1, operador: 'O', embarque: 'E', op: 'OP', programa: 1, iniciada: '2026-05-19T10:00:00.000Z', status: 'Aberto' }),
      JSON.stringify({ type: 'chunk-start', seq: 1, gravado_em: '2026-05-19T10:01:00.000Z', desde: '2026-05-19T10:00:00.000Z' }),
      JSON.stringify({ t: '2026-05-19T10:00:00.000Z', n: 1, d: 1, b: 0 }),
      JSON.stringify({ type: 'chunk-end', seq: 1, pulsos: 1, contagem_acumulada: 1, ate: '2026-05-19T10:00:00.000Z' }),
      JSON.stringify({ type: 'upload-attempt', chunk: 1, at: '2026-05-19T10:01:00.000Z', status: 'fail', reason: 'rede' }),
      JSON.stringify({ type: 'session-status', status: 'Envio-Pendente', at: '2026-05-19T11:00:00.000Z', encerrada: '2026-05-19T10:55:00.000Z' }),
    ].join('\n') + '\n');

  const uploader = uploaderFake();
  const svc = criarPulseAuditService({
    config: { ...cfgBase, baseDir: base }, chunkUploader: uploader,
    gerarUUID: (() => { let i = 0; return () => `u-${++i}`; })(),
    now: () => '2026-05-19T12:00:00.000Z',
    setTimeout: () => null, clearTimeout: () => {},
    setInterval: () => null, clearInterval: () => {},
    logger: { warn: () => {}, info: () => {}, error: () => {} },
  });

  await svc.executarRetry();

  assert.equal(uploader.chamadas.length, 1);
  assert.equal(uploader.chamadas[0].sessao_id, 'pendente');
  const conteudo = await fs.readFile(path.join(base, data, 'cam-1', 'sessao-pendente.ndjson'), 'utf8');
  assert.match(conteudo, /"status":"Fechado"/);
});

test('recuperarSessoesAtivas reinstancia logger por sessao', async () => {
  const { svc } = await novoServico();
  await svc.recuperarSessoesAtivas([
    { id: 's1', camera_id: 1, codigo_operador: 'O', numero_embarque: 'E', codigo_op: 'OP', programa: 1, iniciada_em: '2026-05-19T10:00:00.000Z' },
  ]);
  assert.notEqual(svc.obterLogger('s1'), undefined);
});
