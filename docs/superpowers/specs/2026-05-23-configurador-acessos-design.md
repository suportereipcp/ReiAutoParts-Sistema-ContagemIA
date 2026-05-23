# Configurador de Acessos (Grupos, Atividades e Usuários) — Design

> **Status:** em brainstorm (decisões de modelo fechadas; layout da aba "Usuários" e mapeamento código↔usuário ainda em aberto). Documento vivo — ver "Pontos em Aberto".

## Objetivo

Substituir a página **Aprovadores** por um **Configurador de Acessos** que permite:

1. Criar **grupos de acesso** e definir quais **atividades** (telas/ações que gravam no banco) cada grupo concede.
2. Importar os **usuários** do Supabase (autenticação) e atribuir grupos a eles.
3. Conceder ou revogar **atividades individuais** por usuário — inclusive um serviço isolado, mesmo que ele não esteja no grupo que o contém (e o inverso: revogar um serviço que o grupo dele concede).

A lista atual de aprovadores de faturamento é **absorvida** pela atividade `sessao.aprovar` do novo modelo.

## Contexto Atual

- A página atual `public/js/pages/gestao-aprovadores.js` cadastra/desativa aprovadores via `faturamentoSvc` (tabela local `aprovadores`). A aprovação de faturamento valida um `codigo` presente nessa lista.
- Os **usuários de autenticação** vivem no Supabase **self-hosted** (`https://supabase.pcpsuporterei.site`), acessível apenas pelo **backend** (que já usa `SUPABASE_SERVICE_ROLE_KEY` desse host para o sync). A integração via MCP aponta para outro projeto (cloud, inativo) e **não** serve.
- Catálogos como `operadores`/`embarques` já chegam via **reverse-poller** (Supabase → SQLite). Dados gerados no app (sessões, eventos) vão ao Supabase via **outbox**.
- **Sem página de login ainda.** Esta entrega cria a **cara e a lógica dos botões**; a aplicação efetiva do gate (bloquear ações por permissão) fica para quando houver autenticação.

## Decisões

- **Granularidade híbrida:** a **página** agrupa visualmente; a **atividade** é a unidade de fato controlada. (Opção C do brainstorm.)
- **Resolução de permissões:** `efetivo(usuário) = (união das atividades dos grupos ∪ concessões individuais) − revogações individuais`. **Revogação vence.**
- **Multi-grupo:** um usuário pode pertencer a vários grupos (acumula por união).
- **Persistência:** SQLite **canonical** + **sync** para o Supabase (`sistema_contagem`) via outbox, no mesmo padrão de sessões/eventos. Os **usuários** são cache read-only puxado do Supabase auth pelo backend (direção reversa, como operadores).
- **Configurador substitui Aprovadores totalmente:** item de menu "Aprovadores" vira "Configurador". A aprovação de faturamento passa a checar a atividade `sessao.aprovar`.
- **Catálogo de atividades é definido em código** (fonte da verdade, evita drift). As tabelas guardam apenas referências aos `id`s das atividades.

## Fora de Escopo (por enquanto)

- Sistema de autenticação / página de login.
- **Aplicação efetiva** do gate de permissões nas telas (esta entrega só persiste a config e expõe a UI/lógica).
- Execução de migrações Supabase via código (apenas escrever os arquivos em `supabase/migrations/`).

## Catálogo de Atividades (em código)

Organizado por página (`pagina` → atividades). `id` estável, `rotulo` exibível.

| Página | `id` | Rótulo |
|---|---|---|
| Cargas | `carga.criar` | Criar carga |
| Cargas | `carga.finalizar` | Finalizar carga (faturar) |
| Sessões | `sessao.abrir` | Abrir sessão |
| Sessões | `sessao.encerrar` | Encerrar sessão |
| Sessões | `sessao.reiniciar_contagem` | Reiniciar contagem |
| Sessões | `sessao.reiniciar` | Reiniciar/cancelar sessão |
| Sessões | `sessao.aprovar` | Aprovar sessão (faturamento) |
| Sessões | `sessao.realocar` | Realocar sessão |
| Etiquetas | `etiqueta.reimprimir` | Reimprimir etiqueta (única) |
| Etiquetas | `etiqueta.reimprimir_massa` | Reimpressão em massa |
| Relatórios | `relatorio.emitir` | Emitir relatório |
| Eventos | `eventos.visualizar` | Visualizar eventos |
| Configurador | `configurador.gerenciar` | Gerenciar acessos |

