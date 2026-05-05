---
tags:
  - planejamento
  - implementacao
fontes:
  - docs/superpowers/plans/2026-04-17-sistema-contagem-rei-autoparts.md
atualizado_em: 2026-04-22
---

# Plano de Implementacao

## Escopo do plano

O plano principal de implementacao foi quebrado em 27 tarefas, cobrindo bootstrap do projeto, banco local, integracao Keyence, sync, backend HTTP, frontend inicial, scripts operacionais e checklist de pre-producao.

## Fases identificadas

### Fundacao

- repositorio, `package.json`, `.env.example` e estrutura inicial;
- config loader e logger;
- migrations e singleton do SQLite.

### Persistencia e dominio

- queries para sessoes, eventos, espelhos e outbox;
- servicos de sessao e contagem;
- regras de camera ativa e caixa unica.

### Hardware e sincronizacao

- parser e cliente Keyence;
- camera manager;
- healthcheck, outbox pusher, reverse poller e sync worker.

### API e telas iniciais

- rotas REST de leitura;
- rotas de sessao e relatorios;
- WebSocket hub;
- MVP inicial de operador e TV.

### Operacao

- fake Keyence;
- ping da camera real;
- PM2 + batch scripts;
- checklist E2E.

## Como ler este plano hoje

Use este documento como historico detalhado de execucao e decomposicao do sistema. Para visao mais rapida, prefira:

- [[05 - Planejamento/Especificacao do MVP]]
- [[02 - Arquitetura/Arquitetura Edge-First]]
- [[04 - Desenvolvimento/Ambiente e Comandos]]
