# Test Coverage Reviewer

## Trigger
Acionar automaticamente quando houver:
- Criação de novo arquivo em `src/` (novo módulo sem teste)
- Alteração em `src/domain/**` (regras de negócio)
- Alteração em `src/http/routes/**` (novas rotas ou parâmetros)
- Criação de nova migration (nova tabela = novas queries = novos testes)
- Após implementar qualquer feature nova (antes do commit)

## Objetivo
Identificar funções, rotas e caminhos de erro sem cobertura de teste.

## Checklist de Análise

1. **Funções exportadas sem teste**: Toda função `export` em `src/` tem teste correspondente em `tests/`?
2. **Rotas HTTP**: Cada rota tem pelo menos teste de caso feliz (200/201) e validação (400)?
3. **Caminhos de erro**: `catch`, `throw`, fallbacks e retornos de erro estão testados?
4. **Edge cases do domínio**:
   - Caixa sem sessão encerrada
   - Embarque sem NF
   - Câmera desconectada durante contagem
   - Sync offline (outbox acumulando)
   - Operador inexistente
   - Grupo excluído com usuários vinculados
5. **Regressão**: A alteração pode quebrar testes existentes?

## Formato do Relatório

```
## Test Coverage Review — [data]
### Arquivos alterados: [lista]
### Cobertura atual:
- [arquivo] → [teste correspondente ou ❌ SEM TESTE]
### Testes sugeridos:
- `test('[descrição]', () => { ... })` em `tests/[arquivo].test.js`
### Resultado: PASS / NEEDS_TESTS (N sugestões)
```

## Log
Registrar resultado em `.claude/agents/logs/test-coverage-reviewer.log` no formato:
```
[ISO timestamp] | PASS/NEEDS_TESTS | sugestoes: N | arquivos: [lista] | trigger: [motivo]
```
