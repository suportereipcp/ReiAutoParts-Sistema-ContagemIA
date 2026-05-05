# Fluxo de Caixas e Sessoes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir novas sessoes vinculadas a caixas reutilizaveis dentro do mesmo embarque, inclusive caixas sem numero, e expor o fluxo operacional na tela de detalhes da carga.

**Architecture:** Manter `sessoes_contagem` como trilha historica de cada contagem e tratar `numero_caixa` como identificador logico reutilizavel no embarque. O backend passa a permitir varias sessoes para a mesma caixa e valida compatibilidade por `codigo_op`; o frontend agrega sessoes por caixa e move a continuidade da carga para a tela de detalhes do embarque.

**Tech Stack:** Node.js 20, better-sqlite3, Fastify, node:test, frontend vanilla JS.

---

### Task 1: Backend de caixas reutilizaveis

**Files:**
- Create: `src/db/migrations/002_reabrir_caixas.sql`
- Modify: `src/domain/sessao-service.js`
- Modify: `src/db/queries/sessoes.js`
- Modify: `src/http/routes/sessoes.js`
- Test: `tests/sessao-service.test.js`
- Test: `tests/sessoes-queries.test.js`
- Test: `tests/sessoes-routes.test.js`

- [ ] Cobrir com testes falhando o reuso da mesma caixa no mesmo embarque e OP.
- [ ] Cobrir com testes falhando a geracao de caixa sem numero por identificador interno.
- [ ] Cobrir com testes falhando o bloqueio de reaproveitamento da caixa quando o `codigo_op` divergir.
- [ ] Implementar a remocao do indice unico por `numero_embarque + numero_caixa`.
- [ ] Implementar helpers para caixas sem numero e validacao de compatibilidade da caixa.
- [ ] Ajustar a rota de encerramento para aceitar payload estendido de caixa.

### Task 2: Controles da sessao ativa

**Files:**
- Modify: `src/domain/sessao-service.js`
- Modify: `src/http/routes/sessoes.js`
- Modify: `public/js/domain/sessoes-service.js`
- Test: `tests/sessao-service.test.js`
- Test: `tests/sessoes-routes.test.js`
- Test: `tests/frontend/domain/sessoes-service.test.js`

- [ ] Cobrir com testes falhando o reinicio da contagem da sessao ativa.
- [ ] Cobrir com testes falhando o cancelamento/reinicio operacional da sessao.
- [ ] Implementar service e rotas para `reiniciar contagem` e `reiniciar sessao`.
- [ ] Expor os novos endpoints no client do frontend.

### Task 3: Fluxo do frontend na carga aberta

**Files:**
- Modify: `public/js/pages/dashboard.js`
- Modify: `public/js/pages/detalhes-carga.js`
- Modify: `public/js/ui/composites/painel-contagem.js`
- Modify: `public/js/ui/composites/modal-nova-carga.js`
- Create: `public/js/ui/composites/modal-encerrar-sessao.js`
- Modify: `public/js/ui/composites/tabela-caixas.js`
- Test: `tests/frontend/pages/dashboard.test.js`
- Test: `tests/frontend/pages/detalhes-carga.test.js`
- Test: `tests/frontend/ui/painel-contagem.test.js`
- Test: `tests/frontend/ui/modal-nova-carga.test.js`
- Test: `tests/frontend/ui/tabela-caixas.test.js`

- [ ] Fazer `Continuar Carga` operar por embarque aberto, nao por sessao ativa.
- [ ] Permitir abrir nova sessao a partir do detalhe do embarque com embarque pre-preenchido.
- [ ] Exibir a sessao ativa com acoes de encerrar, reiniciar contagem e reiniciar sessao.
- [ ] Encerrar sessao com escolha de caixa nova, caixa existente e caixa sem numero.
- [ ] Agregar sessoes historicas por caixa para exibir total somado na tabela.

### Task 4: Verificacao

**Files:**
- Modify: `docs/superpowers/plans/2026-04-23-fluxo-caixas-sessoes.md`

- [ ] Rodar os testes focados alterados.
- [ ] Rodar a suite backend/frontend relevante para regressao.
- [ ] Ajustar o plano com o que foi realmente entregue.
