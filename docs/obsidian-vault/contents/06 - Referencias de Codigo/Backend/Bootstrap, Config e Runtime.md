---
tags:
  - codigo
  - backend
  - bootstrap
arquivos_cobertos:
  - src/server.js
  - src/config.js
  - src/shared/logger.js
testes_relacionados:
  - tests/config.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
  - 6f88980 feat(frontend+backend): eventos page + GET /eventos route + tests
atualizado_em: 2026-04-22
---

# Bootstrap, Config e Runtime

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a mudanca envolve:

- ordem de inicializacao do sistema;
- injecao de dependencias do backend;
- variaveis de ambiente;
- registro de rotas e plugins Fastify;
- servico estatico da pasta `public/`;
- composicao entre cameras, DB, sync e HTTP.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/server.js` | ponto de composicao do backend; instancia Fastify, DB, managers de camera, sync worker, services e rotas |
| `src/config.js` | valida env vars obrigatorias e expande parametros de camera, HTTP, sync, DB e logs |
| `src/shared/logger.js` | cria o logger base usado pelo servidor |

## O que cada arquivo resolve

### `src/server.js`

Este arquivo e o "composition root" do projeto. Ele nao concentra regra de negocio, mas conecta tudo:

1. abre SQLite via `getDb(config)`;
2. sobe Fastify com websocket e arquivos estaticos;
3. monta `CameraManager` para cada camera configurada;
4. cria cliente Supabase, healthchecker, pusher, poller e sync worker;
5. injeta dependencias em `sessao-service` e `contagem-service`;
6. registra rotas e inicia o listener HTTP;
7. conecta as cameras e inicia o ciclo periodico de sync.

Se uma alteracao depende da ordem de bootstrap, este e o arquivo mais importante.

### `src/config.js`

Define o contrato minimo do `.env` e normaliza defaults. A IA deve olhar aqui antes de adicionar qualquer nova configuracao porque:

- chaves obrigatorias sao validadas logo no boot;
- portas e tempos de sync sao derivados daqui;
- o caminho do SQLite e do log tambem nasce aqui.

### `src/shared/logger.js`

E o ponto comum do logger. Mudancas de formato ou nivel padrao tendem a passar aqui.

## Dependencias e acoplamentos

- `server.js` depende de praticamente todos os subsistemas do runtime.
- `config.js` influencia backend, scripts e deploy local.
- `server.js` faz a ponte entre `CameraManager` e `contagem-service` via evento `pulso`.
- `server.js` tambem broadcasta status de sync e camera para a UI.

## Contexto de criacao

- o bootstrap principal entrou na implementacao base em `80f6c08`;
- `src/server.js` foi alterado depois para incluir a rota de eventos e a pagina correspondente no commit `6f88980`.

## Cenarios tipicos de alteracao

- adicionar uma nova rota REST ou WS;
- mudar a cadencia do sync;
- trocar a forma de servir os assets do frontend;
- incluir mais dependencia no boot;
- adicionar nova variavel de ambiente.
