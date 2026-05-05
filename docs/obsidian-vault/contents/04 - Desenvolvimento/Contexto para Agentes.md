---
tags:
  - desenvolvimento
  - agentes
  - llm
fontes:
  - AGENTS.md
  - CLAUDE.md
atualizado_em: 2026-04-22
---

# Contexto para Agentes

## O que esses arquivos fazem

`AGENTS.md` e `CLAUDE.md` orientam agentes de codigo sobre como trabalhar neste repositorio. Na pratica, os dois documentos carregam quase o mesmo conteudo.

## Informacoes principais repetidas neles

- o sistema e Node.js 20, ESM, single-process e edge-first;
- o banco local e SQLite;
- o schema cloud e `sistema_contagem`;
- a integracao com camera usa TCP na porta `8500`;
- o frontend e vanilla servido de `public/`, sem build step;
- testes usam `node:test`.

## Invariantes que um agente nao deve quebrar

- 1 sessao ativa por camera;
- leitura operacional sempre local;
- idempotencia no sync;
- nao depender da rede para a operacao critica;
- nao tratar pulso como valido antes de `OE,1`.

## Uso recomendado desta nota

Consulte esta nota quando for:

- onboardar alguem no repositorio;
- alinhar automacoes de desenvolvimento;
- entender rapidamente as restricoes antes de alterar backend, sync ou integracao com hardware.
