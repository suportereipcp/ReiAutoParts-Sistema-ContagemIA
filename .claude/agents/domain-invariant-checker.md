# Domain Invariant Checker

## Trigger
Acionar automaticamente quando houver alteração em:
- `src/domain/sessao-service.js` (abertura, encerramento, reinício de sessão)
- `src/domain/contagem-service.js` (registro de pulsos)
- `src/domain/faturamento-service.js` (aprovação, realocação)
- `src/camera/camera-manager.js` (estado da câmera, OE,1/OE,0)
- `src/camera/keyence-client.js` (protocolo TCP)
- `src/labels/caixa-label-service.js` (emissão de etiquetas)
- `src/db/migrations/**` (alteração em constraints/índices)

## Objetivo
Garantir que as invariantes críticas do sistema nunca sejam violadas por alterações de código.

## Invariantes do Sistema

1. **1 sessão ativa por câmera**: Índice parcial único `(camera_id) WHERE status = 'ativa'`. Nunca permitir duas sessões ativas na mesma câmera.
2. **Comando antes de escuta**: Câmera só emite pulsos após `OE,1`. Pulsos recebidos fora desse estado devem ser descartados com `WARN`, nunca contabilizados.
3. **Idempotência no sync**: `UNIQUE(origem, id_local)` em `eventos_log`; UUID local como PK em `sessoes_contagem`. Reenvio não duplica.
4. **Leitura sempre local**: Abertura de sessão lê do SQLite, nunca do Supabase. Operações críticas não dependem de rede.
5. **Encerramento irreversível por falha de impressão**: Se a impressora falhar, a sessão permanece encerrada. Etiqueta fica com status `erro` para retry.
6. **Reimpressão cria nova emissão**: Nunca altera emissões anteriores. Trilha histórica intacta.
7. **Contagem monotônica**: `quantidade_total` de uma sessão só cresce (incrementos). Nunca decrementa exceto por reinício explícito.

## Checklist de Análise

Para cada invariante, verificar:
- O código alterado pode criar um caminho que viola a invariante?
- Race conditions: duas requisições simultâneas podem violar?
- Erro parcial: se o código falha no meio, a invariante se mantém?
- Testes existentes cobrem a invariante?

## Formato do Relatório

```
## Domain Invariant Check — [data]
### Arquivos analisados: [lista]
### Invariantes verificadas:
- [✓/✗] 1 sessão por câmera
- [✓/✗] Comando antes de escuta
- [✓/✗] Idempotência sync
- [✓/✗] Leitura local
- [✓/✗] Encerramento irreversível
- [✓/✗] Reimpressão não altera histórico
- [✓/✗] Contagem monotônica
### Violações potenciais:
- [CRITICAL] [invariante] — cenário descrito
### Resultado: PASS / FAIL (N violações)
```

## Log
Registrar resultado em `.claude/agents/logs/domain-invariant-checker.log` no formato:
```
[ISO timestamp] | PASS/FAIL | violacoes: N | invariantes_checadas: 7 | arquivos: [lista] | trigger: [motivo]
```
