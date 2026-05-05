---
tags:
  - codigo
  - mapa
  - referencias
atualizado_em: 2026-04-22
---

# Mapa do Codigo

Este atlas foi criado para reduzir a necessidade de abrir arquivos grandes sem contexto. A ideia e que a IA leia primeiro a nota do subsistema certo, entenda o papel dos arquivos e so depois entre no codigo bruto.

## Entrypoints do sistema

| Arquivo | Papel |
|---|---|
| `src/server.js` | composicao principal do backend; conecta DB, cameras, sync, HTTP e WS |
| `src/config.js` | carrega `.env` e monta a configuracao em memoria |
| `public/index.html` | shell HTML da SPA do operador |
| `public/js/app.js` | orquestrador da SPA do operador |
| `public/tv/index.html` | shell HTML da TV kiosk |
| `public/js/tv-app.js` | orquestrador da TV kiosk |
| `scripts/start-edge.bat` | sobe o backend e abre a UI local |
| `abrir-sistema.bat` | bootstrap completo operador + TV no Windows |

## Como usar este atlas

1. identifique o sintoma ou a funcionalidade;
2. abra a nota do subsistema correspondente;
3. use a lista `Arquivos cobertos` para ir direto aos caminhos provaveis;
4. consulte `Testes relacionados` antes de editar;
5. so depois leia o codigo detalhado.

## Se voce quer alterar...

| Objetivo | Leia primeiro | Arquivos provaveis |
|---|---|---|
| startup, ordem de boot, env vars | [[06 - Referencias de Codigo/Backend/Bootstrap, Config e Runtime]] | `src/server.js`, `src/config.js` |
| schema local, outbox, consultas SQLite | [[06 - Referencias de Codigo/Backend/Banco Local, Queries e Migrations]] | `src/db/sqlite.js`, `src/db/migrations/001_init.sql`, `src/db/queries/*.js` |
| comandos Keyence, reconnect, descoberta de programas | [[06 - Referencias de Codigo/Backend/Camera Keyence e Programas]] | `src/camera/*.js`, `src/http/routes/programas.js` |
| abrir, confirmar ou encerrar sessao | [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]] | `src/domain/sessao-service.js`, `src/db/queries/sessoes.js` |
| pulso de contagem e atualizacao em tempo real | [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]] | `src/domain/contagem-service.js`, `src/http/ws-hub.js`, `public/js/domain/sessoes-state.js` |
| endpoints REST, WS, health ou relatorios | [[06 - Referencias de Codigo/Backend/HTTP, WebSocket e Relatorios]] | `src/http/routes/*.js`, `src/http/ws-hub.js` |
| offline, recovery, espelhos e Supabase | [[06 - Referencias de Codigo/Backend/Sync e Supabase]] | `src/sync/*.js`, `supabase/migrations/*.sql` |
| shell da SPA, rotas hash, TV kiosk | [[06 - Referencias de Codigo/Frontend/Shell SPA, TV e Navegacao]] | `public/index.html`, `public/js/app.js`, `public/tv/index.html`, `public/js/tv-app.js` |
| API client, stores, eventos WS, cache frontend | [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]] | `public/js/infra/*.js`, `public/js/domain/*.js` |
| telas, modais e componentes visuais | [[06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes]] | `public/js/pages/*.js`, `public/js/ui/**/*.js` |
| batchs e scripts de suporte no Edge PC | [[06 - Referencias de Codigo/Operacao/Scripts e Boot Local]] | `scripts/*`, `abrir-sistema.bat` |
| descobrir qual teste cobre um arquivo | [[06 - Referencias de Codigo/Testes/Mapa de Cobertura]] | `tests/**/*.test.js` |

## Notas por subsistema

### Backend

- [[06 - Referencias de Codigo/Backend/Bootstrap, Config e Runtime]]
- [[06 - Referencias de Codigo/Backend/Banco Local, Queries e Migrations]]
- [[06 - Referencias de Codigo/Backend/Camera Keyence e Programas]]
- [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]]
- [[06 - Referencias de Codigo/Backend/HTTP, WebSocket e Relatorios]]
- [[06 - Referencias de Codigo/Backend/Sync e Supabase]]

### Frontend

- [[06 - Referencias de Codigo/Frontend/Shell SPA, TV e Navegacao]]
- [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]]
- [[06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes]]

### Suporte

- [[06 - Referencias de Codigo/Operacao/Scripts e Boot Local]]
- [[06 - Referencias de Codigo/Testes/Mapa de Cobertura]]
