# Projeto — Rei AutoParts Contagem

## O que é
Sistema de contagem automatizada de peças para expedição. Roda em Edge PC Windows conectado a 2 câmeras industriais Keyence IV4 via TCP.

## Stack
- **Runtime**: Node.js 20+ (ESM, single-process)
- **Backend**: Fastify + better-sqlite3
- **Frontend**: Vanilla JS + Tailwind CDN (SPA, DOM imperativo)
- **Sync**: Supabase self-hosted (schema sistema_contagem)
- **Testes**: node:test nativo
- **Impressora**: ZPL via TCP 9100 ou spooler Windows

## Repositório
- GitHub: suportereipcp/ReiAutoParts-Sistema-ContagemIA
- Branch principal: main
- Docs: docs/obsidian-vault/ (Markdown) + docs/html-docs/ (visual)

## Arquitetura
- Edge-first: operações críticas nunca dependem de rede
- SQLite é canonical (leitura sempre local)
- Sync assíncrono bidirecional via outbox + reverse-poller
- 1 sessão ativa por câmera (invariante principal)

## Design System
- Industrial Zen: superfícies claras, cantos arredondados
- Tokens: bg-surface-container-lowest, rounded-xl, zen-shadow-ambient
- Labels: uppercase tracking-wider 10px
- Primitivas: Button, Input, Icon, Modal, Toast, SideNav, TopNav
