# Agents (Subagents)

## Status: Configurado (2026-05-29)

## Localização
- `.claude/agents/` — definições dos agents
- `.claude/agents/config.json` — modo auto/manual por agent
- `.claude/agents/logs/` — histórico de execuções

## Agents Disponíveis

| Agent | Trigger |
|---|---|
| security-reviewer | Rotas HTTP, sync, config, acesso |
| sync-integrity-checker | Sync, migrations, queries com enfileirarSync |
| test-coverage-reviewer | Novo módulo em src/, features novas |
| zpl-validator | Renderer ZPL, config de etiqueta |
| domain-invariant-checker | Sessão, contagem, câmera, faturamento, labels |

## Modos
- `auto` — acionados automaticamente por trigger antes do commit
- `manual` — só rodam quando invocados no chat

## Comandos do Usuário
- "desativa agents" → modo manual global
- "ativa agents" → modo auto global
- "desativa [nome]" → modo manual para agent específico
- "status agents" → mostra config atual
