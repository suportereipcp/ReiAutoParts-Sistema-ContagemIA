import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { CardCarga } from '../../../public/js/ui/composites/card-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('CardCarga mostra número, motorista e placa', () => {
  const el = CardCarga({ numero_embarque: '01', motorista: 'Emilio', placa: 'UEI-8H29', data_criacao: '2026-04-18T12:00:00Z' });
  assert.match(el.textContent, /01/);
  assert.match(el.textContent, /Emilio/);
  assert.match(el.textContent, /UEI-8H29/);
});

test('href vai para /cargas/:numero', () => {
  const el = CardCarga({ numero_embarque: '01' });
  assert.equal(el.getAttribute('href'), '#/cargas/01');
});
