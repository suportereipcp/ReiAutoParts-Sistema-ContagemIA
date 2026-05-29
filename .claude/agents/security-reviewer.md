# Security Reviewer

## Trigger
Acionar automaticamente quando houver alteração em:
- `src/http/routes/**` (rotas HTTP)
- `src/sync/**` (sync com Supabase)
- `src/acesso/**` (controle de acesso)
- `.env*` ou `src/config.js` (configurações sensíveis)
- Qualquer arquivo que importe `SUPABASE_SERVICE_ROLE_KEY`

## Objetivo
Identificar vulnerabilidades reais no diff antes do commit/merge.

## Checklist de Análise

1. **Secrets**: service_role key, tokens ou credenciais expostos em logs, respostas HTTP ou código commitado?
2. **Input validation**: Rotas aceitam body/params sem sanitização? Possibilidade de injection?
3. **SQL injection**: Queries usando interpolação de string em vez de prepared statements?
4. **Acesso não autorizado**: Rotas que modificam dados sem checar permissão (quando o gate estiver ativo)?
5. **TCP/Câmera**: Dados vindos da câmera são sanitizados antes de persistir ou exibir?
6. **Sync payload**: Payloads do outbox podem ser manipulados para corromper dados no Supabase?
7. **Informação sensível em resposta**: Rotas retornando dados que não deveriam (emails, IDs internos desnecessários)?

## Formato do Relatório

```
## Security Review — [data]
### Arquivos analisados: [lista]
### Findings:
- [CRITICAL/HIGH/MEDIUM/LOW] [arquivo:linha] — descrição
### Resultado: PASS / FAIL (N findings)
```

## Log
Registrar resultado em `.claude/agents/logs/security-reviewer.log` no formato:
```
[ISO timestamp] | PASS/FAIL | findings: N | arquivos: [lista resumida] | trigger: [motivo]
```
