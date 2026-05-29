# Decisões Técnicas

## Controle de Acesso (2026-05-29)
- Granularidade híbrida: página agrupa visualmente, atividade é a unidade controlada
- Resolução: efetivo = (união grupos ∪ concessões) − revogações. Revogação vence.
- Multi-grupo: usuário pode pertencer a vários grupos
- Catálogo de atividades definido em código (não no banco)
- Usuários são cache read-only do Supabase auth
- Configurador substitui Aprovadores no sidenav (rota antiga mantida por compatibilidade)

## Etiquetas ZPL (2026-05-29)
- Dimensões: 100×70mm @ 203 DPI = 799×559 dots
- Layout 3 faixas: topo (produto/OP), meio (dados operacionais), rodapé (QR + paginação)
- QR payload: JSON compacto {e, cx, op, qt, seq}
- Paginação automática quando linhas excedem LABEL_LINES_PER_PART

## Sync Supabase
- Outbox pattern: grava local primeiro, enfileira para push assíncrono
- Tabelas de acesso sincronizam via outbox (exceto acesso_usuarios que é cache reverso)
- Reverse poller traz embarques, OPs, operadores a cada 30s

## Frontend
- Sem framework: vanilla JS + Tailwind CDN
- Modais via primitiva Modal (não prompt/confirm nativo)
- Filtros de busca em listas longas (ex: usuários)
- Botões segmentados para estados ternários (herdar/conceder/revogar)
