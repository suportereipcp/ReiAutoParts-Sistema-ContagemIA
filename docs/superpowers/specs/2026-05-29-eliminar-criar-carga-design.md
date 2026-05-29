# Eliminar "Criar Carga" — Iniciar Sessão Direto do Embarque

**Data:** 2026-05-29  
**Status:** Aprovado  
**Abordagem:** Refactor mínimo (A)

---

## Contexto

O fluxo atual exige que o operador clique "Nova Carga" ou "Nova Contagem" para abrir uma sessão de contagem vinculada a um embarque. Isso é redundante porque os embarques já existem no Supabase e são sincronizados localmente. Todo embarque sem nota fiscal preenchida está "em aberto" e pode receber sessão de contagem.

## Objetivo

Eliminar os botões "Nova Carga" e "Nova Contagem" do header. Permitir iniciar sessão diretamente da lista de embarques abertos (botão na linha) ou de dentro da página de detalhes do embarque.

---

## Mudanças na Tabela de Embarques Abertos

### Nova coluna "Status"

| Valor | Badge | Condição |
|---|---|---|
| Disponível | Verde | Nenhuma sessão ativa nesse embarque |
| Em contagem · Câmera X | Amarelo | Sessão ativa na câmera X, há câmera livre |
| Em contagem · Câmera 1, 2 | Amarelo | Todas as câmeras ocupadas |

### Botão "Iniciar Contagem" na linha

- Aparece ao lado do botão "Detalhes" existente
- Habilitado quando há pelo menos 1 câmera livre
- Não aparece quando todas as câmeras estão ocupadas
- Se o operador clicar na linha de um embarque sem câmera livre → toast vermelho centralizado (2s): "Nenhuma câmera disponível para nova sessão"

### Header simplificado

- Remove botão "Nova Carga"
- Remove botão "Nova Contagem"
- Quando lista de embarques abertos está vazia: mostra aviso "Nenhum embarque disponível, aguarde sincronização"

---

## Modal "Iniciar Sessão"

### Acionado da linha da tabela

Campos:
- **Embarque** — pré-preenchido, read-only
- **OP** — select
- **Operador** — select
- **Câmera** — select (só câmeras livres; se só 1 livre, pré-selecionada)

### Acionado da página de detalhes

Campos:
- **OP** — select
- **Operador** — select
- **Câmera** — select (só câmeras livres; se só 1 livre, pré-selecionada)

Embarque não aparece (implícito no contexto).

### Comportamento

- Título: "Iniciar Contagem" (ícone `play_arrow`)
- Confirmar: botão "Iniciar" (variante primary)
- Cancelar: botão "Cancelar" (variante text)
- Ao confirmar → `POST /sessoes` → fecha modal → atualiza via WebSocket
- Erro → mensagem inline no modal

---

## Mudanças na Página de Detalhes

- Botão "Iniciar Contagem" no header (variante primary, ícone `play_arrow`)
- Só aparece se embarque aberto (sem NF) e há câmera livre
- Se todas as câmeras ocupadas → no lugar do botão, badge "Todas as câmeras em uso"
- Card/banner de sessão ativa: "Sessão ativa · Câmera X · Operador Y · iniciada há Z min"

---

## Toast de Erro (câmera indisponível)

- Centralizado na tela
- Fundo vermelho, texto branco
- Mensagem: "Nenhuma câmera disponível para nova sessão"
- Duração: 2 segundos
- Componente reutilizável (`toast-erro.js`)

---

## Componentes

### Reutilizado (adaptado)

- `modal-nova-contagem-carga-aberta.js` → renomeado para `modal-iniciar-sessao.js`
- Parâmetro opcional `numeroEmbarque` — se presente, oculta campo embarque
- Filtra câmeras para mostrar só as livres (`GET /cameras`)

### Removido

- Botão "Nova Carga" do header (`selecao-carga.js`)
- Botão "Nova Contagem" do header (`selecao-carga.js`)
- Página `iniciar-sessao.js` (rota `#/sessoes/nova`)
- Rota `#/cargas/:numero/nova-sessao`

### Novo

- `toast-erro.js` — toast centralizado vermelho, 2s, reutilizável
- Coluna "Status" com badges verde/amarelo
- Lógica de câmeras livres por embarque (sessões ativas agrupadas por câmera)

---

## Backend

Sem mudanças. `POST /sessoes` e validações em `sessao-service.js` permanecem iguais. A lógica de "câmera disponível" é resolvida no frontend via `GET /cameras`.

---

## Fora de escopo

- Mudanças no sync worker / reverse poller
- Alterações no schema SQLite ou Supabase
- Mudanças na aba "Cargas Expedidas"
