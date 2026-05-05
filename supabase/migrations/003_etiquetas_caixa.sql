CREATE TABLE IF NOT EXISTS sistema_contagem.etiquetas_caixa (
    id                UUID PRIMARY KEY,
    numero_embarque   TEXT NOT NULL,
    numero_caixa      TEXT NOT NULL,
    sessao_origem_id  UUID,
    codigo_operador   TEXT NOT NULL,
    motivo            TEXT NOT NULL CHECK (motivo IN ('encerramento', 'reimpressao')),
    status            TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    partes_total      INTEGER NOT NULL CHECK (partes_total > 0),
    erro_detalhe      TEXT,
    criada_em         TIMESTAMPTZ NOT NULL,
    impressa_em       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_etiquetas_caixa_lookup
    ON sistema_contagem.etiquetas_caixa (numero_embarque, numero_caixa, criada_em DESC);

CREATE TABLE IF NOT EXISTS sistema_contagem.etiquetas_caixa_partes (
    id             UUID PRIMARY KEY,
    etiqueta_id    UUID NOT NULL REFERENCES sistema_contagem.etiquetas_caixa(id) ON DELETE CASCADE,
    parte_numero   INTEGER NOT NULL CHECK (parte_numero > 0),
    partes_total   INTEGER NOT NULL CHECK (partes_total > 0),
    payload_zpl    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'impressa', 'erro', 'cancelada')),
    tentativas     INTEGER NOT NULL DEFAULT 0,
    erro_detalhe   TEXT,
    criada_em      TIMESTAMPTZ NOT NULL,
    impressa_em    TIMESTAMPTZ,
    UNIQUE (etiqueta_id, parte_numero)
);

GRANT ALL ON sistema_contagem.etiquetas_caixa TO service_role;
GRANT ALL ON sistema_contagem.etiquetas_caixa_partes TO service_role;