## Modelo de Dados

Migrações SQLite locais novas; equivalentes Supabase em `supabase/migrations/` (não aplicadas via código).

### `acesso_grupos`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | TEXT PK | uuid |
| `nome` | TEXT UNIQUE NOT NULL | nome do grupo |
| `descricao` | TEXT | opcional |
| `criado_em` / `atualizado_em` | TEXT | ISO |

### `acesso_grupo_atividades` (atividades concedidas por grupo)
| Coluna | Tipo |
|---|---|
| `grupo_id` | TEXT FK → acesso_grupos |
| `atividade_id` | TEXT (ref. catálogo em código) |
| PK | (`grupo_id`, `atividade_id`) |

### `acesso_usuarios` (cache read-only do Supabase auth)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | TEXT PK | uuid do usuário no Supabase |
| `email` | TEXT | |
| `nome` | TEXT | de `raw_user_meta_data->>'name'` |
| `sincronizado_em` | TEXT | ISO |

### `acesso_usuario_grupos`
| Coluna | Tipo |
|---|---|
| `usuario_id` | TEXT FK → acesso_usuarios |
| `grupo_id` | TEXT FK → acesso_grupos |
| PK | (`usuario_id`, `grupo_id`) |

### `acesso_usuario_overrides` (concessão/revogação individual)
| Coluna | Tipo | Descrição |
|---|---|---|
| `usuario_id` | TEXT FK | |
| `atividade_id` | TEXT | ref. catálogo |
| `efeito` | TEXT CHECK (`conceder`,`revogar`) | |
| PK | (`usuario_id`, `atividade_id`) | |

Sincronizam para o Supabase via `enfileirarSync` (exceto `acesso_usuarios`, que é cache da direção reversa).

## Backend (rotas, read-first)

- `GET /acesso/catalogo` — catálogo de atividades (em código).
- `GET /acesso/usuarios` — usuários do Supabase auth (cacheados); refresca do self-hosted via service_role.
- `GET /acesso/grupos` · `POST /acesso/grupos` · `PATCH /acesso/grupos/:id` · `DELETE /acesso/grupos/:id`.
- `PUT /acesso/grupos/:id/atividades` — define as atividades do grupo.
- `GET /acesso/usuarios/:id/acesso` — grupos + overrides + **efetivo** resolvido.
- `PUT /acesso/usuarios/:id/grupos` — define grupos do usuário.
- `PUT /acesso/usuarios/:id/overrides` — define concessões/revogações individuais.

A leitura dos usuários do Supabase usa a conexão self-hosted que já existe (a chave nunca sai do Edge PC).

## UI

- Nova página `public/js/pages/configurador.js` substitui `gestao-aprovadores.js`; item de menu renomeado para **Configurador** (ícone `admin_panel_settings`/`tune`).
- **Abas:** `Grupos de Acesso` | `Usuários`.
- **Aba Grupos (validada):** mestre-detalhe — lista de grupos à esquerda (+ Novo grupo); à direita o editor com nome, ações (Renomear/Excluir/Salvar) e a **árvore de atividades** por página com toggles on/off.
- **Aba Usuários (a desenhar):** lista dos usuários do Supabase; por usuário, atribuir grupos (multi), conceder/revogar atividades individuais e visualizar o acesso **efetivo**.
- Mantém o estilo zen do app (superfícies claras, cantos arredondados, tokens existentes).

## Migração do Faturamento (fase controlada)

A aprovação de faturamento (`modal-aprovar-sessao.js` + `faturamento-service`) passa a checar a atividade `sessao.aprovar` em vez da tabela `aprovadores`. Para não quebrar o fluxo atual, os aprovadores existentes são migrados (ex.: um grupo "Faturamento" com `sessao.aprovar`). **Risco:** o `codigo` de aprovador precisa mapear para um usuário do Supabase — ver Pontos em Aberto.

## Pontos em Aberto

1. **Layout da aba "Usuários"** — ainda não desenhado/validado no companion visual.
2. **Mapeamento `codigo` (aprovador/operador) ↔ usuário do Supabase auth** — hoje a aprovação valida por `codigo`; os usuários do auth têm uuid/email. Definir como casar os dois antes de migrar o gate de faturamento.
3. **Quando aplicar o gate de verdade** — depende da futura autenticação.
