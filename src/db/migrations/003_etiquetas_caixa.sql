CREATE TABLE IF NOT EXISTS etiquetas_caixa (
    id                TEXT PRIMARY KEY,
    numero_embarque   TEXT NOT NULL,
    numero_caixa      TEXT NOT NULL,
    sessao_origem_id  TEXT,
    codigo_operador   TEXT NOT NULL,
    motivo            TEXT NOT NULL CHECK (motivo IN ('encerramento', 'reimpressao')),
    status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    partes_total      INTEGER NOT NULL CHECK (partes_total > 0),
    erro_detalhe      TEXT,
    criada_em         TEXT NOT NULL,
    impressa_em       TEXT,
    FOREIGN KEY (sessao_origem_id) REFERENCES sessoes_contagem(id)
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_lookup
    ON etiquetas_caixa (numero_embarque, numero_caixa, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_status
    ON etiquetas_caixa (status);

CREATE TABLE IF NOT EXISTS etiquetas_caixa_partes (
    id             TEXT PRIMARY KEY,
    etiqueta_id    TEXT NOT NULL REFERENCES etiquetas_caixa(id) ON DELETE CASCADE,
    parte_numero   INTEGER NOT NULL CHECK (parte_numero > 0),
    partes_total   INTEGER NOT NULL CHECK (partes_total > 0),
    payload_zpl    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    tentativas     INTEGER NOT NULL DEFAULT 0,
    erro_detalhe   TEXT,
    criada_em      TEXT NOT NULL,
    impressa_em    TEXT,
    UNIQUE (etiqueta_id, parte_numero)
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_partes_pendentes
    ON etiquetas_caixa_partes (status, criada_em);
