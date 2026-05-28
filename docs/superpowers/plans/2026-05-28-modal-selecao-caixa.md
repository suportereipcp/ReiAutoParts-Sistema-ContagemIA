# Modal de Seleção de Caixa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o modal único de encerramento de sessão por um wizard de 3 telas (Modal #1 → #2 → #3), dando ao operador visibilidade do conteúdo de cada caixa antes de confirmar o destino.

**Architecture:** UI-only. Cada modal é um módulo separado em `public/js/ui/composites/`. O Modal #1 (refator do existente) orquestra os outros dois via callbacks. Sem mudanças no backend — todos os dados já vêm de `GET /sessoes?embarque=...`. Preserva a assinatura de `onConfirmar` para manter compatibilidade com o chamador.

**Tech Stack:** JS vanilla ESM, primitivas `Modal`/`Button`/`Input` existentes, `node:test` + `happy-dom` para testes.

**Spec:** [docs/superpowers/specs/2026-05-28-modal-selecao-caixa-design.md](../specs/2026-05-28-modal-selecao-caixa-design.md)

---

## Estrutura de arquivos

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `public/js/ui/composites/modal-packlist-caixa.js` | Criar | Modal #3: lista cronológica de sessões de UMA caixa + Concluir/Voltar |
| `public/js/ui/composites/modal-selecionar-caixa.js` | Criar | Modal #2: lista todas as caixas do embarque, desabilita incompatíveis, abre Modal #3 ao clicar |
| `public/js/ui/composites/modal-encerrar-sessao.js` | Modificar | Modal #1: refator de radio para 3 botões; orquestra Modal #2/#3; preserva estado do checkbox faturado |
| `public/js/pages/detalhes-carga.js` | Modificar | Trocar `caixasExistentes` por `sessoesDoEmbarque` na chamada do modal |
| `tests/frontend/ui/modal-packlist-caixa.test.js` | Criar | Testes do Modal #3 |
| `tests/frontend/ui/modal-selecionar-caixa.test.js` | Criar | Testes do Modal #2 |
| `tests/frontend/ui/modal-encerrar-sessao.test.js` | Modificar | Atualizar testes existentes para o novo fluxo |
| `tests/frontend/pages/detalhes-carga.test.js` | Modificar | Adicionar smoke test do wizard |

**Convenção de DOM:** Todas as composições devem usar `createElement` + `textContent` + `append`. Evitar `innerHTML` para conteúdo dinâmico (segue prática de defesa contra XSS já adotada nos hooks do projeto).

Ordem: Task 1 (Modal #3) → Task 2 (Modal #2) → Task 3 (Modal #1) → Task 4 (detalhes-carga) → Task 5 (smoke test).

---

## Task 1: Modal #3 — Packlist da caixa

**Files:**
- Create: `public/js/ui/composites/modal-packlist-caixa.js`
- Test: `tests/frontend/ui/modal-packlist-caixa.test.js`

- [ ] **Step 1: Escrever o teste falhando**

Crie `tests/frontend/ui/modal-packlist-caixa.test.js`:

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalPacklistCaixa } from '../../../public/js/ui/composites/modal-packlist-caixa.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessoes = [
  { id: 'S1', codigo_op: 'OP-1234', programa_nome: 'Filtro de oleo', quantidade_total: 150, codigo_operador: 'OP01', encerrada_em: '2026-05-28T14:23:00Z' },
  { id: 'S2', codigo_op: 'OP-1234', programa_nome: 'Filtro de oleo', quantidade_total: 80, codigo_operador: 'OP02', encerrada_em: '2026-05-28T15:10:00Z' },
];

test('renderiza cabecalho com numero da caixa e OP', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  assert.match(document.body.textContent, /CX-007/);
  assert.match(document.body.textContent, /OP-1234/);
});

test('lista cada sessao com qtd, operador e horario', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-sessao]');
  assert.equal(linhas.length, 2);
  assert.match(linhas[0].textContent, /150/);
  assert.match(linhas[0].textContent, /OP01/);
  assert.match(linhas[1].textContent, /80/);
  assert.match(linhas[1].textContent, /OP02/);
});

