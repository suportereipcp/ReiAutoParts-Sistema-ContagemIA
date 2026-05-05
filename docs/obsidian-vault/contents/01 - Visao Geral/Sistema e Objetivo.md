---
tags:
  - visao-geral
  - produto
fontes:
  - README.md
  - DEVELOPER_CONTEXT.md
  - AGENTS.md
  - docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md
atualizado_em: 2026-04-22
---

# Sistema e Objetivo

## O que o sistema faz

O Sistema de Contagem Rei AutoParts automatiza a contagem de pecas durante embarques usando duas cameras Keyence IV4-600CA. A operacao roda em um Edge PC Windows, com baixa latencia local e sincronizacao assincrona com o Supabase.

## Objetivo operacional

- substituir conferencia manual por contagem assistida por camera;
- manter o operador trabalhando mesmo sem internet;
- exibir contagem em tempo real no Monitor 1 e na TV kiosk;
- garantir que toda sessao local seja sincronizada depois com a nuvem;
- evitar duplicidade de caixa e conflito de camera ativa.

## Modelo atual consolidado

- runtime: Node.js 20 em ESM;
- arquitetura: monolito single-process;
- banco local: SQLite;
- cloud: Supabase self-hosted, schema `sistema_contagem`;
- UI: HTML/CSS/JS vanilla servidos localmente por Fastify;
- hardware: 2 cameras Keyence + 2 monitores.

## Atores do sistema

| Ator | Papel |
|---|---|
| Operador | abre, acompanha e encerra sessoes |
| Edge PC | concentra backend, banco local e dashboards |
| Camera Keyence | detecta peca e emite pulsos TCP |
| TV kiosk | exibe feedback visual em tempo real |
| Supabase | consolida sessoes e eventos do chao de fabrica |
| ERP/PCP | alimenta embarques, OPs e operadores |

## Criterios de sucesso do MVP

1. abrir uma sessao em menos de 30 segundos;
2. refletir o pulso da camera na TV em menos de 300 ms;
3. continuar contando offline;
4. nao perder dados gerados localmente;
5. bloquear reutilizacao indevida do numero de caixa.

## Fora de escopo declarado

- autenticacao formal de operador;
- multi-tenant;
- failover do Edge PC;
- BI externo;
- expansao da UI alem de duas cameras no MVP.

## Proxima leitura

- [[02 - Arquitetura/Arquitetura Edge-First]]
- [[02 - Arquitetura/Fluxos Operacionais]]
- [[03 - Operacao/Integracao Keyence IV4]]
