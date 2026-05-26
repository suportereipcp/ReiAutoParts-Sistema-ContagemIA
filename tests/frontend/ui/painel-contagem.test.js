import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { PainelContagem } from '../../../public/js/ui/composites/painel-contagem.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('exibe contador gigante', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 42, camera_id: 1, programa_nome: 'PECA-B' } });
  const num = el.querySelector('[data-contagem]');
  assert.equal(num.textContent.replace(/\s/g, ''), '42');
});

test('atualizar substitui valor', () => {
  const painel = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1 } });
  painel.querySelector('[data-contagem]').textContent = '10';
  assert.equal(painel.querySelector('[data-contagem]').textContent, '10');
});

test('renderiza ações quando handlers são fornecidos', () => {
  const painel = PainelContagem({
    sessao: { id: 'x', quantidade_total: 0, camera_id: 1, programa_nome: 'PECA-B' },
    onEncerrar() {},
    onReiniciarContagem() {},
    onReiniciarSessao() {},
  });
  assert.match(painel.textContent, /Encerrar Sessão/);
  assert.match(painel.textContent, /Reiniciar Contagem/);
  assert.match(painel.textContent, /Reiniciar Sessão/);
});

test('sem liveImage não renderiza área de imagem (uso no operador)', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1, programa_nome: 'PECA-A' } });
  assert.equal(el.querySelector('[data-camera-live]'), null);
});

test('com liveImage renderiza <img> apontando para o proxy da câmera', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 2, programa_nome: 'PECA-A' }, liveImage: true });
  const img = el.querySelector('[data-camera-live-img]');
  assert.ok(img, 'img deve existir');
  assert.match(img.getAttribute('src'), /^\/cameras\/2\/live-image\?\d+$/);
  assert.match(img.getAttribute('alt'), /câmera 2/i);
});

test('evento de erro na imagem revela o placeholder', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1, programa_nome: 'PECA-A' }, liveImage: true });
  const img = el.querySelector('[data-camera-live-img]');
  const placeholder = el.querySelector('[data-camera-live-placeholder]');
  assert.ok(placeholder.classList.contains('hidden'), 'placeholder começa oculto');
  img.dispatchEvent(new Event('error'));
  assert.ok(img.classList.contains('hidden'), 'img some no erro');
  assert.ok(!placeholder.classList.contains('hidden'), 'placeholder aparece no erro');
});