test('rotula Sem numero quando caixaId tem prefixo', () => {
  abrirModalPacklistCaixa({ caixaId: '__SEM_NUMERO__003', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  assert.match(document.body.textContent, /Sem n.mero #3/);
});

test('exibe total somado das sessoes', () => {
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => {}, onVoltar: () => {} });
  const total = document.querySelector('[data-packlist-total]');
  assert.ok(total);
  assert.match(total.textContent, /230/);
});

test('botao Concluir chama onConfirmar', () => {
  let chamou = false;
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => { chamou = true; }, onVoltar: () => {} });
  document.querySelector('[data-acao-concluir]').click();
  assert.equal(chamou, true);
});

test('botao Voltar chama onVoltar e nao chama onConfirmar', () => {
  let confirmou = false; let voltou = false;
  abrirModalPacklistCaixa({ caixaId: 'CX-007', sessoesDaCaixa: sessoes, onConfirmar: () => { confirmou = true; }, onVoltar: () => { voltou = true; } });
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(voltou, true);
  assert.equal(confirmou, false);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `npm test -- --test-name-pattern="packlist"`
Expected: FAIL — modulo nao existe.

- [ ] **Step 3: Implementar o Modal #3**

Crie `public/js/ui/composites/modal-packlist-caixa.js`:

```js
import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { formatarNumero, formatarHora } from '../../infra/formatters.js';
import { rotuloCaixa } from '../../domain/caixas.js';

function celula(textoOuNumero, classe) {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = textoOuNumero == null ? '-' : String(textoOuNumero);
  return span;
}

export function abrirModalPacklistCaixa({ caixaId, sessoesDaCaixa = [], onConfirmar, onVoltar } = {}) {
  const rotulo = rotuloCaixa(caixaId);
  const opCodigo = sessoesDaCaixa[0]?.codigo_op ?? '-';
  const itemNome = sessoesDaCaixa[0]?.programa_nome ?? '-';

  const modal = Modal({
    title: `Caixa ${rotulo}`,
    subtitle: `${opCodigo} - ${itemNome}`,
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const lista = document.createElement('div');
  lista.dataset.packlistLista = 'true';
  lista.className = 'space-y-2 max-h-80 overflow-y-auto';

  const ordenadas = [...sessoesDaCaixa].sort((a, b) => {
    const ta = a.encerrada_em ?? a.iniciada_em ?? '';
    const tb = b.encerrada_em ?? b.iniciada_em ?? '';
    return ta.localeCompare(tb);
  });

  let total = 0;
  for (const sessao of ordenadas) {
    total += Number(sessao.quantidade_total) || 0;
    const linha = document.createElement('div');
    linha.dataset.linhaSessao = 'true';
    linha.className = 'grid grid-cols-[1fr,auto,auto,auto] gap-3 px-3 py-2 rounded-lg bg-surface-container-low text-sm items-center';
    linha.append(
      celula(`${sessao.codigo_op ?? '-'} - ${sessao.programa_nome ?? '-'}`, 'text-on-surface'),
      celula(formatarNumero(sessao.quantidade_total), 'font-semibold text-on-surface'),
      celula(sessao.codigo_operador ?? '-', 'text-on-surface-variant text-xs'),
      celula(formatarHora(sessao.encerrada_em ?? sessao.iniciada_em), 'text-on-surface-variant text-xs'),
    );
    lista.appendChild(linha);
  }
  stage.appendChild(lista);

  const totalEl = document.createElement('div');
  totalEl.dataset.packlistTotal = 'true';
  totalEl.className = 'flex justify-end text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/40';
  totalEl.textContent = `Total: ${formatarNumero(total)}`;
  stage.appendChild(totalEl);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';
  const btnConcluir = Button({
    texto: 'Concluir',
    variante: 'primary',
    onClick: () => { modal.fechar(); onConfirmar?.(); },
  });
  btnConcluir.dataset.acaoConcluir = 'true';
  const btnVoltar = Button({
    texto: 'Voltar',
    variante: 'secondary',
    onClick: () => { modal.fechar(); onVoltar?.(); },
  });
  btnVoltar.dataset.acaoVoltar = 'true';
  actions.appendChild(btnConcluir);
  actions.appendChild(btnVoltar);
  stage.appendChild(actions);

  body.appendChild(stage);
  return modal;
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- --test-name-pattern="packlist"`
Expected: PASS — todos os 6 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/composites/modal-packlist-caixa.js tests/frontend/ui/modal-packlist-caixa.test.js
git commit -m "feat(ui): adiciona Modal #3 (packlist de caixa) para wizard de encerramento"
```

---

## Task 2: Modal #2 — Lista de caixas do embarque

**Files:**
- Create: `public/js/ui/composites/modal-selecionar-caixa.js`
- Test: `tests/frontend/ui/modal-selecionar-caixa.test.js`

- [ ] **Step 1: Escrever o teste falhando**

Crie `tests/frontend/ui/modal-selecionar-caixa.test.js`:

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalSelecionarCaixa } from '../../../public/js/ui/composites/modal-selecionar-caixa.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessoesEmbarque = [
  { id: 'S1', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 100, encerrada_em: '2026-05-28T10:00:00Z', status: 'encerrada' },
  { id: 'S2', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 50, encerrada_em: '2026-05-28T10:30:00Z', status: 'encerrada' },
  { id: 'S3', numero_caixa: 'CX-002', codigo_op: 'OP-B', programa_nome: 'Disco', quantidade_total: 200, encerrada_em: '2026-05-28T11:00:00Z', status: 'encerrada' },
  { id: 'S4', numero_caixa: '__SEM_NUMERO__001', codigo_op: 'OP-A', programa_nome: 'Filtro', quantidade_total: 30, encerrada_em: '2026-05-28T09:00:00Z', status: 'encerrada' },
];

test('lista todas as caixas do embarque com numero, OP, total e qtd sessoes', () => {
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-caixa-opcao]');
  assert.equal(linhas.length, 3);
  const textos = [...linhas].map((l) => l.textContent);
  assert.ok(textos.some((t) => /CX-001/.test(t) && /OP-A/.test(t) && /150/.test(t)));
  assert.ok(textos.some((t) => /CX-002/.test(t) && /OP-B/.test(t) && /200/.test(t)));
  assert.ok(textos.some((t) => /Sem n.mero #1/.test(t) && /30/.test(t)));
});

test('marca caixas com OP diferente como desabilitadas', () => {
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const incompativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /OP-B/.test(l.textContent));
  assert.equal(incompativel.dataset.incompativel, 'true');
  assert.match(incompativel.getAttribute('title') ?? '', /incompat/i);
});

test('clicar em caixa compativel chama onSelecionar com o caixaId', () => {
  let selecionado = null;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: (id) => { selecionado = id; }, onVoltar: () => {} });
  const compativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /CX-001/.test(l.textContent));
  compativel.click();
  assert.equal(selecionado, 'CX-001');
});

test('clicar em caixa incompativel NAO chama onSelecionar', () => {
  let selecionado = null;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: (id) => { selecionado = id; }, onVoltar: () => {} });
  const incompativel = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /OP-B/.test(l.textContent));
  incompativel.click();
  assert.equal(selecionado, null);
});

test('botao Voltar chama onVoltar', () => {
  let voltou = false;
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: sessoesEmbarque, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => { voltou = true; } });
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(voltou, true);
});

test('ignora sessoes canceladas e ativas sem caixa', () => {
  const dados = [
    ...sessoesEmbarque,
    { id: 'S5', codigo_op: 'OP-A', status: 'ativa', programa_nome: 'X', quantidade_total: 0 },
    { id: 'S6', numero_caixa: 'CX-X', codigo_op: 'OP-A', status: 'cancelada', quantidade_total: 99, encerrada_em: '2026-05-28T12:00:00Z' },
  ];
  abrirModalSelecionarCaixa({ sessoesDoEmbarque: dados, opAtual: 'OP-A', onSelecionar: () => {}, onVoltar: () => {} });
  const linhas = document.querySelectorAll('[data-linha-caixa-opcao]');
  assert.equal(linhas.length, 3);
  assert.equal([...linhas].some((l) => /CX-X/.test(l.textContent)), false);
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `npm test -- --test-name-pattern="selecionar"`
Expected: FAIL — modulo nao existe.

- [ ] **Step 3: Implementar o Modal #2**

Crie `public/js/ui/composites/modal-selecionar-caixa.js`:

```js
import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { formatarNumero } from '../../infra/formatters.js';
import { agruparCaixas } from '../../domain/caixas.js';

function celula(texto, classe) {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = texto == null ? '-' : String(texto);
  return span;
}

export function abrirModalSelecionarCaixa({ sessoesDoEmbarque = [], opAtual, onSelecionar, onVoltar } = {}) {
  const modal = Modal({
    title: 'Qual caixa deseja descarregar?',
    subtitle: 'Selecione a caixa de destino. As pecas contadas serao somadas ao conteudo existente.',
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const caixas = agruparCaixas(sessoesDoEmbarque);

  if (caixas.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'text-sm text-on-surface-variant';
    vazio.textContent = 'Nenhuma caixa registrada neste embarque.';
    stage.appendChild(vazio);
  } else {
    const lista = document.createElement('div');
    lista.className = 'space-y-2 max-h-96 overflow-y-auto';
    for (const caixa of caixas) {
      const incompativel = opAtual != null && caixa.codigo_op !== opAtual;
      const qtdSessoes = sessoesDoEmbarque.filter((s) => s.numero_caixa === caixa.numero_caixa && s.status !== 'cancelada').length;

      const linha = document.createElement('button');
      linha.type = 'button';
      linha.dataset.linhaCaixaOpcao = 'true';
      if (incompativel) {
        linha.dataset.incompativel = 'true';
        linha.disabled = true;
        linha.setAttribute('title', 'OP diferente - incompativel com a sessao atual');
      }
      const base = 'w-full text-left grid grid-cols-[1fr,auto,auto,auto] gap-3 px-4 py-3 rounded-lg text-sm items-center transition-colors';
      const ativo = 'bg-surface-container-low hover:bg-surface-container cursor-pointer';
      const inativo = 'bg-surface-container-low opacity-50 cursor-not-allowed';
      linha.className = `${base} ${incompativel ? inativo : ativo}`;
      linha.append(
        celula(caixa.numero_caixa_exibicao, 'font-medium text-on-surface'),
        celula(caixa.codigo_op, 'text-on-surface-variant text-xs'),
        celula(formatarNumero(caixa.quantidade_total), 'font-semibold text-on-surface'),
        celula(`${qtdSessoes} sess${qtdSessoes === 1 ? 'ao' : 'oes'}`, 'text-on-surface-variant text-xs'),
      );
      if (!incompativel) {
        linha.addEventListener('click', () => { modal.fechar(); onSelecionar?.(caixa.numero_caixa); });
      }
      lista.appendChild(linha);
    }
    stage.appendChild(lista);
  }

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';
  const btnVoltar = Button({
    texto: 'Voltar',
    variante: 'secondary',
    onClick: () => { modal.fechar(); onVoltar?.(); },
  });
  btnVoltar.dataset.acaoVoltar = 'true';
  actions.appendChild(btnVoltar);
  stage.appendChild(actions);

  body.appendChild(stage);
  return modal;
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- --test-name-pattern="selecionar"`
Expected: PASS — todos os 6 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/composites/modal-selecionar-caixa.js tests/frontend/ui/modal-selecionar-caixa.test.js
git commit -m "feat(ui): adiciona Modal #2 (lista de caixas) com filtro de OP compativel"
```

---

## Task 3: Modal #1 — Refator de modal-encerrar-sessao

**Files:**
- Modify: `public/js/ui/composites/modal-encerrar-sessao.js` (reescrita completa)
- Modify: `tests/frontend/ui/modal-encerrar-sessao.test.js` (reescrita completa)

- [ ] **Step 1: Reescrever testes (TDD)**

Substitua TODO o conteudo de `tests/frontend/ui/modal-encerrar-sessao.test.js`:

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalEncerrarSessao } from '../../../public/js/ui/composites/modal-encerrar-sessao.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

const sessao = {
  id: 'S1',
  codigo_op: 'OP-A',
  numero_embarque: 'E1',
  programa_nome: 'PECA-X',
};

const sessoesEmbarqueComCaixas = [
  { id: 'S0', numero_caixa: 'CX-001', codigo_op: 'OP-A', programa_nome: 'PECA-X', quantidade_total: 50, encerrada_em: '2026-05-28T10:00:00Z', status: 'encerrada' },
];

test('exibe tres botoes quando o embarque ja tem caixas', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('oculta botao Caixa existente quando nao ha caixas no embarque', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: () => {} });
  assert.equal(document.querySelector('[data-acao-caixa-existente]'), null);
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('clicar em Nova caixa sem numero chama onConfirmar com a flag direta', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});

test('clicar em Nova caixa numerada troca estado, mostra input e Confirmar/Voltar', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: () => {} });
  document.querySelector('[data-acao-nova-numerada]').click();
  assert.ok(document.querySelector('[data-input="numero_caixa"]'));
  assert.ok(document.querySelector('[data-acao-confirmar-numerada]'));
  assert.ok(document.querySelector('[data-acao-voltar-numerada]'));
  assert.equal(document.querySelector('[data-acao-sem-numero]'), null);
});

