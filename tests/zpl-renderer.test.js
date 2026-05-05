import test from 'node:test';
import assert from 'node:assert/strict';
import { renderizarEtiquetaCaixaZpl } from '../src/labels/zpl-renderer.js';

const documento = {
  numero_embarque: 'E1',
  numero_caixa: 'CX1',
  numero_caixa_exibicao: 'CX1',
  gerada_em: '2026-04-25T10:00:00.000Z',
  motivo: 'encerramento',
  operador_emissao: 'OPR1',
  linhas: [
    {
      ordem: 1,
      sessao_id: 's1',
      codigo_op: 'OP1',
      item_codigo: 'IT1',
      item_descricao: 'Peça dianteira acentuada',
      quantidade_total: 12,
      codigo_operador: 'OPR1',
      iniciada_em: '2026-04-25T09:00:00.000Z',
      encerrada_em: '2026-04-25T10:00:00.000Z',
    },
    {
      ordem: 2,
      sessao_id: 's2',
      codigo_op: 'OP1',
      item_codigo: 'IT1',
      item_descricao: 'Peça dianteira acentuada',
      quantidade_total: 3,
      codigo_operador: 'OPR2',
      iniciada_em: '2026-04-25T11:00:00.000Z',
      encerrada_em: '2026-04-25T11:30:00.000Z',
    },
  ],
};

test('gera ZPL completo com cabecalho e linhas', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 10, larguraDots: 812, alturaDots: 609 });
  assert.equal(partes.length, 1);
  assert.match(partes[0].payload_zpl, /^\^XA/);
  assert.match(partes[0].payload_zpl, /\^XZ$/);
  assert.match(partes[0].payload_zpl, /Caixa: CX1/);
  assert.match(partes[0].payload_zpl, /Parte 1\/1/);
  assert.match(partes[0].payload_zpl, /1 OP1 IT1 QTD 12 OPR OPR1/);
});

test('pagina quando excede limite de linhas', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 1, larguraDots: 812, alturaDots: 609 });
  assert.equal(partes.length, 2);
  assert.match(partes[0].payload_zpl, /Parte 1\/2/);
  assert.match(partes[1].payload_zpl, /Parte 2\/2/);
});

test('remove caracteres fora de ASCII', () => {
  const partes = renderizarEtiquetaCaixaZpl(documento, { linhasPorParte: 10, larguraDots: 812, alturaDots: 609 });
  assert.doesNotMatch(partes[0].payload_zpl, /ç|ã|é|í|ó|ú/);
});
