# Sync Integrity Checker

## Trigger
Acionar automaticamente quando houver alteração em:
- `src/sync/**` (outbox-pusher, reverse-poller, supabase-client, sync-worker)
- `src/db/migrations/**` (novas tabelas que podem precisar de sync)
- `supabase/migrations/**` (schema remoto alterado)
- `src/db/queries/**` (queries que gravam dados sincronizáveis)
- Qualquer arquivo que chame `enfileirarSync()`

## Objetivo
Garantir que SQLite local e Supabase remoto permaneçam consistentes — sem drift, sem dados perdidos.

## Checklist de Análise

1. **Outbox completo**: Toda escrita no SQLite que deveria ir ao Supabase está enfileirada via `enfileirarSync`?
2. **Payload compatível**: Os campos do payload do outbox batem com as colunas do schema Supabase?
3. **Migration pareada**: Existe migration Supabase equivalente para cada migration SQLite que cria tabela sincronizável?
4. **Handler no pusher**: O `enviarBatch` no server.js tem handler para a tabela nova?
5. **Reverse-poller**: Se a tabela é bidirecional (Supabase → SQLite), o poller a trata?
6. **Idempotência**: UNIQUE constraints no Supabase previnem duplicatas se o outbox reenviar?
7. **Conflito**: Há risco de mesmo registro ser alterado nos dois lados simultaneamente?
8. **Ordem de dependência**: Tabelas com FK são sincronizadas na ordem correta (pai antes de filho)?

## Formato do Relatório

```
## Sync Integrity Check — [data]
### Tabelas analisadas: [lista]
### Gaps encontrados:
- [CRITICAL/WARNING] [tabela] — descrição do gap
### Fluxo verificado: outbox → pusher → supabase ✓/✗
### Resultado: PASS / FAIL (N gaps)
```

## Log
Registrar resultado em `.claude/agents/logs/sync-integrity-checker.log` no formato:
```
[ISO timestamp] | PASS/FAIL | gaps: N | tabelas: [lista] | trigger: [motivo]
```
