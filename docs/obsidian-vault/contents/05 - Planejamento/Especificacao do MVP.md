---
tags:
  - planejamento
  - mvp
  - spec
fontes:
  - docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md
atualizado_em: 2026-04-22
---

# Especificacao do MVP

## Papel deste documento

Esta e a especificacao consolidada do MVP. Ela conecta objetivo de negocio, topologia, modelo de dados, API, Keyence, sync e criterios de sucesso.

## Pilares definidos na spec

- edge-first com cloud eventual;
- duas cameras Keyence IV4;
- sessao em duas etapas: dados operacionais e depois programa da camera;
- armazenamento local com outbox;
- reverse poller para embarques, OPs e operadores;
- sincronizacao idempotente com Supabase.

## Criterios de sucesso registrados

1. sessao aberta em menos de 30 segundos;
2. atualizacao visual em menos de 300 ms;
3. operacao offline preservada;
4. zero perda de dados;
5. bloqueio de caixa duplicada.

## Componentes descritos

- `config`, `db`, `camera`, `domain`, `sync`, `http`, `shared`;
- REST + WebSocket no Edge PC;
- SQLite como banco operacional;
- Supabase como destino de consolidacao.

## Itens de governanca

- nenhuma function, trigger ou policy extra no banco sem discussao;
- leitura de sessao sempre no cache local;
- suporte explicito ao fluxo `PW -> CTR -> OE`.
