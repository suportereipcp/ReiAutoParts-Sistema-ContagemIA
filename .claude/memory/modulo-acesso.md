# Módulo: Configurador de Acessos

## Status: Implementado (2026-05-29)

## Arquivos
- `src/acesso/catalogo.js` — 13 atividades em 5 páginas
- `src/acesso/resolver.js` — resolverEfetivo()
- `src/db/migrations/006_acesso.sql` — 5 tabelas SQLite
- `src/db/queries/acesso.js` — CRUD completo
- `src/http/routes/acesso.js` — 10 rotas REST + enfileirarSync
- `supabase/migrations/006_acesso.sql` — equivalente PostgreSQL (aplicada)
- `public/js/pages/configurador.js` — página com abas
- `public/js/pages/configurador-grupos.js` — mestre-detalhe + modais
- `public/js/pages/configurador-usuarios.js` — filtro + botões segmentados

## Testes
- `tests/acesso-resolver.test.js` — 8 testes
- `tests/acesso-queries.test.js` — 7 testes
- `tests/acesso-routes.test.js` — 10 testes

## Pendências
- Gate efetivo (bloquear ações por permissão) — depende de autenticação
- Mapeamento código aprovador ↔ usuário Supabase auth
- Aba Usuários: layout validado mas sem usuários reais até Supabase auth estar ativo
