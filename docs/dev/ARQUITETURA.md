# Sistema de Contagem Rei AutoParts — Arquitetura e Fluxogramas

Documento técnico do MVP. Cobre topologia, módulos, fluxo do operador, fluxo de dados e máquinas de estado.

---

## 1. Visão geral

Sistema **edge-first** para contagem automatizada de peças usando duas câmeras Keyence IV4-600CA. Cada câmera está associada a uma sessão ativa por vez; a contagem acontece localmente no Edge PC e é replicada para o Supabase em segundo plano (*Store-and-Forward*), permitindo operação resiliente a quedas de rede.

### Papéis dos dispositivos

| Dispositivo | Função |
|---|---|
| Edge PC (Windows) | Servidor Node.js, SQLite local, gateway TCP das câmeras |
| Câmera Keyence 1 e 2 | Detecção + emissão de pulsos TCP |
| Monitor 1 | Interface operador (Chrome apontando para localhost) |
| Monitor 2 (TV) | Dashboard em modo kiosk (tempo real via WebSocket) |
| Supabase (self-hosted) | Banco central, alimentado pelo Edge PC + ERP |

---

## 2. Topologia de hardware

```
+--------------+         +--------------+
|  Câmera IV4  |         |  Câmera IV4  |
|   nº 1       |         |   nº 2       |
+------+-------+         +------+-------+
       |  TCP 8500 (pulsos + comandos)  |
       +---------------+----------------+
                       |
                  +----v-----+
                  | Edge PC  |  Node.js + SQLite + WebSocket
                  | Windows  |
                  +----+-----+
                       |
             +---------+---------+
             |                   |
      Monitor 1            Monitor 2 (TV)
      (Operador)           (Kiosk)
                       |
                       | HTTPS (Sync Worker)
                       v
             +-------------------+
             | Supabase cloud    |
             | schema:           |
             | sistema_contagem  |
             +-------------------+
                       ^
                       |
                    ERP (PCP alimenta embarques e OPs)
```

---

## 3. Arquitetura lógica (módulos do Edge PC)

Single-process Node.js. Cada bloco abaixo é um módulo dentro de `src/`.

```mermaid
flowchart LR
    subgraph EdgePC[Edge PC — single Node process]
        HTTP[HTTP Server<br/>Fastify]
        WS[WebSocket Hub]
        TCP[TCP Listener<br/>+ Keyence Client]
        CAM[Camera Manager<br/>reconnect + cmds]
        DOM[Domain Layer<br/>sessões, contagem]
        DB[(SQLite<br/>better-sqlite3)]
        SYNC[Sync Worker<br/>state machine]
    end

    UI1[Monitor 1<br/>Operador] <-->|HTTP + WS| HTTP
    UI2[Monitor 2<br/>TV kiosk] <-->|WS| WS
    CAM1[Câmera 1] <-->|TCP 8500| TCP
    CAM2[Câmera 2] <-->|TCP 8500| TCP

    HTTP --> DOM
    WS --> DOM
    TCP --> CAM
    CAM --> DOM
    DOM --> DB
    DOM --> WS
    DB --> SYNC
    SYNC <-->|HTTPS| Supabase[(Supabase)]
    ERP[ERP/PCP] -->|direto| Supabase
```

### Responsabilidades

- **HTTP Server**: REST para o Monitor 1 (embarques, OPs, sessões, relatórios).
- **WebSocket Hub**: broadcast de eventos (`sessao.atualizada`, `contagem.incrementada`, `sync.status`) para as duas UIs.
- **TCP Listener + Keyence Client**: abre conexão TCP com cada câmera, envia comandos (`PW`, `OE`, `CTR`) e interpreta o payload dos pulsos.
- **Camera Manager**: encapsula uma conexão por câmera, reconnect com backoff exponencial, mantém estado (ativa/suspensa).
- **Domain Layer**: regras de negócio — abrir sessão, validar duplicata de caixa, incrementar contagem, encerrar sessão.
- **SQLite**: persistência local (espelho parcial do schema do Supabase + `outbox` para sync).
- **Sync Worker**: máquina de estados ONLINE/OFFLINE/RECOVERY, drena a `outbox` em batches idempotentes.

---

## 4. Fluxo do operador — abertura de sessão

```mermaid
sequenceDiagram
    participant Op as Operador (Monitor 1)
    participant HTTP as Edge HTTP
    participant DOM as Domain
    participant CAM as Camera Manager
    participant DB as SQLite
    participant WS as WebSocket Hub
    participant TV as Monitor 2 (TV)

    Op->>HTTP: GET /embarques?status=aberto
    HTTP-->>Op: lista de embarques
    Op->>HTTP: POST /sessoes (embarque, OP, operador)
    HTTP->>DOM: abrirSessao()
    DOM->>DB: valida OP, operador, embarque
    DOM->>DB: aloca câmera livre (1 ou 2)
    DOM-->>HTTP: sessão pré-criada (aguardando programa)
    HTTP-->>Op: devolve câmera alocada + lista programas

    Op->>HTTP: GET /programas?camera=1&q=pecaX
    HTTP->>CAM: pesquisa no cache (PW+PNR já rodado)
    CAM-->>HTTP: programas filtrados
    HTTP-->>Op: resultado

    Op->>HTTP: POST /sessoes/:id/confirmar (programa=P002)
    HTTP->>CAM: PW,002 → CTR → OE,1
    CAM-->>HTTP: OK
    HTTP->>DB: UPDATE sessao SET status='ativa'
    HTTP->>WS: broadcast sessao.atualizada
    WS-->>Op: UI atualiza
    WS-->>TV: dashboard mostra contagem em zero
```

