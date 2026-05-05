---
tags:
  - codigo
  - backend
  - dominio
arquivos_cobertos:
  - src/domain/sessao-service.js
  - src/domain/contagem-service.js
  - src/db/queries/sessoes.js
testes_relacionados:
  - tests/sessao-service.test.js
  - tests/contagem-service.test.js
  - tests/sessoes-queries.test.js
  - tests/sessoes-routes.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
  - cda066c fix(sessao): rejeitar abertura em camera desconectada + validacao E2E
  - d15c8b6 feat(sessoes): suporte a GET /sessoes?embarque=<numero>
atualizado_em: 2026-04-22
---

# Dominio de Sessao e Contagem

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- abertura, confirmacao ou encerramento de sessao;
- validacao de embarque, OP ou operador;
- regra de uma sessao por camera;
- numero de caixa duplicado;
- tratamento de pulso recebido;
- broadcast de `sessao.atualizada` ou `contagem.incrementada`.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/domain/sessao-service.js` | regra de negocio da sessao de contagem |
| `src/domain/contagem-service.js` | aplica pulsos no estado local e atualiza a UI |
| `src/db/queries/sessoes.js` | persistencia direta usada por ambos |

## Fluxo de sessao

### Abrir

`sessao-service.js`:

1. valida embarque, OP e operador no cache local;
2. verifica se a camera existe, esta conectada e esta livre;
3. cria a sessao no SQLite;
4. registra evento de abertura;
5. broadcasta `sessao.atualizada` como `ativa-sem-programa`.

### Confirmar

1. busca a sessao;
2. chama `CameraManager.ativarSessao({ programaNumero })`;
3. grava `programa_numero` e `programa_nome`;
4. enfileira a sessao para sync;
5. registra evento e broadcasta a sessao atualizada.

### Encerrar

1. valida existencia e estado;
2. exige `numero_caixa`;
3. bloqueia duplicidade no mesmo embarque;
4. manda `OE,0` para a camera;
5. encerra no SQLite, enfileira sync e broadcasta.

## Fluxo de contagem

`contagem-service.js`:

1. procura a sessao ativa da camera;
2. se nao houver sessao, registra evento `WARN` e descarta o pulso;
3. atualiza `quantidade_total` no SQLite;
4. broadcasta `contagem.incrementada`.

Importante: este service nao sobe dados diretamente para o Supabase. Ele atualiza o estado local e deixa a sincronizacao para as outras camadas.

## Acoplamentos importantes

- depende de `espelhos.js` para validar embarque, OP e operador;
- depende de `camera-manager.js` para ativar e encerrar a camera;
- depende de `sessoes.js` para persistencia;
- o frontend operacional depende diretamente dos broadcasts emitidos aqui.

## Contexto de criacao

- o dominio principal entrou no commit `80f6c08`;
- a abertura em camera desconectada passou a ser barrada explicitamente em `cda066c`;
- a leitura por embarque, usada pela tela de detalhes da carga, apareceu em `d15c8b6`.

## Testes que guiam alteracoes

- `tests/sessao-service.test.js`: contratos de abertura, confirmacao e encerramento;
- `tests/contagem-service.test.js`: pulso valido e descarte sem sessao;
- `tests/sessoes-queries.test.js`: comportamento persistente;
- `tests/sessoes-routes.test.js`: integracao das rotas com o service.
