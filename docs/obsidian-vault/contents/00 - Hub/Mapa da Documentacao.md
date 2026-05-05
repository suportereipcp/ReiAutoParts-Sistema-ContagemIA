---
tags:
  - documentacao
  - mapa
  - obsidian
atualizado_em: 2026-04-22
---

# Mapa da Documentacao

Este vault organiza a documentacao do sistema em cinco blocos:

1. visao geral do produto e do objetivo operacional;
2. arquitetura do Edge PC, fluxo de dados e sincronizacao;
3. operacao de campo, integracao com a camera e checklist;
4. ambiente de desenvolvimento e contexto para agentes;
5. historico de especificacao e planejamento.

## Comece por aqui

- [[01 - Visao Geral/Sistema e Objetivo]]
- [[02 - Arquitetura/Arquitetura Edge-First]]
- [[02 - Arquitetura/Fluxos Operacionais]]
- [[02 - Arquitetura/Dados e Sincronizacao]]

## Operacao e hardware

- [[03 - Operacao/Integracao Keyence IV4]]
- [[03 - Operacao/Checklist E2E]]
- [[03 - Operacao/Automacao e Kiosk]]

## Desenvolvimento

- [[04 - Desenvolvimento/Ambiente e Comandos]]
- [[04 - Desenvolvimento/Contexto para Agentes]]

## Referencias de codigo

- [[06 - Referencias de Codigo/Mapa do Codigo]]
- [[06 - Referencias de Codigo/Backend/Bootstrap, Config e Runtime]]
- [[06 - Referencias de Codigo/Backend/Banco Local, Queries e Migrations]]
- [[06 - Referencias de Codigo/Backend/Camera Keyence e Programas]]
- [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]]
- [[06 - Referencias de Codigo/Backend/HTTP, WebSocket e Relatorios]]
- [[06 - Referencias de Codigo/Backend/Sync e Supabase]]
- [[06 - Referencias de Codigo/Frontend/Shell SPA, TV e Navegacao]]
- [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]]
- [[06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes]]
- [[06 - Referencias de Codigo/Operacao/Scripts e Boot Local]]
- [[06 - Referencias de Codigo/Testes/Mapa de Cobertura]]

## Planejamento e historico

- [[05 - Planejamento/Especificacao do MVP]]
- [[05 - Planejamento/Plano de Implementacao]]
- [[05 - Planejamento/Plano Frontend Industrial Zen]]
- [[05 - Planejamento/Design System Industrial Zen]]

## Fontes originais

- [[00 - Hub/Catalogo de Fontes]]

## Perguntas rapidas

| Pergunta | Nota |
|---|---|
| O que este sistema faz? | [[01 - Visao Geral/Sistema e Objetivo]] |
| Como a arquitetura foi desenhada? | [[02 - Arquitetura/Arquitetura Edge-First]] |
| Como funciona o fluxo do operador? | [[02 - Arquitetura/Fluxos Operacionais]] |
| Onde estao SQLite, outbox e sync? | [[02 - Arquitetura/Dados e Sincronizacao]] |
| Quais comandos TCP da Keyence importam? | [[03 - Operacao/Integracao Keyence IV4]] |
| Como validar antes da producao? | [[03 - Operacao/Checklist E2E]] |
| Como abrir operador + TV no Windows? | [[03 - Operacao/Automacao e Kiosk]] |
| Quais scripts e variaveis devo usar? | [[04 - Desenvolvimento/Ambiente e Comandos]] |
| Onde a IA deve olhar antes de abrir o codigo? | [[06 - Referencias de Codigo/Mapa do Codigo]] |

## Leitura consolidada

Pontos que aparecem repetidamente nas fontes e formam a base do sistema:

- edge-first: a operacao critica nunca depende da internet;
- monolito Node.js 20, single-process, com SQLite local;
- duas cameras Keyence IV4-600CA conectadas por TCP na porta 8500;
- duas interfaces locais: operador e TV kiosk;
- sincronizacao assincrona com Supabase no schema `sistema_contagem`;
- regra de ouro: uma sessao ativa por camera.
