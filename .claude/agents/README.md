# Agents — Rei AutoParts Contagem

## O que são

Subagents especializados que revisam código automaticamente com base em triggers definidos. Cada agent tem um foco específico e produz um relatório padronizado.

## Agents disponíveis

| Agent | Foco | Trigger principal |
|---|---|---|
| `security-reviewer` | Vulnerabilidades, secrets, injection | Alteração em rotas, sync, config |
| `sync-integrity-checker` | Consistência SQLite ↔ Supabase | Alteração em sync, migrations, queries |
| `test-coverage-reviewer` | Funções/rotas sem teste | Novo módulo, nova feature |
| `zpl-validator` | Etiquetas ZPL corretas | Alteração no renderer ou config de etiqueta |
| `domain-invariant-checker` | Invariantes críticas do sistema | Alteração em domain, camera, labels |

## Modo de Operação

Os agents podem operar em dois modos:

### `auto` (padrão)
Agents são acionados automaticamente quando arquivos do trigger são alterados, antes do commit.

### `manual`
Agents só rodam quando invocados explicitamente no chat. Triggers são ignorados.

### Configuração atual

```yaml
mode: auto  # auto | manual
```

### Como alternar

No chat:
- **"desativa agents"** ou **"agents modo manual"** → muda para `manual`
- **"ativa agents"** ou **"agents modo auto"** → muda para `auto`
- **"status agents"** → mostra modo atual

### Controle por agent individual

Também é possível desativar agents específicos:

```yaml
agents:
  security-reviewer: auto
  sync-integrity-checker: auto
  test-coverage-reviewer: manual
  zpl-validator: auto
  domain-invariant-checker: auto
```

No chat:
- **"desativa test-coverage-reviewer"** → só esse vira manual
- **"ativa todos"** → todos voltam para auto

## Como funciona

1. **Trigger automático** (modo `auto`): Ao alterar arquivos listados no trigger do agent, ele é acionado antes do commit
2. **Análise**: O agent segue seu checklist e analisa o diff/código
3. **Relatório**: Resultado formatado é exibido no chat
4. **Log**: Resultado resumido é registrado em `.claude/agents/logs/<agent>.log`

## Logs

Os logs ficam em `.claude/agents/logs/` no formato:
```
[ISO timestamp] | PASS/FAIL | métrica: N | arquivos: [...] | trigger: [motivo]
```

Útil para:
- Histórico de revisões
- Identificar padrões de falha recorrentes
- Auditoria de qualidade ao longo do tempo

## Como invocar manualmente

Basta pedir no chat:
- "roda o security-reviewer"
- "verifica integridade do sync"
- "valida o ZPL"
- "checa invariantes do domínio"
- "revisa cobertura de testes"

