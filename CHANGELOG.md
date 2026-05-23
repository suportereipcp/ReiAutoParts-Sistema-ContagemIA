# Changelog

Todas as mudanças relevantes do Rei AutoParts — Contagens. Versionamento semântico.

## [0.2.0] — 2026-05-23

### Adicionado

- **Modal de câmera desconectada**: ao tentar abrir uma sessão em câmera offline, exibe um aviso vermelho centralizado por 3s ("Dispositivo desconectado!" + orientação + contato com Liderança/PCP), com barra de progresso. (`public/js/pages/iniciar-sessao.js`)
- **Identidade visual**: título da aba "Rei AutoParts - Contagens", favicon próprio (`favicon.svg` com `icon.png` embutido em fundo branco) e logo completa (`logo.png`) centralizada na sidebar. (`public/index.html`, `public/favicon.svg`, `public/js/ui/primitives/sidenav.js`)
- **Indicadores de conectividade** no topo: Internet (via `navigator.onLine`) e Supabase (via estado do Sync Worker), com glifos SVG, brilho/animação em loop quando conectado e estados visuais distintos para offline (vermelho + corte) e recuperando (âmbar + giro). Respeita `prefers-reduced-motion`. (`public/js/ui/composites/indicadores-conexao.js`, `public/css/tokens.css`, `public/js/app.js`)

### Documentado (planejado)

- **Configurador de Acessos** (substitui Aprovadores): grupos de acesso, catálogo de atividades por página, concessão/revogação individual e importação dos usuários do Supabase. Decisões de modelo fechadas; aba "Usuários" e mapeamento código↔usuário em aberto. Ver `docs/superpowers/specs/2026-05-23-configurador-acessos-design.md`.

### Infraestrutura

- `.gitignore`: ignora `.superpowers/` (companion visual de brainstorm) e `.playwright-mcp/` (artefatos de teste).

## [0.1.0]

- Base do sistema edge-first de contagem: HTTP/Fastify, WebSocket Hub, SQLite + migrations, Camera Manager (Keyence IV4 TCP), Sync Worker (Supabase), etiquetas ZPL, relatórios e fluxo de cargas/sessões/caixas.