test('Confirmar de Nova numerada chama onConfirmar com numero_caixa', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-nova-numerada]').click();
  document.querySelector('[data-input="numero_caixa"]').value = 'CX-077';
  document.querySelector('[data-acao-confirmar-numerada]').click();
  assert.deepEqual(payload, { numero_caixa: 'CX-077' });
});

test('Voltar de Nova numerada restaura os tres botoes', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-nova-numerada]').click();
  document.querySelector('[data-acao-voltar-numerada]').click();
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
  assert.ok(document.querySelector('[data-acao-nova-numerada]'));
  assert.ok(document.querySelector('[data-acao-sem-numero]'));
});

test('Caixa existente abre Modal 2 e selecao la chama onConfirmar com caixa_id', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-acao-caixa-existente]').click();
  const linhaCx = document.querySelector('[data-linha-caixa-opcao]');
  assert.ok(linhaCx);
  linhaCx.click();
  document.querySelector('[data-acao-concluir]').click();
  assert.deepEqual(payload, { caixa_id: 'CX-001' });
});

test('Voltar no Modal 2 reabre o Modal 1', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.ok(document.querySelector('[data-acao-caixa-existente]'));
});

test('Voltar no Modal 3 reabre o Modal 2', () => {
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, onConfirmar: () => {} });
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-linha-caixa-opcao]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.ok(document.querySelector('[data-linha-caixa-opcao]'));
});

