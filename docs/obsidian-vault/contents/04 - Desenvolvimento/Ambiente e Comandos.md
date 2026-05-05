---
tags:
  - desenvolvimento
  - comandos
  - ambiente
fontes:
  - package.json
  - AGENTS.md
  - README.md
atualizado_em: 2026-04-22
---

# Ambiente e Comandos

## Stack consolidada

- Node.js 20+;
- Fastify + WebSocket + static files;
- better-sqlite3;
- Supabase JS client;
- pdfkit + exceljs;
- testes com `node:test`.

## Scripts principais

```bash
npm run dev
npm start
npm test
npm run test:watch
npm run fake-keyence
npm run ping-keyence
```

## Variaveis obrigatorias destacadas

```env
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CAMERA_1_IP=
CAMERA_2_IP=
```

Complementos aparecem em `.env.example`. O `.env` esta no `.gitignore` e nao deve ser commitado.

## Estrutura tecnica relevante

| Caminho | Papel |
|---|---|
| `src/` | backend e integracoes |
| `public/` | frontend servido sem build step |
| `scripts/` | utilitarios operacionais |
| `tests/` | testes com `node:test` |
| `supabase/migrations/` | migrations manuais do Postgres |
| `data/` | banco SQLite local |

## Observacoes de trabalho

- a UI e servida localmente pelo Fastify;
- a TV usa a mesma aplicacao em outra rota;
- o projeto e Windows-first no Edge PC, mas o backend e Node puro.
