import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replayNdjson } from '../src/audit/pulse-audit-replay.js';

function linhas(arr) { return arr.join('\n') + '\n'; }

test('replay vazio retorna estado inicial', () => {
  const r = replayNdjson('');
  assert.deepEqual(r, {
    header: null,
    contagem_acumulada: 0,
    proximo_chunk_seq: 1,
    chunks: {},
    status: null,
    encerrada_em: null,
  });
});

test('replay de session-header captura metadata e status Aberto', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"OPR","embarque":"E","op":"O","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
  ]);
  const r = replayNdjson(c);
  assert.equal(r.header.sessao, 's1');
  assert.equal(r.status, 'Aberto');
});

test('replay de 2 chunks calcula contagem_acumulada e proximo_seq', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"O","embarque":"E","op":"OP","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
    '{"type":"chunk-start","seq":1,"gravado_em":"x","desde":"x"}',
    '{"t":"x","n":1,"d":1,"b":0}',
    '{"t":"x","n":2,"d":2,"b":0}',
    '{"type":"chunk-end","seq":1,"pulsos":2,"contagem_acumulada":2,"ate":"x"}',
    '{"type":"chunk-start","seq":2,"gravado_em":"x","desde":"x"}',
    '{"t":"x","n":3,"d":3,"b":0}',
    '{"type":"chunk-end","seq":2,"pulsos":1,"contagem_acumulada":3,"ate":"x"}',
  ]);
  const r = replayNdjson(c);
  assert.equal(r.contagem_acumulada, 3);
  assert.equal(r.proximo_chunk_seq, 3);
  assert.equal(r.chunks[1].pulsos, 2);
});

test('chunk sem upload-attempt fica pendente', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"O","embarque":"E","op":"OP","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
    '{"type":"chunk-start","seq":1,"gravado_em":"x","desde":"x"}',
    '{"type":"chunk-end","seq":1,"pulsos":0,"contagem_acumulada":0,"ate":"x"}',
  ]);
  const r = replayNdjson(c);
  assert.equal(r.chunks[1].sync, 'pendente');
});

test('ultimo upload-attempt vence', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"O","embarque":"E","op":"OP","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
    '{"type":"chunk-start","seq":1,"gravado_em":"x","desde":"x"}',
    '{"type":"chunk-end","seq":1,"pulsos":0,"contagem_acumulada":0,"ate":"x"}',
    '{"type":"upload-attempt","chunk":1,"at":"x","status":"fail","reason":"rede"}',
    '{"type":"upload-attempt","chunk":1,"at":"x","status":"success","destacado":true}',
  ]);
  assert.equal(replayNdjson(c).chunks[1].sync, 'enviado');
});

test('multiplas session-status: ultima vence', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"O","embarque":"E","op":"OP","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
    '{"type":"session-status","status":"Envio-Pendente","at":"a","encerrada":"e"}',
    '{"type":"session-status","status":"Fechado","at":"b"}',
  ]);
  const r = replayNdjson(c);
  assert.equal(r.status, 'Fechado');
  assert.equal(r.encerrada_em, 'e');
});

test('linha corrompida e skipada sem quebrar replay', () => {
  const c = linhas([
    '{"type":"session-header","sessao":"s1","camera":1,"operador":"O","embarque":"E","op":"OP","programa":3,"iniciada":"2026-05-19T10:00:00.000Z","status":"Aberto"}',
    'lixo {',
    '{"type":"chunk-start","seq":1,"gravado_em":"x","desde":"x"}',
    '{"type":"chunk-end","seq":1,"pulsos":0,"contagem_acumulada":0,"ate":"x"}',
  ]);
  assert.equal(replayNdjson(c).proximo_chunk_seq, 2);
});
