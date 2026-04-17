# Sistema de Contagem Rei AutoParts — Design Spec

**Data:** 2026-04-17
**Status:** MVP
**Autores:** Emilio (product owner) + Claude (brainstorming)

Documento de design consolidado. Resultado do processo de brainstorming estruturado — referência canônica para o plano de implementação.

---

## 1. Objetivo e escopo

Sistema industrial de contagem automatizada de peças baseado em **edge computing**. Usa duas câmeras Keyence IV4-600CA para contar peças em tempo real durante o processo de embarque, substituindo conferência manual.

### Fora de escopo no MVP

- Autenticação (operador identificado apenas por código).
- Multi-tenant.
- Failover do Edge PC.
- BI externo / dashboards analíticos (só relatórios PDF/XLSX/CSV).
- Mais de 2 câmeras (estrutura suporta, UI não).

### Critérios de sucesso

1. Operador abre uma sessão de contagem em menos de 30s.
2. Pulso da câmera aparece no dashboard da TV em menos de 300ms.
3. Sistema continua operacional durante queda de rede (offline → contagem mantém).
4. Zero perda de dados: toda sessão/evento gerado localmente é eventualmente replicado para o Supabase.
5. Nunca permite duplicata de número de caixa dentro do mesmo embarque.

---

## 2. Topologia e stack

### Hardware

- **Edge PC** (Windows 11) — servidor local.
- **2 câmeras Keyence IV4-600CA** conectadas via Ethernet.
- **Monitor 1** — interface do operador (Chrome em localhost).
- **Monitor 2** — TV em modo kiosk (dashboard em tempo real).

### Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 LTS |
| HTTP | Fastify + @fastify/websocket + @fastify/static |
| Local DB | better-sqlite3 |
| Cloud DB | Supabase self-hosted (`https://supabase.pcpsuporterei.site`) |
| Cliente cloud | @supabase/supabase-js (service_role) |
| Frontend | HTMLs Industrial Zen (já prontos em `stitch_sistema_contagem_rei_autoparts/`) + vanilla JS + Tailwind via CDN |
| Process manager | pm2 (autostart + restart em crash) |
| Relatórios | pdfkit, exceljs, CSV string |
| Logger | pino (arquivo rotativo diário) |

---

## 3. Arquitetura lógica

Single-process Node.js com 7 módulos. Comunicação intra-processo via chamada de função; nada de filas internas ou microservices.

```
src/
├── server.js              # bootstrap
├── config.js              # .env + câmeras (IP, porta)
├── db/
│   ├── sqlite.js
│   ├── migrations/001_init.sql
│   └── queries/{sessoes,eventos,outbox}.js
├── domain/
│   ├── sessao-service.js
│   └── contagem-service.js
├── camera/
│   ├── keyence-client.js   # socket + protocolo ASCII
│   ├── keyence-parser.js   # payload de pulso
│   └── camera-manager.js   # 1 conexão por câmera + reconnect
├── sync/
│   ├── sync-worker.js      # máquina de estados
│   ├── supabase-client.js
│   └── healthcheck.js
├── http/
│   ├── routes/{embarques,ops,operadores,sessoes,programas,relatorios}.js
│   └── ws-hub.js
└── shared/{logger,errors}.js
```

### Módulos

- **HTTP Server (Fastify)** — REST para o Monitor 1.
- **WebSocket Hub** — broadcast para os dois monitores.
- **TCP Listener + Keyence Client** — conexões TCP persistentes com cada câmera.
- **Camera Manager** — estado da câmera (desconectada/suspensa/ativa), reconnect com backoff.
- **Domain Layer** — regras de negócio (abrir/encerrar sessão, validações).
- **SQLite (local)** — espelho parcial do schema cloud + outbox.
- **Sync Worker** — state machine, drena outbox em batches idempotentes.

---

## 4. Modelo de dados

### Schema `sistema_contagem` (Supabase — PostgreSQL)

Migration 001 já aplicada (`supabase/migrations/001_schema_inicial.sql`). Tabelas:

