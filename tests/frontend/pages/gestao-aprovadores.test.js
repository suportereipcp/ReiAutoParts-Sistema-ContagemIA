import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderGestaoAprovadores } from '../../../public/js/pages/gestao-aprovadores.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function criarCtx({ aprovadores = [], inserirOk = true, desativarOk = true } = {}) {
  const chamadas = { inserir: [], desativar: [] };
  return {
    chamadas,
    ctx: {
      faturamentoSvc: {
        listarAprovadores: async () => aprovadores,
        inserirAprovador: async (payload) => {
          chamadas.inserir.push(payload);
          if (!inserirOk) throw new Error('Erro ao inserir');
          return payload;
        },
        desativarAprovador: async (codigo) => {
          chamadas.desativar.push(codigo);
          if (!desativarOk) throw new Error('Erro ao desativar');
          // Remove from list for subsequent calls
          aprovadores = aprovadores.map(a => a.codigo === codigo ? { ...a, ativo: false } : a);
        },
      },
    },
  };
}

test('renderGestaoAprovadores exibe titulo e subtitulo', async () => {
  const { ctx } = criarCtx();
  const el = await renderGestaoAprovadores(ctx);
  assert.match(el.textContent, /Gestão de Aprovadores/);
  assert.match(el.textContent, /Cadastre e gerencie os aprovadores autorizados/);
});

test('renderGestaoAprovadores exibe formulario com inputs e botao', async () => {
  const { ctx } = criarCtx();
  const el = await renderGestaoAprovadores(ctx);
  const inputCodigo = el.querySelector('#novoCodigo');
  const inputNome = el.querySelector('#novoNome');
  const btnAdicionar = el.querySelector('[data-adicionar-aprovador]');

  assert.ok(inputCodigo, 'Input de código deve existir');
  assert.ok(inputNome, 'Input de nome deve existir');
  assert.ok(btnAdicionar, 'Botão de adicionar deve existir');
  assert.match(btnAdicionar.textContent, /Adicionar Aprovador/);
});

test('renderGestaoAprovadores exibe lista quando existem aprovadores', async () => {
  const { ctx } = criarCtx({
    aprovadores: [
      { codigo: 'APR1', nome: 'Carlos Silva', ativo: true },
      { codigo: 'APR2', nome: 'Maria Santos', ativo: false },
    ],
  });
  const el = await renderGestaoAprovadores(ctx);
  document.body.appendChild(el);

  const rows = el.querySelectorAll('[data-aprovador]');
  assert.equal(rows.length, 2);
  assert.match(rows[0].textContent, /APR1/);
  assert.match(rows[0].textContent, /Carlos Silva/);
  assert.match(rows[0].textContent, /Ativo/);
  assert.match(rows[1].textContent, /APR2/);
  assert.match(rows[1].textContent, /Inativo/);

  // Only active approver should have deactivate button
  assert.ok(el.querySelector('[data-desativar="APR1"]'));
  assert.equal(el.querySelector('[data-desativar="APR2"]'), null);
});

test('renderGestaoAprovadores exibe estado vazio quando nao ha aprovadores', async () => {
  const { ctx } = criarCtx({ aprovadores: [] });
  const el = await renderGestaoAprovadores(ctx);
  document.body.appendChild(el);

  const vazio = el.querySelector('[data-aprovadores-vazio]');
  assert.ok(vazio);
  assert.equal(vazio.hidden, false);
  assert.match(vazio.textContent, /Nenhum aprovador cadastrado/);
});

test('renderGestaoAprovadores adiciona aprovador com dados validos', async () => {
  const { ctx, chamadas } = criarCtx();
  const el = await renderGestaoAprovadores(ctx);
  document.body.appendChild(el);

  el.querySelector('#novoCodigo').value = 'APR1';
  el.querySelector('#novoNome').value = 'Carlos Silva';
  el.querySelector('[data-adicionar-aprovador]').click();
  await new Promise(r => setTimeout(r, 20));

  assert.deepEqual(chamadas.inserir, [{ codigo: 'APR1', nome: 'Carlos Silva' }]);
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Aprovador adicionado com sucesso/);

  // Inputs should be cleared
  assert.equal(el.querySelector('#novoCodigo').value, '');
  assert.equal(el.querySelector('#novoNome').value, '');
});

test('renderGestaoAprovadores exibe erro de validacao com campos vazios', async () => {
  const { ctx, chamadas } = criarCtx();
  const el = await renderGestaoAprovadores(ctx);
  document.body.appendChild(el);

  el.querySelector('[data-adicionar-aprovador]').click();
  await new Promise(r => setTimeout(r, 20));

  assert.equal(chamadas.inserir.length, 0);
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Preencha o código e o nome/);
});

test('renderGestaoAprovadores desativa aprovador ao clicar Desativar', async () => {
  const { ctx, chamadas } = criarCtx({
    aprovadores: [{ codigo: 'APR1', nome: 'Carlos Silva', ativo: true }],
  });
  const el = await renderGestaoAprovadores(ctx);
  document.body.appendChild(el);

  el.querySelector('[data-desativar="APR1"]').click();
  await new Promise(r => setTimeout(r, 20));

  assert.deepEqual(chamadas.desativar, ['APR1']);
  const toastEl = document.querySelector('[data-toast]');
  assert.ok(toastEl);
  assert.match(toastEl.textContent, /Aprovador desativado com sucesso/);
});
