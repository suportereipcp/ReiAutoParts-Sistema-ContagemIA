---
tags:
  - codigo
  - frontend
  - estado
arquivos_cobertos:
  - public/js/infra/api.js
  - public/js/infra/ws.js
  - public/js/infra/router.js
  - public/js/infra/formatters.js
  - public/js/domain/catalogos.js
  - public/js/domain/sessoes-service.js
  - public/js/domain/sessoes-state.js
  - public/js/domain/sync-state.js
  - public/js/pages/eventos.js
testes_relacionados:
  - tests/frontend/infra/api.test.js
  - tests/frontend/infra/ws.test.js
  - tests/frontend/infra/router.test.js
  - tests/frontend/infra/formatters.test.js
  - tests/frontend/domain/catalogos.test.js
  - tests/frontend/domain/sessoes-service.test.js
  - tests/frontend/domain/sessoes-state.test.js
  - tests/frontend/domain/sync-state.test.js
  - tests/frontend/pages/eventos.test.js
origem:
  - 0b9a81d feat(frontend): SPA shell + router wiring
atualizado_em: 2026-05-05
---

# Estado, API e Eventos

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- chamadas HTTP do frontend;
- eventos WebSocket traduzidos para o DOM;
- log ao vivo de trafego da camera;
- stores locais da UI;
- cache de catalogos;
- regras de roteamento hash;
- formatacao de numeros e datas.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `public/js/infra/api.js` | wrapper simples para GET e POST com tratamento de erro |
| `public/js/infra/ws.js` | traduz mensagens WS em `CustomEvent` no documento |
| `public/js/infra/router.js` | roteador hash da SPA |
| `public/js/infra/formatters.js` | formatacoes de data, hora, numero e rotulo de sync |
| `public/js/domain/catalogos.js` | acesso a catalogos e cache leve de embarques e operadores |
| `public/js/domain/sessoes-service.js` | chama as rotas de abertura, confirmacao e encerramento |
| `public/js/domain/sessoes-state.js` | store das sessoes, indexado por `camera_id` |
| `public/js/domain/sync-state.js` | store do estado de sync e outbox |
| `public/js/pages/eventos.js` | tabela de eventos persistidos e log ao vivo do trafego Keyence |

## Observacoes uteis para a IA

### `catalogos.js`

- cacheia apenas embarques abertos e operadores;
- `ops()` e `programas()` vao direto a API;
- a tela de nova carga depende bastante deste arquivo.

### `sessoes-state.js`

- guarda uma sessao por camera;
- atualiza contagem apenas se `camera_id` e `sessao_id` baterem;
- essa modelagem assume a regra de uma sessao ativa por camera.

### `sync-state.js`

- reflete o `/health` e os eventos `ws:sync.status`;
- nao conhece detalhes do backend alem de `estado` e `outbox_pendentes`.

### `ws.js`

Nao conhece telas. Ele so transforma a mensagem em eventos DOM do tipo `ws:<evento>`. Isso desacopla o socket do resto da UI.

### `eventos.js`

A pagina de Eventos tem duas fontes:

- `/eventos`: eventos persistidos no SQLite;
- `ws:camera.trafego`: linhas recebidas da Keyence em tempo real.

O bloco `Trafego ao vivo` exibe:

- uma linha por evento recebido da camera;
- `ASCII/CSV recebido`: texto bruto da Keyence, por exemplo `RT,04123,--,01,0000001,0000005`;
- `JSON interpretado`: objeto interno produzido pelo parser;
- status de leitura (`Contagem lida`, `Resposta de comando`, `Resposta solta`, `Erro lido`, `Nao interpretada`);
- agrupamento por dia e camera;
- filtros por dia e camera;
- scroll interno para evitar que o log empurre toda a pagina.

Esse log nao persiste cada linha em banco; ele e diagnostico em memoria via WebSocket para evitar alto volume de escrita local.

## Dependencias e acoplamentos

- `app.js` e `tv-app.js` montam esses objetos e orquestram as inscricoes;
- paginas e modais conversam com `sessoes-service.js` e `catalogos.js`;
- primitives e pages usam `formatters.js`.

## Contexto de criacao

Essa camada entrou junto da SPA em `0b9a81d` para evitar espalhar `fetch`, `WebSocket` e estado mutable pelas paginas.
