---
tags:
  - codigo
  - backend
  - banco
arquivos_cobertos:
  - src/db/sqlite.js
  - src/db/migrations/001_init.sql
  - src/db/queries/sessoes.js
  - src/db/queries/outbox.js
  - src/db/queries/eventos.js
  - src/db/queries/espelhos.js
  - supabase/migrations/001_schema_inicial.sql
  - supabase/migrations/002_programa_camera.sql
testes_relacionados:
  - tests/sqlite.test.js
  - tests/sessoes-queries.test.js
  - tests/outbox.test.js
  - tests/espelhos.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
  - d15c8b6 feat(sessoes): suporte a GET /sessoes?embarque=<numero>
atualizado_em: 2026-04-22
---

# Banco Local, Queries e Migrations

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- schema SQLite local;
- outbox e sincronizacao pendente;
- tabelas espelho de embarques, OPs e operadores;
- regras de unicidade de sessao ou caixa;
- migrations do Supabase;
- consultas usadas pelas rotas e pelos services.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/db/sqlite.js` | abre o SQLite, aplica migrations locais e mantem singleton |
| `src/db/migrations/001_init.sql` | schema operacional local: sessoes, eventos, outbox, espelhos e cursor |
| `src/db/queries/sessoes.js` | CRUD de sessoes locais, listas de ativas e consulta por embarque |
| `src/db/queries/outbox.js` | fila de itens pendentes para o Supabase |
| `src/db/queries/eventos.js` | persistencia e leitura de eventos locais |
| `src/db/queries/espelhos.js` | upsert e consulta das tabelas trazidas do Supabase |
| `supabase/migrations/001_schema_inicial.sql` | schema cloud inicial do `sistema_contagem` |
| `supabase/migrations/002_programa_camera.sql` | adiciona programa da camera e indice de caixa unica por embarque |

## Como o desenho de dados esta dividido

### SQLite local

E a fonte operacional do Edge PC. O schema local foi desenhado para:

- aceitar escrita imediata de sessoes e eventos;
- manter uma outbox local;
- armazenar espelhos de `embarques`, `ordens_producao` e `operadores`;
- permitir leitura offline durante abertura e consulta de sessao.

### Supabase

E a fonte central consolidada. O schema cloud espelha os conceitos do runtime local, mas com constraints e referencias relacionais proprias do PostgreSQL.

## Papel de cada arquivo de queries

### `sessoes.js`

Responsavel por:

- criar sessao local;
- consultar ativa por camera;
- incrementar contagem;
- encerrar sessao;
- listar ativas;
- buscar por ID;
- listar sessoes de um embarque.

O suporte a `listarPorEmbarque` entrou para habilitar a tela de detalhes da carga no commit `d15c8b6`.

### `outbox.js`

Responsavel por:

- enfileirar payloads;
- listar pendentes;
- marcar sincronizado;
- registrar falha;
- contar itens pendentes.

### `eventos.js`

Responsavel por:

- registrar eventos do sistema;
- listar recentes;
- buscar por `id_local`.

### `espelhos.js`

Responsavel por:

- upsert de embarques, OPs e operadores;
- consultas de apoio para abertura de sessao;
- persistencia do cursor do reverse poller.

## Acoplamentos importantes

- `sessao-service.js` depende fortemente de `sessoes.js` e `espelhos.js`.
- `contagem-service.js` depende de `buscarAtivaPorCamera`.
- `outbox-pusher.js` depende de `outbox.js`.
- quase todas as rotas REST de leitura dependem de `espelhos.js` ou `sessoes.js`.

## Contexto de criacao

- a base do schema local e das queries entrou na implementacao edge-first em `80f6c08`;
- `002_programa_camera.sql` nasceu da necessidade de guardar o programa escolhido e bloquear caixa duplicada por embarque;
- `sessoes.js` foi expandido depois para suportar a tela de detalhes da carga.

## Testes que guiam alteracoes

- `tests/sqlite.test.js`: abertura do banco e migrations;
- `tests/sessoes-queries.test.js`: regras de sessao;
- `tests/outbox.test.js`: fluxo basico da fila;
- `tests/espelhos.test.js`: cache local das tabelas do ERP.