test('aviso de faturado bloqueia acoes ate checkbox ser marcado', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: [], embarqueFaturado: true, onConfirmar: (p) => { payload = p; } });
  assert.ok(document.querySelector('[data-input="confirmar-recusa"]'));
  document.querySelector('[data-acao-sem-numero]').click();
  assert.equal(payload, null);
  document.querySelector('[data-input="confirmar-recusa"]').checked = true;
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});

test('estado do checkbox faturado e preservado ao voltar do Modal 2', () => {
  let payload = null;
  abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque: sessoesEmbarqueComCaixas, embarqueFaturado: true, onConfirmar: (p) => { payload = p; } });
  document.querySelector('[data-input="confirmar-recusa"]').checked = true;
  document.querySelector('[data-input="confirmar-recusa"]').dispatchEvent(new Event('change'));
  document.querySelector('[data-acao-caixa-existente]').click();
  document.querySelector('[data-acao-voltar]').click();
  assert.equal(document.querySelector('[data-input="confirmar-recusa"]').checked, true);
  document.querySelector('[data-acao-sem-numero]').click();
  assert.deepEqual(payload, { criar_caixa_sem_numero: true });
});
```

- [ ] **Step 2: Rodar para confirmar que falha**

Run: `npm test -- --test-name-pattern="encerrar"`
Expected: FAIL — testes novos nao encontram seletores/funcoes.

- [ ] **Step 3: Reescrever o Modal #1**

Substitua TODO o conteudo de `public/js/ui/composites/modal-encerrar-sessao.js`:

```js
import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';
import { abrirModalSelecionarCaixa } from './modal-selecionar-caixa.js';
import { abrirModalPacklistCaixa } from './modal-packlist-caixa.js';
import { agruparCaixas } from '../../domain/caixas.js';

