import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDetalhesCarga } from '../../../public/js/pages/detalhes-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderDetalhesCarga busca embarque + caixas', async () => {
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '01', motorista: 'E', status: 'aberto', data_criacao: '2026-04-18T00:00:00Z' };
        if (path.startsWith('/sessoes')) return [
          { id: 'a', numero_embarque: '01', camera_id: 1, quantidade_total: 5, numero_caixa: 'CX-1', codigo_op: 'OP1', status: 'encerrada', encerrada_em: '2026-04-18T10:00:00Z' },
          { id: 'c', numero_embarque: '01', camera_id: 2, quantidade_total: 7, numero_caixa: 'CX-1', codigo_op: 'OP1', status: 'encerrada', encerrada_em: '2026-04-18T10:10:00Z' },
          { id: 'd', numero_embarque: '01', camera_id: 2, quantidade_total: 4, numero_caixa: '__SEM_NUMERO__002', codigo_op: 'OP1', status: 'encerrada', encerrada_em: '2026-04-18T10:20:00Z' },
          { id: 'b', numero_embarque: '01', camera_id: 2, quantidade_total: 3, codigo_op: 'OP1', status: 'ativa', programa_nome: 'PECA-X', iniciada_em: '2026-04-18T11:00:00Z' },
        ];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
    sessoesSvc: { encerrar: async () => ({}), reiniciarContagem: async () => ({}), reiniciarSessao: async () => ({}) },
    catalogos: {},
  };
  const el = await renderDetalhesCarga(ctx, '01');
  assert.match(el.textContent, /01/);
  assert.match(el.textContent, /CX-1/);
  assert.match(el.textContent, /12/);
  assert.match(el.textContent, /Sem número #2/);
  assert.match(el.textContent, /PECA-X/);
  assert.match(el.textContent, /Nova Sessão/);
  assert.match(el.textContent, /Encerrar Sessão/);
  assert.ok(el.querySelector('[data-resumo-carga]'));
});

test('detalhes da carga abre a tela dedicada para nova sessao no mesmo embarque', async () => {
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '01', motorista: 'E', status: 'aberto' };
        if (path.startsWith('/sessoes')) return [];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
    sessoesSvc: { encerrar: async () => ({}), reiniciarContagem: async () => ({}), reiniciarSessao: async () => ({}) },
    catalogos: {},
  };
  const el = await renderDetalhesCarga(ctx, '01');
  document.body.appendChild(el);
  const botao = [...el.querySelectorAll('button')].find((node) => /Nova Sessão/.test(node.textContent));
  botao.click();
  assert.equal(window.location.hash, '#/cargas/01/nova-sessao');
});

test('detalhes da carga renderiza um painel por sessao ativa e isola encerrar por camera', async () => {
  const chamadasEncerrar = [];
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '02', motorista: 'E', status: 'aberto' };
        if (path.startsWith('/sessoes')) return [
          { id: 'S1', numero_embarque: '02', camera_id: 1, quantidade_total: 237, codigo_op: '010101', codigo_operador: '1807', status: 'ativa', programa_nome: 'PECA-C', iniciada_em: '2026-04-23T13:00:00Z' },
          { id: 'S2', numero_embarque: '02', camera_id: 2, quantidade_total: 164, codigo_op: '010101', codigo_operador: '1908', status: 'ativa', programa_nome: 'PECA-A', iniciada_em: '2026-04-23T13:05:00Z' },
        ];
        return [];
      },
    },
    sessoes: {
      porCamera: () => null,
      subscribe: () => () => {},
    },
    sessoesSvc: {
      encerrar: async (id) => { chamadasEncerrar.push(id); return {}; },
      reiniciarContagem: async () => ({}),
      reiniciarSessao: async () => ({}),
    },
    catalogos: {},
  };

  const el = await renderDetalhesCarga(ctx, '02');
  document.body.appendChild(el);

  const paineis = el.querySelectorAll('[data-painel-sessao]');
  assert.equal(paineis.length, 2);
  assert.ok(el.querySelector('[data-sessoes-ativas]'));
  assert.match(paineis[0].textContent, /Câmera 1/);
  assert.match(paineis[1].textContent, /Câmera 2/);
  assert.match(paineis[0].textContent, /1807/);
  assert.match(paineis[1].textContent, /1908/);
  assert.ok(paineis[0].querySelector('[data-sessao-meta="operador"]'));
  assert.ok(paineis[0].querySelector('[data-sessao-actions]'));
  assert.ok(paineis[0].querySelector('[data-counter-shell]'));

  paineis[1].querySelector('[data-acao-painel="encerrar-sessao"]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  const radioNova = [...document.querySelectorAll('[data-input="modo-caixa"]')].find((node) => node.value === 'nova');
  radioNova.click();
  document.querySelector('[data-input="numero_caixa"]').value = 'CX-B';
  document.querySelector('[data-submit-encerrar]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(chamadasEncerrar, ['S2']);
});