- **`embarques`** — populadas pelo ERP. `status` fecha quando `numero_nota_fiscal` é preenchido.
- **`ordens_producao`** — populadas pelo ERP.
- **`operadores`** — cadastro simples (código + nome).
- **`sessoes_contagem`** — criadas no Edge PC, replicadas via Sync Worker.
    - PK: `UUID` gerado local → idempotência no upsert.
    - Índice parcial único: `UNIQUE (camera_id) WHERE status = 'ativa'`.
- **`eventos_log`** — replicados do Edge PC. `UNIQUE(origem, id_local)` garante idempotência.

### Migration 002 (pendente)

```sql
ALTER TABLE sistema_contagem.sessoes_contagem
    ADD COLUMN programa_numero INTEGER,
    ADD COLUMN programa_nome   TEXT;

CREATE UNIQUE INDEX idx_sessoes_caixa_unica_por_embarque
    ON sistema_contagem.sessoes_contagem (numero_embarque, numero_caixa)
    WHERE numero_caixa IS NOT NULL;
```

### SQLite local (Edge PC)

Estrutura de 3 grupos:

**(a) Tabelas de escrita local** (origem: Edge PC, replicam para Supabase via outbox):
- `sessoes_contagem`
- `eventos_log`

**(b) Tabelas espelho** (origem: Supabase, replicam para SQLite via Reverse Sync Poller):
- `embarques` — cache do que veio do ERP
- `ordens_producao` — cache do que veio do ERP
- `operadores` — cache

Cada espelho guarda o campo `atualizado_em` original (usado pelo poller como cursor) + coluna local `sincronizado_local_em`.

**(c) Infraestrutura de sync:**

```sql
CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabela TEXT NOT NULL,         -- 'sessoes_contagem' ou 'eventos_log'
    payload_json TEXT NOT NULL,
    tentativas INTEGER DEFAULT 0,
    ultima_tentativa DATETIME,
    sincronizado_em DATETIME,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_outbox_pendente ON outbox (sincronizado_em) WHERE sincronizado_em IS NULL;

CREATE TABLE sync_cursor (
    tabela TEXT PRIMARY KEY,            -- 'embarques', 'ordens_producao', 'operadores'
    ultimo_atualizado_em DATETIME,      -- maior atualizado_em já sincronizado
    ultimo_poll_em DATETIME
);
```

**Validação de sessão:** sempre lê do SQLite espelho — nunca do Supabase direto. Sistema segue operacional offline. Caso raro: embarque criado durante o offline → não estará no cache → UI mostra "Embarque não encontrado. Aguarde sincronização (próximo poll em Xs)".

---

## 5. Protocolo Keyence — integração bidirecional

**Referência completa:** `reference_keyence_iv4_protocolo.md` (memória do projeto).

### Configuração da câmera (feita via IV Smart Navigator)

1. Configurações de comunicação → **Configurações comunicação não processual** → Habilitar, porta **8500**.
2. Configurações de E/S → Configs. de Entrada → Opção → **Método de alternação de programa** = "Painel/PC/Rede/Troca automática".

### Comandos usados

| Comando | Uso |
|---|---|
| `PW,nnn` | Troca para programa `nnn` |
| `PR` | Lê programa atual |
| `PNR` | Lê nome do programa atual |
| `OE,n` | Ativa (n>0) / desativa (0) transmissão automática de pulsos |
| `CTR` | Zera contagem |
| `SR` | Status do sensor |

### Payload do pulso (modo IA Contagem de Passagem)

```
ff,qqqqqqq,rrrrrrr,ppp CR
  ff       nº da ferramenta (01-08)
  qqqqqqq  contagem atual
  rrrrrrr  total do dia
  ppp      brilho (000-255)
```

### Descoberta de programas (cache)

Não há comando único para listar. Na primeira conexão com cada câmera, itera `PW,nnn` + `PNR` para n=000..127, cacheia em memória. Programas sem nome válido são considerados vazios.

### Ciclo de sessão na câmera