---

## 5. Fluxo do pulso — câmera → UI → cloud

```mermaid
sequenceDiagram
    participant CAM as Câmera Keyence
    participant TCP as TCP Listener
    participant DOM as Domain
    participant DB as SQLite
    participant WS as WebSocket Hub
    participant UI as Monitor 1/TV
    participant SYNC as Sync Worker
    participant SB as Supabase

    CAM->>TCP: pulso "02,0000150,0000500,000\r"
    TCP->>TCP: parse (toolID=02, count=150)
    TCP->>DOM: registrarContagem(camera=X, count=150)
    DOM->>DB: UPDATE sessao.quantidade_total + INSERT outbox
    DB-->>DOM: ok
    DOM->>WS: broadcast contagem.incrementada
    WS-->>UI: atualiza instantaneamente

    Note over SYNC,SB: loop separado, assíncrono
    SYNC->>DB: SELECT outbox (não sincronizado)
    SYNC->>SB: upsert sessoes_contagem + eventos_log
    SB-->>SYNC: 200 OK
    SYNC->>DB: marca outbox como sincronizado
```

---

## 6. Máquina de estados do Sync Worker

O Sync Worker tem dois loops que respeitam a mesma máquina de estados:
- **Outbox Pusher** — empurra sessões e eventos locais para o Supabase.
- **Reverse Sync Poller** — puxa embarques, OPs e operadores do Supabase a cada 30s (só em ONLINE).

```mermaid
stateDiagram-v2
    [*] --> ONLINE: boot
    ONLINE --> OFFLINE: 3 falhas consecutivas<br/>no healthcheck
    OFFLINE --> RECOVERY: 1 ping OK
    RECOVERY --> ONLINE: outbox vazia<br/>+ 1 poll OK
    RECOVERY --> OFFLINE: ping falha<br/>durante drenagem

    note right of ONLINE
        Pusher em tempo real.
        Poller a cada 30s.
        Badge verde.
    end note
    note right of OFFLINE
        Pusher e Poller pausados.
        Writes locais seguem.
        Badge amarelo.
        Ping a cada 30s.
    end note
    note right of RECOVERY
        Drena outbox (batches 100)
        + 1 ciclo full do Poller.
        Badge azul.
    end note
```

### Reverse Sync Poller — por que existe

Validação de embarque/OP precisa funcionar offline. Solução: SQLite tem tabelas espelho do Supabase (`embarques`, `ordens_producao`, `operadores`), atualizadas via polling com cursor `atualizado_em`. A abertura de sessão sempre lê do SQLite, nunca do Supabase direto. ERP é de baixa frequência (embarques/OPs são criados esporadicamente, não a cada minuto), então 30s de atraso máximo é aceitável.

---

## 7. Máquina de estados da Câmera

Cada câmera tem uma instância do Camera Manager com este ciclo:

```mermaid
stateDiagram-v2
    [*] --> Desconectada
    Desconectada --> Conectando: boot ou reconnect timer
    Conectando --> Suspensa: TCP estabelecido<br/>OE=0 (nenhuma sessão)
    Conectando --> Desconectada: falhou, backoff exp.
    Suspensa --> Ativa: abrir sessão<br/>PW → CTR → OE,1
    Ativa --> Suspensa: encerrar sessão<br/>OE,0
    Ativa --> Desconectada: TCP perdeu
    Suspensa --> Desconectada: TCP perdeu
```

---

## 8. Fluxo end-to-end — embarque completo

```mermaid
flowchart TD
    A[ERP cria embarque no Supabase] --> B[Edge PC vê embarque via sync reverso/poll]
    B --> C[Operador abre app no Monitor 1]
    C --> D[Seleciona embarque + OP + código + programa]
    D --> E[Sistema aloca câmera + envia comandos TCP]
    E --> F[Câmera emite pulsos conforme peças passam]
    F --> G[Edge PC atualiza contagem em tempo real na TV]
    G --> H{Operador fecha caixa?}
    H -->|sim| I[Informa nº da caixa + encerra sessão]
    I --> J[Comando OE,0 suspende a câmera]
    J --> K[Sync Worker sobe sessão para Supabase]
    K --> L{Próxima caixa do mesmo embarque?}
    L -->|sim| C
    L -->|não| M[ERP preenche NF no embarque]
    M --> N[Embarque muda para status=fechado]
```

---

## 9. Princípios arquiteturais

1. **Edge-first, cloud-eventual**: nenhuma operação crítica depende de rede. Sync é assíncrono.
2. **Idempotência em tudo que sobe**: `UNIQUE(origem, id_local)` em eventos; UUID local como PK em sessões.
3. **1 sessão ativa por câmera**: garantido por índice parcial único no PostgreSQL e no SQLite.
4. **Comando antes de escuta**: a câmera só emite pulso depois que o Edge PC mandou `OE,1`. Fora disso, qualquer pulso é ruído e é logado como WARN.
5. **Monólito honesto**: 1 processo Node.js, 6 módulos, comunicação via função. Simplicidade é valor no MVP.

---

## 10. Fora de escopo no MVP

- Autenticação de operador (apenas código).
- Multi-tenant.
- Relatórios em BI externo (somente PDF/XLSX/CSV sob demanda).
- Suporte a mais de 2 câmeras (estrutura permite, UI não).
- Failover do Edge PC.
