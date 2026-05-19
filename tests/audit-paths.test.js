import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  pastaDataCamera,
  arquivoNdjson,
  arquivoLive,
  dataDeInicio,
} from '../src/audit/paths.js';

test('pastaDataCamera junta base + data + cam-N', () => {
  const r = pastaDataCamera('C:\\base', '2026-05-19', 1);
  assert.equal(r, path.join('C:\\base', '2026-05-19', 'cam-1'));
});

test('arquivoNdjson gera nome completo com uuid', () => {
  const r = arquivoNdjson('C:\\base', '2026-05-19', 2, 'abc-uuid');
  assert.equal(r, path.join('C:\\base', '2026-05-19', 'cam-2', 'sessao-abc-uuid.ndjson'));
});

test('arquivoLive usa mesma raiz com extensao .live', () => {
  const ndjson = arquivoNdjson('C:\\base', '2026-05-19', 1, 'abc');
  const live = arquivoLive('C:\\base', '2026-05-19', 1, 'abc');
  assert.equal(live, ndjson.replace(/\.ndjson$/, '.live'));
});

test('dataDeInicio extrai YYYY-MM-DD do timestamp ISO no fuso indicado', () => {
  assert.equal(dataDeInicio('2026-05-19T10:00:00.000Z', 'UTC'), '2026-05-19');
  assert.equal(dataDeInicio('2026-05-19T02:00:00.000Z', 'America/Sao_Paulo'), '2026-05-18');
});
