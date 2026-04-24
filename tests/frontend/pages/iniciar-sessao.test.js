import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderIniciarSessao } from '../../../public/js/pages/iniciar-sessao.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function criarCtx() {
  const chamadas = {
    abrir: [],
    confirmar: [],
    reiniciarSessao: [],
    op: [],
    get: [],
  };
  return {
    chamadas,
    ctx: {
      catalogos: {
        op: async (codigo) => {
          chamadas.op.push(codigo);
          if (codigo === 'OP-1') {
            return {
              codigo_op: 'OP-1',
              item_codigo: 'IT-001',
              item_descricao: 'Eixo de Transmissao',
              quantidade_prevista: 120,
            };
          }
          throw new Error('nao encontrada');
        },
        programas: async () => [{ numero: 7, nome: 'PECA-A' }],
      },
      api: {
        get: async (path) => {
          chamadas.get.push(path);
          if (path === '/sessoes') return [];
          return [];
        },
      },
      sessoesSvc: {
        abrir: async (payload) => {
          chamadas.abrir.push(payload);
          return { id: 'S1', camera_id: payload.camera_id, numero_embarque: payload.numero_embarque };
        },
        confirmar: async (id, payload) => {
          chamadas.confirmar.push({ id, payload });
          return { id, ...payload };
        },
        reiniciarSessao: async (id) => {
          chamadas.reiniciarSessao.push(id);
          return { id, status: 'cancelada' };
        },
      },
    },
  };
}

test('renderIniciarSessao preenche embarque fixo e carrega contexto do item', async () => {
  const { ctx } = criarCtx();
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  const embarque = el.querySelector('[data-input="numero_embarque"]');
  assert.equal(embarque.value, '01');
  assert.equal(embarque.readOnly, true);

  const op = el.querySelector('[data-input="codigo_op"]');
  op.value = 'OP-1';
  op.dispatchEvent(new Event('change'));
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.match(el.textContent, /Eixo de Transmissao/);
  assert.match(el.textContent, /IT-001/);
});

test('renderIniciarSessao permite cancelar sessao aberta antes de confirmar programa', async () => {
  const { ctx, chamadas } = criarCtx();
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.ok(el.querySelector('[data-stage="programa"]'));

  el.querySelector('[data-cancelar-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(chamadas.reiniciarSessao, ['S1']);
  assert.equal(window.location.hash, '#/cargas/01');
});

test('renderIniciarSessao confirma programa e retorna ao detalhe da carga', async () => {
  const { ctx, chamadas } = criarCtx();
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  el.querySelector('[data-programa-numero="7"]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(chamadas.confirmar, [{
    id: 'S1',
    payload: { programaNumero: 7, programaNome: 'PECA-A' },
  }]);
  assert.equal(window.location.hash, '#/cargas/01');
});

test('renderIniciarSessao mostra estado vazio quando a camera nao retorna programas', async () => {
  const { ctx } = criarCtx();
  ctx.catalogos.programas = async () => [];
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const vazio = el.querySelector('[data-programas-vazio]');
  assert.ok(vazio);
  assert.match(vazio.textContent, /Nenhum programa disponivel/);
});

test('renderIniciarSessao mostra erro da camera ao falhar a busca de programas', async () => {
  const { ctx } = criarCtx();
  ctx.catalogos.programas = async () => { throw new Error('camera desconectada'); };
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const erro = el.querySelector('[data-programas-erro]');
  assert.ok(erro);
  assert.match(erro.textContent, /camera desconectada/);
});

test('renderIniciarSessao mostra modal de camera ocupada com camera disponivel', async () => {
  const { ctx, chamadas } = criarCtx();
  ctx.sessoesSvc.abrir = async () => {
    throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
  };
  ctx.api.get = async (path) => {
    chamadas.get.push(path);
    if (path === '/sessoes') return [{ id: 'S1', camera_id: 1, status: 'ativa' }];
    return [];
  };
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const modal = document.body.querySelector('[data-camera-ocupada-modal]');
  assert.ok(modal);
  assert.equal(el.querySelector('[data-stage="programa"]'), null);
  assert.match(modal.textContent, /Camera 1/);
  assert.match(modal.textContent, /Camera 2 esta disponivel/);
  const card = modal.querySelector('[data-camera-ocupada-card]');
  const progressTrack = modal.querySelector('[data-camera-ocupada-progress-track]');
  const progress = modal.querySelector('[data-camera-ocupada-progress]');
  assert.ok(card);
  assert.match(card.className, /border/);
  assert.match(card.className, /shadow/);
  assert.ok(progressTrack);
  assert.doesNotMatch(progressTrack.className, /bg-error-container/);
  assert.ok(progress);
  assert.match(progress.getAttribute('style'), /transform-origin:\s*left/);
  assert.match(document.getElementById('camera-ocupada-progress-style').textContent, /scaleX\(0\)/);
  assert.deepEqual(chamadas.get, ['/sessoes']);
});

test('renderIniciarSessao informa quando todas as cameras estao ocupadas', async () => {
  const { ctx } = criarCtx();
  ctx.sessoesSvc.abrir = async () => {
    throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
  };
  ctx.api.get = async () => [
    { id: 'S1', camera_id: 1, status: 'ativa' },
    { id: 'S2', camera_id: 2, status: 'ativa' },
  ];
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const modal = document.body.querySelector('[data-camera-ocupada-modal]');
  assert.ok(modal);
  assert.match(modal.textContent, /Todas as cameras estao com sessao de contagem em andamento/);
});

test('renderIniciarSessao fecha modal de camera ocupada automaticamente', async () => {
  const { ctx } = criarCtx();
  ctx.sessoesSvc.abrir = async () => {
    throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
  };
  ctx.api.get = async () => [{ id: 'S1', camera_id: 1, status: 'ativa' }];
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(document.body.querySelector('[data-camera-ocupada-modal]'));

  await new Promise((resolve) => setTimeout(resolve, 2050));

  assert.equal(document.body.querySelector('[data-camera-ocupada-modal]'), null);
});
