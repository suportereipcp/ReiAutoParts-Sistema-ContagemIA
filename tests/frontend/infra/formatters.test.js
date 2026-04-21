import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarData, formatarNumero, formatarHora, rotuloSync } from '../../../public/js/infra/formatters.js';

test('formatarData ISO → DD/MM/AAAA', () => {
  assert.equal(formatarData('2026-04-20T10:44:58.524Z'), '20/04/2026');
});

test('formatarHora ISO → HH:mm', () => {
  assert.equal(formatarHora('2026-04-20T10:44:58.524Z').length, 5);
});

test('formatarNumero insere separador de milhar', () => {
  assert.equal(formatarNumero(1234567), '1.234.567');
});

test('rotuloSync traduz estado', () => {
  assert.equal(rotuloSync('ONLINE'), 'Online');
  assert.equal(rotuloSync('OFFLINE'), 'Offline');
  assert.equal(rotuloSync('RECOVERY'), 'Recuperando');
});
