import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirContinuarCargaMultipla } from '../../../public/js/ui/composites/modal-continuar-carga-multipla.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessoes = [
  { id: 'S1', numero_embarque: 'EB-094', camera_id: 1, programa_nome: 'Fundição U04', iniciada_em: '2026-04-21T10:00:00Z', quantidade_total: 40 },
  { id: 'S2', numero_embarque: 'EB-095', camera_id: 2, programa_nome: 'Acabamento Sul', iniciada_em: '2026-04-21T10:30:00Z', quantidade_total: 12 },
  { id: 'S3', numero_embarque: 'EB-098', camera_id: 1, programa_nome: 'Logística Interna' },
];

test('abre modal wide com dropdown de todos os embarques pendentes', () => {
  abrirContinuarCargaMultipla({ sessoes });
  const stage = document.querySelector('[data-stage="continuar-multipla"]');
  assert.ok(stage);
  assert.ok(document.querySelector('[data-coluna-formulario]'));
  assert.ok(document.querySelector('[data-coluna-visualizacao]'));
  const options = document.querySelectorAll('[data-input="embarque_selecionado"] option');
  assert.equal(options.length, sessoes.length + 1);
  assert.match(document.body.textContent, /EB-094/);
  assert.match(document.body.textContent, /EB-095/);
  assert.match(document.body.textContent, /EB-098/);
});

test('ao mudar select, painel de visualização atualiza contexto', () => {
  abrirContinuarCargaMultipla({ sessoes });
  const select = document.querySelector('[data-input="embarque_selecionado"]');
  select.value = 'S2';
  select.dispatchEvent(new Event('change'));
  const painel = document.querySelector('[data-visualizacao]');
  assert.ok(document.querySelector('[data-status-qualidade]'));
  assert.match(painel.textContent, /Acabamento Sul/);
  assert.match(painel.textContent, /EB-095/);
});

test('clicar Continuar sem seleção mostra erro', () => {
  let called = false;
  abrirContinuarCargaMultipla({ sessoes, onContinuar: () => { called = true; } });
  document.querySelector('[data-submit-continuar]').click();
  assert.equal(called, false);
});

test('clicar Continuar com seleção e operador chama callback', () => {
  let payload = null;
  abrirContinuarCargaMultipla({ sessoes, onContinuar: (p) => { payload = p; } });
  const select = document.querySelector('[data-input="embarque_selecionado"]');
  select.value = 'S1';
  select.dispatchEvent(new Event('change'));
  document.querySelector('[data-input="codigo_operador"]').value = '1807';
  document.querySelector('[data-submit-continuar]').click();
  assert.equal(payload?.sessao?.id, 'S1');
  assert.equal(payload?.codigoOperador, '1807');
});
