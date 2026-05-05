---
tags:
  - codigo
  - backend
  - http
arquivos_cobertos:
  - src/http/ws-hub.js
  - src/http/routes/health.js
  - src/http/routes/embarques.js
  - src/http/routes/ops.js
  - src/http/routes/operadores.js
  - src/http/routes/programas.js
  - src/http/routes/sessoes.js
  - src/http/routes/eventos.js
  - src/http/routes/relatorios.js
testes_relacionados:
  - tests/eventos-route.test.js
  - tests/sessoes-routes.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
  - 6f88980 feat(frontend+backend): eventos page + GET /eventos route + tests
atualizado_em: 2026-04-22
---

# HTTP, WebSocket e Relatorios

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- contratos REST do operador;
- payloads enviados pela UI;
- healthcheck;
- eventos WebSocket;
- download de CSV, XLSX ou PDF;
- rota nova ou mudanca de status code.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/http/ws-hub.js` | registra `/ws` e broadcasta eventos para as telas |
| `src/http/routes/health.js` | consolida estado de sync, outbox e cameras |
| `src/http/routes/embarques.js` | leitura de embarques abertos e detalhe por numero |
| `src/http/routes/ops.js` | leitura de OPs |
| `src/http/routes/operadores.js` | leitura de operadores ativos |
| `src/http/routes/programas.js` | leitura e descoberta de programas da camera |
| `src/http/routes/sessoes.js` | abrir, confirmar, encerrar e listar sessoes |
| `src/http/routes/eventos.js` | lista eventos recentes com filtro opcional |
| `src/http/routes/relatorios.js` | exporta sessoes por embarque em CSV, XLSX e PDF |

## Como a camada HTTP esta desenhada

- as rotas sao finas;
- a regra de negocio fica nos services e nas queries;
- o hub WS e separado para broadcast e nao carrega regra de negocio;
- `server.js` registra tudo e injeta dependencias.

## Mapa rapido de endpoints

| Endpoint | Delega para |
|---|---|
| `GET /health` | estado agregado do runtime local |
| `GET /embarques` e `GET /embarques/:numero` | `espelhos.js` |
| `GET /ops` | `espelhos.js` |
| `GET /operadores` | `espelhos.js` |
| `GET /programas` | `CameraManager` |
| `GET /sessoes` | `sessao-service.js` / `sessoes.js` |
| `POST /sessoes` | `sessao-service.abrir()` |
| `POST /sessoes/:id/confirmar` | `sessao-service.confirmar()` |
| `POST /sessoes/:id/encerrar` | `sessao-service.encerrar()` |
| `GET /eventos` | `eventos.js` |
| `GET /relatorios/embarque/:numero` | query SQL local + geradores de arquivo |

## O que a UI espera do WS

Eventos mais usados:

- `sync.status`
- `sessao.atualizada`
- `contagem.incrementada`
- `camera.estado`

O cliente `public/js/infra/ws.js` converte esses pacotes em eventos DOM.

## Contexto de criacao

- a base REST/WS entrou em `80f6c08`;
- a rota `/eventos` apareceu depois em `6f88980`, junto com a tela correspondente.

## Testes que ajudam a editar esta camada

- `tests/sessoes-routes.test.js`: contratos da rota de sessao;
- `tests/eventos-route.test.js`: contrato da rota de eventos.

## Observacao importante

Se a mudanca for no significado de um endpoint, quase sempre voce tambem precisara olhar as notas:

- [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]]
- [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]]
- [[06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes]]
