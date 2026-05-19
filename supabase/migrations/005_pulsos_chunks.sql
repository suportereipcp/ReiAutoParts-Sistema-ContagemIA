CREATE TABLE IF NOT EXISTS sistema_contagem.pulsos_chunks (
    id              UUID PRIMARY KEY,
    sessao_id       UUID NOT NULL,
    camera_id       INTEGER NOT NULL CHECK (camera_id IN (1, 2)),
    chunk_seq       INTEGER NOT NULL CHECK (chunk_seq > 0),
    pulsos_json     JSONB NOT NULL,
    gravado_em      TIMESTAMPTZ NOT NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sessao_id, chunk_seq)
);

CREATE INDEX IF NOT EXISTS idx_pulsos_chunks_sessao
    ON sistema_contagem.pulsos_chunks (sessao_id, chunk_seq);

CREATE INDEX IF NOT EXISTS idx_pulsos_chunks_gravado
    ON sistema_contagem.pulsos_chunks (gravado_em DESC);

GRANT ALL ON sistema_contagem.pulsos_chunks TO service_role;