```
abertura: PW,<programa> → CTR → OE,<formato>    (câmera ativa, emitindo pulsos)
encerramento: OE,0                              (câmera suspensa)
```

**Regra de defesa:** pulso recebido sem sessão ativa registrada localmente = descarta + log WARN.

---

## 6. Fluxo do operador

### 6.1 Abertura de sessão (duas etapas)

1. **Etapa 1** — modal com 3 campos: embarque (dropdown), OP (dropdown filtrado), código do operador. Valida online contra Supabase. Sistema aloca câmera 1 ou 2 (a livre).
2. **Etapa 2** — campo de busca de programa da câmera alocada. Filtra sobre o cache. Ao selecionar, emite `PW → CTR → OE,1`. Sessão vai para status `ativa`. Câmera muda programa fisicamente.

### 6.2 Contagem em andamento

- Tela de monitoramento no Monitor 1 (mostra sessões das duas câmeras).
- Dashboard Monitor 2 mostra contagem grande + barra de progresso vs `quantidade_prevista` da OP.
- Incremento em tempo real via WebSocket.

### 6.3 Encerramento de sessão

1. Operador clica "Encerrar".
2. Modal pede **número da caixa**.
3. Sistema valida: `UNIQUE(numero_embarque, numero_caixa)` — se duplicado, bloqueia e exige outro número.
4. Emite `OE,0` → câmera suspende.
5. Sessão vai para `status=encerrada` → entra na outbox.

### 6.4 Fechamento do embarque

- Automático: quando ERP preenche `numero_nota_fiscal` no embarque, status vira `fechado`. Edge PC não permite abrir nova sessão nesse embarque.

---

## 7. Sync State Machine + Error Handling

O Sync Worker tem **dois loops independentes** que respeitam a mesma máquina de estados:

- **Outbox Pusher** — empurra `sessoes_contagem` + `eventos_log` para o Supabase.
- **Reverse Sync Poller** — puxa `embarques`, `ordens_producao`, `operadores` do Supabase.

### Estados

- **ONLINE** — healthcheck passa. Pusher em tempo real, Poller a cada **30s**. Badge verde.
- **OFFLINE** — 3 falhas consecutivas. Pusher e Poller pausados. Writes locais seguem normais. Badge amarelo. Ping a cada 30s.
- **RECOVERY** — ping voltou. Drena outbox em batches de 100 + roda 1 ciclo full do Poller. Badge azul.

### Reverse Sync Poller — detalhes

A cada tick (30s em ONLINE):

1. Para cada tabela espelho (`embarques`, `ordens_producao`, `operadores`):
    - Lê `sync_cursor.ultimo_atualizado_em`.
    - `SELECT * FROM sistema_contagem.<tabela> WHERE atualizado_em > cursor ORDER BY atualizado_em LIMIT 500`.
    - Upsert em bloco no SQLite.
    - Atualiza cursor para o maior `atualizado_em` do batch.
2. Se erro, marca falha do healthcheck (pode levar ao OFFLINE).
3. Emite evento WS `dados.atualizados` com timestamp do último sync (UI mostra "Dados sincronizados há X min").

### Transições

```
ONLINE ──3 falhas──▶ OFFLINE
OFFLINE ──1 ping OK──▶ RECOVERY
RECOVERY ──outbox=0──▶ ONLINE
RECOVERY ──ping falha──▶ OFFLINE
```

### Tratamento de erros

| Origem | Erro | Ação |
|---|---|---|
| Câmera TCP | Desconexão | Reconnect backoff exp. (1s, 2s, 4s, 8s, cap 30s) + log WARN |
| Câmera TCP | Pulso sem sessão ativa | Descarta + log WARN |
| Câmera TCP | Payload inválido | Descarta + log ERROR com raw bytes |
| Supabase | HTTP 4xx | Move para dead-letter local + log ERROR (não retenta) |
| Supabase | HTTP 5xx / timeout | Mantém na outbox + conta falha do healthcheck |

### Idempotência

