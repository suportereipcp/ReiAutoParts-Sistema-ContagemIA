---
tags:
  - planejamento
  - frontend
  - industrial-zen
fontes:
  - docs/superpowers/plans/2026-04-20-frontend-industrial-zen.md
atualizado_em: 2026-04-22
---

# Plano Frontend Industrial Zen

## Objetivo

Substituir o MVP inicial por uma SPA baseada no design system Industrial Zen, reaproveitando as telas do diretorio `stitch_sistema_contagem_rei_autoparts/`.

## Estrutura planejada

- camada `infra` para API, WS, router e formatadores;
- camada `domain` para sync state, sessoes e catalogos;
- `ui/primitives` para componentes base;
- `ui/composites` para modais e cartoes;
- `pages/` para dashboard, cargas, relatorios, eventos e TV.

## Paginas destacadas no plano

- dashboard principal;
- selecao de carga;
- modal de nova carga;
- detalhes da carga;
- emissao de relatorios;
- eventos e logs;
- TV redesign.

## Leitura pratica

Este plano e util para entender a direcao da UI e as dependencias entre modulos de frontend, mas nao e a melhor fonte para arquitetura do backend.

Veja tambem:

- [[05 - Planejamento/Design System Industrial Zen]]
- [[03 - Operacao/Checklist E2E]]
