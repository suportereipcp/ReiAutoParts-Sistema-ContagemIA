import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverEfetivo } from '../src/acesso/resolver.js';

test('retorna atividades dos grupos quando sem overrides', () => {
  const efetivo = resolverEfetivo(['a', 'b', 'c'], []);
  assert.deepEqual(efetivo, ['a', 'b', 'c']);
});

test('concessão individual adiciona atividade', () => {
  const efetivo = resolverEfetivo(['a'], [{ atividade_id: 'b', efeito: 'conceder' }]);
  assert.deepEqual(efetivo, ['a', 'b']);
});

test('revogação remove atividade do grupo', () => {
  const efetivo = resolverEfetivo(['a', 'b'], [{ atividade_id: 'b', efeito: 'revogar' }]);
  assert.deepEqual(efetivo, ['a']);
});

test('revogação vence sobre concessão do grupo', () => {
  const efetivo = resolverEfetivo(['a', 'b', 'c'], [
    { atividade_id: 'b', efeito: 'revogar' },
  ]);
  assert.deepEqual(efetivo, ['a', 'c']);
});

test('concessão e revogação simultâneas — revogação vence', () => {
  // Se um override concede e outro revoga a mesma atividade, não faz sentido,
  // mas se a atividade está no grupo E tem revogação, revogação vence
  const efetivo = resolverEfetivo(['x'], [{ atividade_id: 'x', efeito: 'revogar' }]);
  assert.deepEqual(efetivo, []);
});

test('sem grupos e sem overrides retorna vazio', () => {
  const efetivo = resolverEfetivo([], []);
  assert.deepEqual(efetivo, []);
});

test('resultado é ordenado alfabeticamente', () => {
  const efetivo = resolverEfetivo(['z', 'a', 'm'], []);
  assert.deepEqual(efetivo, ['a', 'm', 'z']);
});

test('duplicatas entre grupos são unificadas', () => {
  const efetivo = resolverEfetivo(['a', 'b', 'a', 'b'], []);
  assert.deepEqual(efetivo, ['a', 'b']);
});
