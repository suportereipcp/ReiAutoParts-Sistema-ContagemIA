-- Migration 004: programas de calibracao da camera
-- Aplicacao manual no Supabase. Nao e executada pelo Edge PC.

CREATE TABLE IF NOT EXISTS sistema_contagem.programas_calibracao (
    id              UUID        PRIMARY KEY,
    camera_id       INTEGER     NOT NULL CHECK (camera_id IN (1, 2)),
    tamanho         TEXT        NOT NULL CHECK (tamanho IN ('nano', 'small', 'medium')),
    programa_numero INTEGER     NOT NULL CHECK (programa_numero >= 0),
    programa_nome   TEXT        NOT NULL,
    modelo_path     TEXT,
    versao          INTEGER     NOT NULL CHECK (versao > 0),
    treinado_em     TIMESTAMPTZ NOT NULL,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (camera_id, tamanho)
);

CREATE INDEX IF NOT EXISTS idx_programas_calibracao_camera
    ON sistema_contagem.programas_calibracao (camera_id, tamanho);

COMMENT ON TABLE sistema_contagem.programas_calibracao IS
    'Programas especiais de calibracao por camera. Mantem no maximo nano, small e medium por camera.';

COMMENT ON COLUMN sistema_contagem.programas_calibracao.tamanho IS
    'Tamanho do modelo YOLO treinado automaticamente: nano, small ou medium.';

COMMENT ON COLUMN sistema_contagem.programas_calibracao.versao IS
    'Versao do ciclo de treinamento da camera. Novo ciclo sobrescreve os tres tamanhos anteriores.';

GRANT ALL ON sistema_contagem.programas_calibracao TO service_role;
