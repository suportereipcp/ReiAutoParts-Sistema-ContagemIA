# Configurador de Cameras — Mapeamento de Slots

**Data:** 2026-05-29
**Status:** Aprovado
**Abordagem:** Tabela SQLite + API dedicada (A)

---

## Contexto

O modal "Iniciar Contagem" exibe botoes de camera (1-4). Hoje a ordem e fixa (camera_id = slot). O Configurador precisa de uma aba para definir qual camera vai em qual slot e dar labels opcionais. A fonte de verdade dos IPs continua no .env; esta config so define ordem e labels.

## Objetivo

Permitir que o admin configure, via UI no Configurador, qual botao (slot 1-4) corresponde a qual camera e qual label exibir como tooltip.

---

## Tabela SQLite

Tabela: cameras_config

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| slot | INTEGER PK | Posicao do botao (1-4) |
| camera_id | INTEGER NOT NULL UNIQUE | ID da camera no sistema |
| label | TEXT DEFAULT '' | Label opcional (ex: Linha A) |

Migration 007_cameras_config.sql com seed: slot 1 = camera 1, slot 2 = camera 2.

---

## API Endpoints

### GET /cameras/config

Retorna array ordenado por slot:


### PUT /cameras/config

Recebe array completo (substitui tudo):


Validacoes:
- Maximo 4 slots
- camera_id deve existir no config.cameras (IPs do .env)
- Sem camera_id duplicado
- slot deve ser 1-4

Retorna array salvo ou erro 400.

---

## Aba "Cameras" no Configurador

Nova aba no Configurador existente (ao lado de Grupos e Usuarios):
- Icone: videocam
- Label: Cameras

UI: lista de cards, um por camera configurada. Cada card mostra:
- Numero do slot (grande, a esquerda)
- Select para escolher qual camera_id vai nesse slot
- Input de texto para o label (placeholder: Ex: Linha A)
- Indicador de conexao (verde/vermelho) via GET /cameras

Acoes:
- Botao "Salvar" no rodape — PUT /cameras/config
- Toast de sucesso/erro apos salvar
- Erro inline se camera duplicada em dois selects

---

## Integracao com Modal "Iniciar Contagem"

Mudancas no fluxo do modal:
1. Quem chama o modal faz GET /cameras/config para saber ordem dos slots
2. Cruza com cameras livres (sem sessao ativa)
3. Renderiza botoes na ordem dos slots (nao dos IDs)
4. Botao mostra numero do slot
5. Tooltip com label configurado (se houver)
6. Botoes de cameras ocupadas ficam desabilitados (cinza)
7. Ao confirmar, envia camera_id real (nao o slot)

Exemplo: config [{slot:1, camera_id:2}, {slot:2, camera_id:1}], camera 1 ocupada:
- Botao "1" habilitado (camera_id 2, livre)
- Botao "2" desabilitado (camera_id 1, ocupada)

---

## Componentes

### Novo (backend)
- src/db/migrations/007_cameras_config.sql
- src/db/queries/cameras-config.js — listar() e salvar(array)
- src/http/routes/cameras-config.js — GET e PUT /cameras/config

### Novo (frontend)
- public/js/pages/configurador-cameras.js

### Modificado (frontend)
- public/js/pages/configurador.js — adicionar aba Cameras
- public/js/ui/composites/modal-iniciar-sessao.js — consumir config de slots
- public/js/pages/selecao-carga.js — passar config ao abrir modal
- public/js/pages/detalhes-carga.js — idem

### Sem mudanca
- GET /cameras (estado de conexao)
- POST /sessoes (recebe camera_id)
- .env (fonte de verdade dos IPs)

---

## Fora de escopo
- Sincronizacao com Supabase (config e so local)
- Adicionar/remover cameras via UI (IPs continuam no .env)
- Mudancas no protocolo TCP/Keyence
