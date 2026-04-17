-- Sessões (origem: Edge PC, replicam para Supabase)
CREATE TABLE IF NOT EXISTS sessoes_contagem (
    id                TEXT    PRIMARY KEY,
    numero_embarque   TEXT    NOT NULL,
    codigo_op         TEXT    NOT NULL,
    codigo_operador   TEXT    NOT NULL,
    camera_id         INTEGER NOT NULL CHECK (camera_id IN (1, 2)),
    programa_numero   INTEGER,
    programa_nome     TEXT,
    numero_caixa      TEXT,
    quantidade_total  INTEGER NOT NULL DEFAULT 0,
    iniciada_em       TEXT    NOT NULL,
    encerrada_em      TEXT,
    status            TEXT    NOT NULL CHECK (status IN ('ativa', 'encerrada', 'cancelada')),
    criada_em         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_camera_unica_ativa
    ON sessoes_contagem (camera_id) WHERE status = 'ativa';

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_caixa_unica
    ON sessoes_contagem (numero_embarque, numero_caixa) WHERE numero_caixa IS NOT NULL;

-- Eventos (origem: Edge PC, replicam para Supabase)
CREATE TABLE IF NOT EXISTS eventos_log (
    id_local        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT    NOT NULL,
    nivel           TEXT    NOT NULL CHECK (nivel IN ('INFO', 'WARN', 'ERROR', 'SUCCESS')),
    categoria       TEXT    NOT NULL CHECK (categoria IN ('SESSAO', 'CAMERA', 'SYNC', 'SISTEMA')),
    mensagem        TEXT    NOT NULL,
    codigo_operador TEXT,
    criado_em       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Outbox (itens a enviar para Supabase)
CREATE TABLE IF NOT EXISTS outbox (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    tabela            TEXT    NOT NULL,
    payload_json      TEXT    NOT NULL,
    tentativas        INTEGER NOT NULL DEFAULT 0,
    ultima_tentativa  TEXT,
    erro_detalhe      TEXT,
    sincronizado_em   TEXT,
    criado_em         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_pendente
    ON outbox (sincronizado_em) WHERE sincronizado_em IS NULL;

-- Espelhos (origem: Supabase via Reverse Sync Poller)
CREATE TABLE IF NOT EXISTS embarques (
    numero_embarque     TEXT PRIMARY KEY,
    motorista           TEXT,
    placa               TEXT,
    data_criacao        TEXT,
    numero_nota_fiscal  TEXT,
    status              TEXT,
    capacidade_maxima   INTEGER,
    atualizado_em       TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ordens_producao (
    codigo_op           TEXT PRIMARY KEY,
    item_codigo         TEXT,
    item_descricao      TEXT,
    quantidade_prevista INTEGER,
    atualizado_em       TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operadores (
    codigo        TEXT PRIMARY KEY,
    nome          TEXT NOT NULL,
    ativo         INTEGER NOT NULL DEFAULT 1,
    atualizado_em TEXT,
    sincronizado_local_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cursor do Reverse Sync Poller
CREATE TABLE IF NOT EXISTS sync_cursor (
    tabela                TEXT PRIMARY KEY,
    ultimo_atualizado_em  TEXT,
    ultimo_poll_em        TEXT
);