- `eventos_log` UNIQUE(origem, id_local).
- `sessoes_contagem` PK é UUID local.
- Sync Worker: ack-then-delete (só remove da outbox após 2xx do Supabase).

---

## 8. API do Edge PC (esqueleto)

REST convencional, JSON. Nenhum endpoint exige auth no MVP.

```
GET    /health                          → estado sync + câmeras + outbox
GET    /embarques?status=aberto
GET    /ops?embarque=<n>
GET    /operadores
GET    /programas?camera=<1|2>&q=<texto>
POST   /sessoes                         → cria (pré-ativa, aguarda programa)
POST   /sessoes/:id/confirmar           → envia PW/CTR/OE
POST   /sessoes/:id/encerrar            → valida caixa, envia OE,0
GET    /sessoes?status=ativa
GET    /relatorios/embarque/:n?fmt=pdf|xlsx|csv
WS     /ws                              → eventos: contagem.incrementada, sessao.atualizada, sync.status
```

---

## 9. Testes e verificação

### Testes unitários
- `keyence-parser.js` — payloads mal formados, whitespace, zeros à esquerda.
- `sync-worker.js` — transições ONLINE/OFFLINE/RECOVERY.
- `sessao-service.js` — validação de 1-sessão-por-câmera + caixa única por embarque.

### Testes de integração
- Rotas de sessão com SQLite em memória.
- Mock do Supabase (fetch stub) para simular falha e acúmulo de outbox.

### Ferramentas de dev
- `scripts/fake-keyence.js` — listener TCP que responde como câmera (permite dev sem hardware).
- `scripts/ping-keyence.js` — interativo, testa `PR`, `PNR`, `PW`, `OE`, `SR` contra câmera real.

### Checklist manual E2E pré-produção
1. Boot do Edge PC via pm2 → UI abre.
2. Dropdowns populados (ERP alimentou Supabase).
3. Abre sessão completa → câmera troca programa fisicamente.
4. 10 peças reais pela câmera → TV atualiza.
5. Desliga cabo de rede → OFFLINE, contagem continua.
6. Religa → RECOVERY → ONLINE.
7. Encerra sessão com nº de caixa → câmera suspende.
8. Tenta reusar o mesmo nº de caixa → bloqueia.
9. ERP preenche NF → embarque fecha.

### Observabilidade
- Logger estruturado (pino) em `logs/app.log` rotativo.
- `GET /health` agrega: estado sync, câmeras conectadas, tamanho outbox, última sessão ativa.
- Badge na UI consome `/health` via WS push.

---

## 10. Princípios arquiteturais (non-negotiable)

1. **Edge-first, cloud-eventual** — nada crítico depende de rede.
2. **Idempotência em tudo que sobe** — re-upsert é seguro.
3. **1 sessão ativa por câmera** — garantido em banco (índice parcial).
4. **Comando antes de escuta** — câmera só emite pulso após `OE,1`; fora disso é ruído.
5. **Monólito honesto** — 1 processo, 7 módulos, comunicação via função.
6. **Banco compartilhado** — DDL fora de `sistema_contagem` requer aprovação; nenhuma function/trigger/policy criada sem conversa prévia.

---

## 11. Próximos passos

Após aprovação deste spec:

1. Aplicar Migration 002 (programa + caixa única).
2. Invocar skill `writing-plans` para gerar plano de implementação detalhado.
3. Configurar segunda câmera em paralelo ao início da implementação.

## Referências

- `ARQUITETURA.md` — diagramas e fluxogramas visuais.
- `DEVELOPER_CONTEXT.md`, `estrutura_sistema.md`, `scripts_automacao.md` — contexto do projeto.
- `manual.pdf` — Manual Keyence IV4 (capítulo 9).
- `stitch_sistema_contagem_rei_autoparts/industrial_zen/DESIGN.md` — design system.
- Memórias: `reference_keyence_iv4_protocolo.md`, `project_camera_keyence_fluxo.md`, `feedback_supabase_readonly.md`.
