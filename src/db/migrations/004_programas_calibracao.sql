CREATE TABLE IF NOT EXISTS programas_calibracao (
    id              TEXT    PRIMARY KEY,
    camera_id       INTEGER NOT NULL CHECK (camera_id IN (1, 2)),
    tamanho         TEXT    NOT NULL CHECK (tamanho IN ('nano', 'small', 'medium')),
    programa_numero INTEGER NOT NULL CHECK (programa_numero >= 0),
    programa_nome   TEXT    NOT NULL,
    modelo_path     TEXT,
    versao          INTEGER NOT NULL CHECK (versao > 0),
    treinado_em     TEXT    NOT NULL,
    criado_em       TEXT    NOT NULL DEFAULT (datetime('now')),
    atualizado_em   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (camera_id, tamanho)
);

CREATE INDEX IF NOT EXISTS idx_programas_calibracao_camera
    ON programas_calibracao (camera_id, tamanho);