function montarAlertaFaturado() {
  const alertBox = document.createElement('div');
  alertBox.className = 'rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 space-y-3';

  const header = document.createElement('div');
  header.className = 'text-sm font-semibold flex items-center gap-2';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-amber-600';
  icon.textContent = 'warning';
  const msg = document.createElement('span');
  msg.textContent = 'Atencao: Este embarque ja foi faturado! O encerramento tardio pode gerar divergencias fiscais.';
  header.append(icon, msg);

  const label = document.createElement('label');
  label.className = 'flex items-center gap-3 text-sm font-medium cursor-pointer';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.input = 'confirmar-recusa';
  cb.className = 'w-4 h-4 rounded text-amber-600 border-amber-400 focus:ring-amber-500';
  const labelText = document.createElement('span');
  labelText.textContent = 'Estou ciente e desejo prosseguir com o encerramento tardio.';
  label.append(cb, labelText);

  alertBox.append(header, label);
  return { alertBox, checkbox: cb };
}

export function abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque = [], embarqueFaturado = false, onConfirmar } = {}) {
  const estado = { faturadoConfirmado: false };

  function abrirModal1() {
    const modal = Modal({
      title: 'Encerrar Sessao',
      subtitle: `Defina a caixa de destino da sessao ${sessao?.programa_nome ?? ''}.`,
    });
    modal.abrir();
    const body = modal.corpo();

    const stage = document.createElement('div');
    stage.className = 'space-y-6';

    let checkboxFaturado = null;
    if (embarqueFaturado) {
      const { alertBox, checkbox } = montarAlertaFaturado();
      checkbox.checked = estado.faturadoConfirmado;
      checkbox.addEventListener('change', () => { estado.faturadoConfirmado = checkbox.checked; });
      checkboxFaturado = checkbox;
      stage.appendChild(alertBox);
    }

    function validarFaturado() {
      if (!embarqueFaturado) return true;
      if (!checkboxFaturado || !checkboxFaturado.checked) {
        toast.erro('Voce deve confirmar que esta ciente do encerramento tardio.');
        return false;
      }
      estado.faturadoConfirmado = true;
      return true;
    }

    const botoes = document.createElement('div');
    botoes.className = 'grid gap-3';

    const temCaixas = agruparCaixas(sessoesDoEmbarque).length > 0;
    if (temCaixas) {
      const btnExistente = Button({
        texto: 'Caixa ja existente',
        variante: 'primary',
        className: 'w-full justify-center py-4',
        onClick: () => {
          if (!validarFaturado()) return;
          modal.fechar();
          abrirModal2();
        },
      });
      btnExistente.dataset.acaoCaixaExistente = 'true';
      botoes.appendChild(btnExistente);
    }

    const btnNumerada = Button({
      texto: 'Nova caixa numerada',
      variante: 'secondary',
      className: 'w-full justify-center py-4 bg-surface-container-high',
      onClick: () => {
        if (!validarFaturado()) return;
        mostrarEstadoNovaNumerada();
      },
    });
    btnNumerada.dataset.acaoNovaNumerada = 'true';
    botoes.appendChild(btnNumerada);

    const btnSemNumero = Button({
      texto: 'Nova caixa sem numero',
      variante: 'secondary',
      className: 'w-full justify-center py-4 bg-surface-container-high',
      onClick: () => {
        if (!validarFaturado()) return;
        modal.fechar();
        onConfirmar?.({ criar_caixa_sem_numero: true });
      },
    });
    btnSemNumero.dataset.acaoSemNumero = 'true';
    botoes.appendChild(btnSemNumero);

    stage.appendChild(botoes);
    body.appendChild(stage);

    function mostrarEstadoNovaNumerada() {
      botoes.remove();
      const numWrap = document.createElement('div');
      numWrap.className = 'space-y-4';
      const inputWrap = Input({ label: 'Numero da Caixa', id: 'enc-caixa' });
      inputWrap.querySelector('input').dataset.input = 'numero_caixa';
      numWrap.appendChild(inputWrap);

      const acoes = document.createElement('div');
      acoes.className = 'flex gap-4';
      const btnConfirmar = Button({
        texto: 'Confirmar',
        variante: 'primary',
        onClick: () => {
          const num = numWrap.querySelector('[data-input="numero_caixa"]').value.trim();
          if (!num) { toast.erro('Informe o numero da caixa.'); return; }
          modal.fechar();
          onConfirmar?.({ numero_caixa: num });
        },
      });
      btnConfirmar.dataset.acaoConfirmarNumerada = 'true';
      const btnVoltar = Button({
        texto: 'Voltar',
        variante: 'secondary',
        onClick: () => {
          numWrap.remove();
          stage.appendChild(botoes);
        },
      });
      btnVoltar.dataset.acaoVoltarNumerada = 'true';
      acoes.append(btnConfirmar, btnVoltar);
      numWrap.appendChild(acoes);
      stage.appendChild(numWrap);
    }
  }

  function abrirModal2() {
    abrirModalSelecionarCaixa({
      sessoesDoEmbarque,
      opAtual: sessao?.codigo_op,
      onSelecionar: (caixaId) => {
        abrirModal3(caixaId);
      },
      onVoltar: () => {
        abrirModal1();
      },
    });
  }

  function abrirModal3(caixaId) {
    const sessoesDaCaixa = sessoesDoEmbarque.filter((s) => s.numero_caixa === caixaId && s.status !== 'cancelada');
    abrirModalPacklistCaixa({
      caixaId,
      sessoesDaCaixa,
      onConfirmar: () => {
        onConfirmar?.({ caixa_id: caixaId });
      },
      onVoltar: () => {
        abrirModal2();
      },
    });
  }

  abrirModal1();
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- --test-name-pattern="encerrar"`
Expected: PASS — todos os 11 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/composites/modal-encerrar-sessao.js tests/frontend/ui/modal-encerrar-sessao.test.js
git commit -m "refactor(ui): modal de encerrar sessao vira wizard de 3 telas"
```

---

## Task 4: Atualizar pagina de detalhes da carga

**Files:**
- Modify: `public/js/pages/detalhes-carga.js` (chamada de `abrirModalEncerrarSessao`, linhas ~114-119)

- [ ] **Step 1: Atualizar a chamada do modal**

No arquivo `public/js/pages/detalhes-carga.js`, localize o trecho:

```js
onEncerrar: () => abrirModalEncerrarSessao({
  sessao: ativa,
  caixasExistentes: caixas
    .filter((caixa) => caixa.codigo_op === ativa.codigo_op)
    .map((caixa) => ({ id: caixa.id, label: caixa.numero_caixa_exibicao })),
  embarqueFaturado: Boolean(embarque.numero_nota_fiscal),
  onConfirmar: async (payload) => {
```

Substitua por:

```js
onEncerrar: () => abrirModalEncerrarSessao({
  sessao: ativa,
  sessoesDoEmbarque: sessoes,
  embarqueFaturado: Boolean(embarque.numero_nota_fiscal),
  onConfirmar: async (payload) => {
```

(Mantenha o resto do callback `onConfirmar` exatamente como esta.)

- [ ] **Step 2: Rodar testes da pagina**

Run: `npm test -- --test-name-pattern="detalhes-carga|detalhes da carga"`
Expected: PASS — testes existentes seguem verdes (nao dependem mais de `caixasExistentes`).

- [ ] **Step 3: Rodar suite completa**

Run: `npm test`
Expected: PASS — nenhuma regressao.

- [ ] **Step 4: Commit**

```bash
git add public/js/pages/detalhes-carga.js
git commit -m "feat(detalhes-carga): passa sessoes raw ao modal de encerrar"
```

---

## Task 5: Smoke test do wizard completo

**Files:**
- Modify: `tests/frontend/pages/detalhes-carga.test.js` (adiciona teste de integracao)

- [ ] **Step 1: Adicionar teste de integracao**

No final de `tests/frontend/pages/detalhes-carga.test.js`, adicione:

```js
test('encerrar sessao pelo wizard: Caixa existente -> packlist -> Concluir aciona sessoesSvc.encerrar com caixa_id', async () => {
  let encerrarPayload = null;
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '10', motorista: 'M', placa: 'AAA-0000', status: 'aberto' };
        if (path.startsWith('/sessoes')) return [
          { id: 'SE', numero_embarque: '10', camera_id: 1, codigo_op: 'OP-A', quantidade_total: 5, numero_caixa: 'CX-100', programa_nome: 'PECA-X', status: 'encerrada', encerrada_em: '2026-05-28T10:00:00Z' },
          { id: 'SA', numero_embarque: '10', camera_id: 2, codigo_op: 'OP-A', quantidade_total: 12, status: 'ativa', programa_nome: 'PECA-X', iniciada_em: '2026-05-28T11:00:00Z' },
        ];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
    sessoesSvc: {
      encerrar: async (id, payload) => { encerrarPayload = { id, payload }; return {}; },
      reiniciarContagem: async () => ({}),
      reiniciarSessao: async () => ({}),
    },
    catalogos: {},
  };
  const el = await renderDetalhesCarga(ctx, '10');
  document.body.appendChild(el);

  const btnEncerrar = [...el.querySelectorAll('button')].find((b) => /Encerrar Sess/.test(b.textContent));
  assert.ok(btnEncerrar);
  btnEncerrar.click();

  document.querySelector('[data-acao-caixa-existente]').click();
  const linha = [...document.querySelectorAll('[data-linha-caixa-opcao]')].find((l) => /CX-100/.test(l.textContent));
  assert.ok(linha, 'Linha CX-100 deve existir no Modal #2');
  linha.click();
  document.querySelector('[data-acao-concluir]').click();

  await new Promise((r) => setTimeout(r, 0));

  assert.deepEqual(encerrarPayload, { id: 'SA', payload: { caixa_id: 'CX-100' } });
});
```

- [ ] **Step 2: Rodar o smoke test**

Run: `npm test -- --test-name-pattern="wizard"`
Expected: PASS — fluxo end-to-end do wizard valida-se.

- [ ] **Step 3: Rodar suite completa**

Run: `npm test`
Expected: PASS — todas as suites verdes.

- [ ] **Step 4: Commit**

```bash
git add tests/frontend/pages/detalhes-carga.test.js
git commit -m "test(detalhes-carga): smoke test do wizard de encerramento end-to-end"
```

---

## Checklist final

- [ ] Todos os 5 commits feitos
- [ ] `npm test` 100% verde
- [ ] Modal #1 mostra 3 botoes quando ha caixas, 2 quando nao ha
- [ ] Modal #2 desabilita caixas com OP diferente
- [ ] Modal #3 mostra packlist cronologico com total
- [ ] Voltar em cada modal reabre o anterior, preservando o estado do faturado
- [ ] ESC / clique fora cancela o wizard inteiro (garantido pela primitiva `Modal`)
