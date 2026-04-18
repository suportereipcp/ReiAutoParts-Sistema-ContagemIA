-- Migration 002: adiciona colunas de programa e caixa única por embarque

ALTER TABLE sistema_contagem.sessoes_contagem
    ADD COLUMN IF NOT EXISTS programa_numero INTEGER,
    ADD COLUMN IF NOT EXISTS programa_nome   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_caixa_unica_por_embarque
    ON sistema_contagem.sessoes_contagem (numero_embarque, numero_caixa)
    WHERE numero_caixa IS NOT NULL;

COMMENT ON COLUMN sistema_contagem.sessoes_contagem.programa_numero IS
    'Número (0-127) do programa da câmera Keyence usado nessa sessão';
COMMENT ON COLUMN sistema_contagem.sessoes_contagem.programa_nome IS
    'Nome legível do programa, cacheado do PNR na hora da abertura';
