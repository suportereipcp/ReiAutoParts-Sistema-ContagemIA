---
tags:
  - codigo
  - backend
  - sync
arquivos_cobertos:
  - src/sync/healthcheck.js
  - src/sync/outbox-pusher.js
  - src/sync/reverse-poller.js
  - src/sync/sync-worker.js
  - src/sync/supabase-client.js
  - supabase/migrations/001_schema_inicial.sql
  - supabase/migrations/002_programa_camera.sql
testes_relacionados:
  - tests/healthcheck.test.js
  - tests/outbox-pusher.test.js
  - tests/reverse-poller.test.js
  - tests/sync-worker.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
atualizado_em: 2026-04-22
---

# Sync e Supabase

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- ONLINE, OFFLINE ou RECOVERY;
- pusher da outbox;
- reverse sync de embarques, OPs e operadores;
- contrato com o Supabase;
- `atualizado_em`, cursor ou batch size;
- comportamento em 4xx e 5xx.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/sync/healthcheck.js` | decide se o backend considera a nuvem `up` ou `down` |
| `src/sync/outbox-pusher.js` | drena a outbox local para o Supabase |
| `src/sync/reverse-poller.js` | traz alteracoes do Supabase para o SQLite local |
| `src/sync/sync-worker.js` | coordena estado ONLINE, OFFLINE e RECOVERY |
| `src/sync/supabase-client.js` | wrapper minimo do client Supabase |

## Divisao de responsabilidades

### `healthcheck.js`

Conta falhas consecutivas ate o limite e retorna `up` ou `down`.

### `outbox-pusher.js`

- le itens pendentes da outbox;
- envia um por vez;
- marca sincronizado em caso de sucesso;
- marca falha em caso de erro;
- trata 4xx como dead-letter logico do ciclo atual;
- aborta o ciclo em falhas transitorias.

### `reverse-poller.js`

- percorre `embarques`, `ordens_producao` e `operadores`;
- usa cursor por `atualizado_em`;
- faz upsert em transacao local;
- atualiza cursor ao final de cada tabela.

### `sync-worker.js`

E o coordenador leve da state machine:

1. roda `healthchecker.tick()`;
2. se cair, entra em `OFFLINE`;
3. se voltar depois do offline, entra em `RECOVERY`;
4. drena outbox e roda poller;
5. se tudo der certo em recovery, volta a `ONLINE`.

### `supabase-client.js`

- cria client fixado no schema `sistema_contagem`;
- faz upsert de sessao por `id`;
- faz upsert de evento por `origem,id_local`;
- busca alteracoes por cursor temporal.

## Contexto de criacao

Toda a espinha dorsal do sync entrou na implementacao base em `80f6c08`, alinhada ao principio edge-first do projeto.

## Nuances que ajudam a IA

- o pusher trabalha sobre a outbox local, nao diretamente sobre o dominio;
- o poller alimenta o cache local que sustenta a abertura de sessao offline;
- a UI nao consulta o Supabase; ela depende do estado local e do `/health`;
- alterar `atualizado_em` ou o schema cloud pode impactar imediatamente o poller.

## Testes que devem ser lidos antes de editar

- `tests/healthcheck.test.js`
- `tests/outbox-pusher.test.js`
- `tests/reverse-poller.test.js`
- `tests/sync-worker.test.js`
