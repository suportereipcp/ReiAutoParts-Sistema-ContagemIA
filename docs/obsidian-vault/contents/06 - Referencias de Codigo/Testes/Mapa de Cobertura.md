---
tags:
  - codigo
  - testes
  - cobertura
atualizado_em: 2026-04-22
---

# Mapa de Cobertura

Esta nota responde a pergunta: "qual teste eu devo abrir antes de editar esse arquivo?"

## Backend

| Arquivo de producao | Testes principais |
|---|---|
| `src/config.js` | `tests/config.test.js` |
| `src/db/sqlite.js` | `tests/sqlite.test.js` |
| `src/db/queries/outbox.js` | `tests/outbox.test.js` |
| `src/db/queries/sessoes.js` | `tests/sessoes-queries.test.js`, `tests/sessao-service.test.js`, `tests/sessoes-routes.test.js` |
| `src/db/queries/espelhos.js` | `tests/espelhos.test.js`, `tests/sessao-service.test.js`, `tests/reverse-poller.test.js` |
| `src/camera/keyence-parser.js` | `tests/keyence-parser.test.js` |
| `src/camera/keyence-client.js` | `tests/keyence-client.test.js` |
| `src/camera/camera-manager.js` | `tests/camera-manager.test.js` |
| `src/domain/sessao-service.js` | `tests/sessao-service.test.js`, `tests/sessoes-routes.test.js` |
| `src/domain/contagem-service.js` | `tests/contagem-service.test.js` |
| `src/sync/healthcheck.js` | `tests/healthcheck.test.js` |
| `src/sync/outbox-pusher.js` | `tests/outbox-pusher.test.js` |
| `src/sync/reverse-poller.js` | `tests/reverse-poller.test.js` |
| `src/sync/sync-worker.js` | `tests/sync-worker.test.js` |
| `src/http/routes/sessoes.js` | `tests/sessoes-routes.test.js` |
| `src/http/routes/eventos.js` | `tests/eventos-route.test.js` |

## Frontend infra e estado

| Arquivo de producao | Testes principais |
|---|---|
| `public/js/infra/api.js` | `tests/frontend/infra/api.test.js` |
| `public/js/infra/ws.js` | `tests/frontend/infra/ws.test.js` |
| `public/js/infra/router.js` | `tests/frontend/infra/router.test.js` |
| `public/js/infra/formatters.js` | `tests/frontend/infra/formatters.test.js` |
| `public/js/domain/catalogos.js` | `tests/frontend/domain/catalogos.test.js` |
| `public/js/domain/sessoes-service.js` | `tests/frontend/domain/sessoes-service.test.js` |
| `public/js/domain/sessoes-state.js` | `tests/frontend/domain/sessoes-state.test.js` |
| `public/js/domain/sync-state.js` | `tests/frontend/domain/sync-state.test.js` |

## Frontend paginas e UI

| Arquivo de producao | Testes principais |
|---|---|
| `public/js/pages/dashboard.js` | `tests/frontend/pages/dashboard.test.js` |
| `public/js/pages/selecao-carga.js` | `tests/frontend/pages/selecao-carga.test.js` |
| `public/js/pages/detalhes-carga.js` | `tests/frontend/pages/detalhes-carga.test.js` |
| `public/js/pages/detalhes-carga-expedida.js` | `tests/frontend/pages/detalhes-carga-expedida.test.js` |
| `public/js/pages/emitir-relatorios.js` | `tests/frontend/pages/emitir-relatorios.test.js` |
| `public/js/pages/relatorios-cargas-abertas.js` | `tests/frontend/pages/relatorios-cargas-abertas.test.js` |
| `public/js/pages/eventos.js` | `tests/frontend/pages/eventos.test.js` |
| `public/js/tv-render.js` e `public/js/tv-app.js` | `tests/frontend/pages/tv.test.js` |
| `public/js/ui/primitives/*.js` | `tests/frontend/ui/*.test.js` correspondentes |
| `public/js/ui/composites/*.js` | `tests/frontend/ui/*.test.js` correspondentes |

## Areas com cobertura menos direta

Arquivos que a IA normalmente precisara validar manualmente tambem:

- `src/server.js`
- `src/shared/logger.js`
- `public/index.html`
- `public/tv/index.html`
- `scripts/*.js`
- `*.bat`
- `supabase/migrations/*.sql`

Para essas areas, consulte tambem:

- [[06 - Referencias de Codigo/Backend/Bootstrap, Config e Runtime]]
- [[06 - Referencias de Codigo/Operacao/Scripts e Boot Local]]
- [[06 - Referencias de Codigo/Backend/Banco Local, Queries e Migrations]]
