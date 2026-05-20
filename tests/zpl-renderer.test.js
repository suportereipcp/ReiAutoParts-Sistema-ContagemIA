import test from 'node:test';
import assert from 'node:assert/strict';
import { renderizarEtiquetaCaixaZpl } from '../src/labels/zpl-renderer.js';

const documento = {
  numero_embarque: 'E1',
  numero_caixa: 'CX1',
  numero_caixa_exibicao: 'CX1',
  numero_nota_fiscal: '12345',
  gerada_em: '2026-04-25T13:00:00.000Z',
  motivo: 'reimpressao',
  operador_emissao: 'A',
  linhas: [
    { ordem: 1, codigo_op: 'OP1', item_codigo: 'IT1', item_descricao: 'Peça A', quantidade_total: 15, operadores: ['A', 'B'] },
    { ordem: 2, codigo_op: 'OP2', item_codigo: 'IT2', item_descricao: 'Peça B', quantidade_total: 7, operadores: ['A'] },
  ],
};

test('gera uma etiqueta por produto', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { larguraDots: 1181, alturaDots: 709 });
  assert.equal(partes.length, 2);
  assert.equal(partes[0].partes_total, 2);
  assert.equal(partes[0].parte_numero, 1);
  assert.match(partes[0].payload_zpl, /^\^XA/);
  assert.match(partes[0].payload_zpl, /\^XZ$/);
  assert.match(partes[0].payload_zpl, /\^PW1181/);
  assert.match(partes[0].payload_zpl, /\^LL709/);
});

test('preenche campos do produto', () => {
  const [p1] = renderizarEtiquetaCaixaZpl(documento, { larguraDots: 1181, alturaDots: 709 });
  assert.match(p1.payload_zpl, /\^FDIT1\^FS/);
  assert.match(p1.payload_zpl, /\^FD15\^FS/);
  assert.match(p1.payload_zpl, /\^FDE1\^FS/);
  assert.match(p1.payload_zpl, /\^FDOP1\^FS/);
  assert.match(p1.payload_zpl, /\^FD12345\^FS/);
  assert.match(p1.payload_zpl, /\^FDCX1\^FS/);
  assert.match(p1.payload_zpl, /\^FD25\/04\/2026\^FS/);
  assert.match(p1.payload_zpl, /\^FDMA,CX1\^FS/);
});

test('concatena operadores distintos', () => {
  const [p1] = renderizarEtiquetaCaixaZpl(documento, { larguraDots: 1181, alturaDots: 709 });
  assert.match(p1.payload_zpl, /\^FDA, B\^FS/);
});

test('NF vazia quando ausente', () => {
  const doc = { ...documento, numero_nota_fiscal: null };
  const [p1] = renderizarEtiquetaCaixaZpl(doc, { larguraDots: 1181, alturaDots: 709 });
  assert.match(p1.payload_zpl, /\^FT755,311\^A0N,60,61\^FH\\\^CI28\^FD\^FS/);
});

test('sanitiza caracteres de controle ZPL', () => {
  const doc = {
    ...documento,
    linhas: [{ ordem: 1, codigo_op: 'O^P~1\\', item_codigo: 'IT^1', item_descricao: 'x', quantidade_total: 1, operadores: ['A'] }],
  };
  const [p1] = renderizarEtiquetaCaixaZpl(doc, { larguraDots: 1181, alturaDots: 709 });
  const semComandos = p1.payload_zpl.replace(/\^FT|\^FD|\^FS|\^FH\\|\^FH|\^FO|\^GB|\^A0N|\^XA|\^XZ|\^PW|\^LL|\^LS|\^MMT|\^CI|\^BQN|\^PQ/g, '');
  assert.doesNotMatch(semComandos, /[\^~\\]/);
});
