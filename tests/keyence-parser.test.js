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
