---
tags:
  - documentacao
  - fontes
atualizado_em: 2026-04-22
---

# Catalogo de Fontes

Leitura consolidada das fontes encontradas no repositorio e classificadas neste vault.

| Fonte original | Tipo | Nota destino | Observacoes |
|---|---|---|---|
| `README.md` | resumo executivo | [[01 - Visao Geral/Sistema e Objetivo]] | visao curta do sistema |
| `ARQUITETURA.md` | arquitetura tecnica | [[02 - Arquitetura/Arquitetura Edge-First]] | documento tecnico central do MVP |
| `estrutura_sistema.md` | arquitetura conceitual | [[02 - Arquitetura/Arquitetura Edge-First]] | reforca edge computing e tolerancia a falha |
| `DEVELOPER_CONTEXT.md` | contexto inicial | [[01 - Visao Geral/Sistema e Objetivo]] | tem informacoes historicas e algumas premissas antigas |
| `scripts_automacao.md` | automacao Windows | [[03 - Operacao/Automacao e Kiosk]] | conceito util, mas contem porta e nome de script antigos |
| `manual.pdf` | manual Keyence IV4 | [[03 - Operacao/Integracao Keyence IV4]] | referencia de TCP/IP, comandos e respostas |
| `docs/checklist-e2e.md` | checklist operacional | [[03 - Operacao/Checklist E2E]] | status misto, com itens concluidos e pendentes |
| `AGENTS.md` | guia para Codex | [[04 - Desenvolvimento/Contexto para Agentes]] | replica quase integral de `CLAUDE.md` |
| `CLAUDE.md` | guia para Claude Code | [[04 - Desenvolvimento/Contexto para Agentes]] | mesma base de arquitetura e comandos |
| `docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md` | especificacao | [[05 - Planejamento/Especificacao do MVP]] | referencia canonica do design do MVP |
| `docs/superpowers/plans/2026-04-17-sistema-contagem-rei-autoparts.md` | plano de implementacao | [[05 - Planejamento/Plano de Implementacao]] | plano detalhado do backend + operacao |
| `docs/superpowers/plans/2026-04-20-frontend-industrial-zen.md` | plano de frontend | [[05 - Planejamento/Plano Frontend Industrial Zen]] | migracao para SPA Industrial Zen |
| `stitch_sistema_contagem_rei_autoparts/industrial_zen/DESIGN.md` | design system | [[05 - Planejamento/Design System Industrial Zen]] | base visual do frontend |

## Notas de classificacao

- `ARQUITETURA.md`, `AGENTS.md` e a spec do MVP convergem no modelo atual do sistema.
- `DEVELOPER_CONTEXT.md` e `scripts_automacao.md` ajudam a entender a origem do projeto, mas trazem detalhes anteriores ao estado atual.
- `manual.pdf` foi resumido como nota operacional para consulta rapida no Obsidian.
