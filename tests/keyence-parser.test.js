import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePulso, parseRespostaComando } from '../src/camera/keyence-parser.js';

test('parsePulso decodifica payload padrão', () => {
  const r = parsePulso('02,0000150,0000500,000');
  assert.deepEqual(r, {
    tipo: 'pulso',
    ferramenta: 2,
    contagem: 150,
    total_dia: 500,
    brilho: 0,
  });
});

test('parsePulso lida com espaços à esquerda', () => {
  const r = parsePulso('01,     10,    100,128');
  assert.equal(r.ferramenta, 1);
  assert.equal(r.contagem, 10);
  assert.equal(r.total_dia, 100);
  assert.equal(r.brilho, 128);
});

test('parsePulso retorna null para payload inválido', () => {
  assert.equal(parsePulso('lixo qualquer'), null);
  assert.equal(parsePulso(''), null);
  assert.equal(parsePulso('01,abc,def,xyz'), null);
});

test('parsePulso aceita metricas extras de calibracao', () => {
  const r = parsePulso('02,0000009,0000500,128,0000640,0000012');
  assert.deepEqual(r, {
    tipo: 'pulso',
    ferramenta: 2,
    contagem: 9,
    total_dia: 500,
    brilho: 128,
    pixels_objeto: 640,
    frames_detectados: 12,
  });
});

test('parsePulso decodifica resultado RT padrao do modo IA Contagem de Passagem', () => {
  const r = parsePulso('RT,01995,--,01,0000001,0000123');
  assert.deepEqual(r, {
    tipo: 'pulso',
    ferramenta: 1,
    contagem: 1,
    total_dia: 123,
    brilho: 0,
    numero_resultado: 1995,
    status_geral: '--',
  });
});

test('parsePulso ignora RT padrao de ferramenta comum sem contagem numerica', () => {
  assert.equal(parsePulso('RT,01234,NG,01,OK,0000080'), null);
});

test('parseRespostaComando ER extrai código', () => {
  const r = parseRespostaComando('ER,PW,22');
  assert.deepEqual(r, { tipo: 'erro', comando: 'PW', codigo: 22 });
});

test('parseRespostaComando PR com programa', () => {
  const r = parseRespostaComando('PR,003');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PR', valores: ['003'] });
});

test('parseRespostaComando PNR com nome', () => {
  const r = parseRespostaComando('PNR,PECA-XYZ');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PNR', valores: ['PECA-XYZ'] });
});

test('parseRespostaComando ack sem parâmetros', () => {
  const r = parseRespostaComando('PW');
  assert.deepEqual(r, { tipo: 'resposta', comando: 'PW', valores: [] });
});