test('detalhes da carga sem faturamento exibe o botao Finalizar Carga', async () => {
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '03', motorista: 'E', status: 'aberto' };
        if (path.startsWith('/sessoes')) return [];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
    sessoesSvc: { encerrar: async () => ({}), reiniciarContagem: async () => ({}), reiniciarSessao: async () => ({}) },
    catalogos: {},
  };
  const el = await renderDetalhesCarga(ctx, '03');
  document.body.appendChild(el);
  const botoes = [...el.querySelectorAll('button')];
  const btnFinalizar = botoes.find((node) => /Finalizar Carga/.test(node.textContent));
  assert.ok(btnFinalizar, 'Deve exibir o botão Finalizar Carga quando não faturado');
});

test('detalhes da carga com faturamento oculta o botao Finalizar Carga e exige confirmacao no encerramento tardio', async () => {
  const chamadasEncerrar = [];
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '04', motorista: 'E', status: 'aberto', numero_nota_fiscal: 'NF-123' };
        if (path.startsWith('/sessoes')) return [
          { id: 'S3', numero_embarque: '04', camera_id: 1, quantidade_total: 10, status: 'ativa', programa_nome: 'PECA-C', iniciada_em: '2026-04-23T13:00:00Z' },
        ];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
    sessoesSvc: { encerrar: async (id, payload) => { chamadasEncerrar.push({ id, payload }); return {}; } },
    catalogos: {},
  };
  const el = await renderDetalhesCarga(ctx, '04');
  document.body.appendChild(el);

  const botoes = [...el.querySelectorAll('button')];
  const btnFinalizar = botoes.find((node) => /Finalizar Carga/.test(node.textContent));
  assert.equal(btnFinalizar, undefined, 'Não deve exibir o botão Finalizar Carga quando faturado');

  // Abre modal de encerrar
  const btnEncerrarSessao = el.querySelector('[data-acao-painel="encerrar-sessao"]');
  assert.ok(btnEncerrarSessao);
  btnEncerrarSessao.click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  // Seleciona o modo sem número para evitar validação de número de caixa
  document.querySelector('[data-input="modo-caixa"][value="sem-numero"]').click();

  // Verifica que o alerta de recusa faturado está no DOM
  const checkbox = document.querySelector('[data-input="confirmar-recusa"]');
  assert.ok(checkbox, 'Deve renderizar o checkbox de confirmação no modal para embarque faturado');

  // Tenta confirmar sem marcar
  document.querySelector('[data-submit-encerrar]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(chamadasEncerrar.length, 0, 'Não deve encerrar se o checkbox não estiver marcado');

  // Marca e confirma
  checkbox.checked = true;
  document.querySelector('[data-submit-encerrar]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(chamadasEncerrar.length, 1);
  assert.equal(chamadasEncerrar[0].id, 'S3');
});
