-- =====================================================================
-- Migration 001: Schema inicial do Sistema de Contagem
-- Alvo:         Supabase / PostgreSQL
-- Pré-req:      CREATE SCHEMA sistema_contagem;  (já executado pelo user)
-- Idempotente:  usa IF NOT EXISTS em tudo
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- habilita gen_random_uuid()

-- =====================================================================
-- EMBARQUES  (populado pelo ERP/PCP)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sistema_contagem.embarques (
    numero_embarque     TEXT        PRIMARY KEY,
    motorista           TEXT,
    placa               TEXT,
    data_criacao        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    numero_nota_fiscal  TEXT,
    status              TEXT        NOT NULL DEFAULT 'aberto'
                                    CHECK (status IN ('aberto', 'fechado')),
    capacidade_maxima   INTEGER,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sistema_contagem.embarques IS
    'Embarques importados do ERP. Fica fechado quando numero_nota_fiscal é preenchido.';

CREATE INDEX IF NOT EXISTS idx_embarques_status
    ON sistema_contagem.embarques (status);

-- =====================================================================
-- ORDENS DE PRODUÇÃO  (populado pelo ERP)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sistema_contagem.ordens_producao (
    codigo_op           TEXT        PRIMARY KEY,
    item_codigo         TEXT        NOT NULL,
    item_descricao      TEXT,
    quantidade_prevista INTEGER,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sistema_contagem.ordens_producao IS
    'Ordens de produção importadas do ERP. Usadas para validar a OP informada pelo operador.';

CREATE INDEX IF NOT EXISTS idx_ops_item
    ON sistema_contagem.ordens_producao (item_codigo);

-- =====================================================================
-- OPERADORES
-- =====================================================================
CREATE TABLE IF NOT EXISTS sistema_contagem.operadores (
    codigo        TEXT        PRIMARY KEY,
    nome          TEXT        NOT NULL,
    ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sistema_contagem.operadores IS
    'Cadastro de operadores. Identificação apenas por código no MVP (sem login).';

-- =====================================================================
-- SESSÕES DE CONTAGEM  (sync vindo do Edge PC; UUID gerado local)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sistema_contagem.sessoes_contagem (
    id                UUID        PRIMARY KEY,
    numero_embarque   TEXT        NOT NULL
                                  REFERENCES sistema_contagem.embarques(numero_embarque)
                                  ON UPDATE CASCADE,
    codigo_op         TEXT        NOT NULL
                                  REFERENCES sistema_contagem.ordens_producao(codigo_op)
                                  ON UPDATE CASCADE,
    codigo_operador   TEXT        NOT NULL
                                  REFERENCES sistema_contagem.operadores(codigo)
                                  ON UPDATE CASCADE,
    camera_id         INTEGER     NOT NULL CHECK (camera_id IN (1, 2)),
    numero_caixa      TEXT,
    quantidade_total  INTEGER     NOT NULL DEFAULT 0,
    iniciada_em       TIMESTAMPTZ NOT NULL,
    encerrada_em      TIMESTAMPTZ,
    status            TEXT        NOT NULL
                                  CHECK (status IN ('ativa', 'encerrada', 'cancelada')),
    criada_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sistema_contagem.sessoes_contagem IS
    'Sessões de contagem criadas no Edge PC e sincronizadas via sync worker.';

CREATE INDEX IF NOT EXISTS idx_sessoes_embarque
    ON sistema_contagem.sessoes_contagem (numero_embarque);

CREATE INDEX IF NOT EXISTS idx_sessoes_operador
    ON sistema_contagem.sessoes_contagem (codigo_operador);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_camera_unica_ativa
    ON sistema_contagem.sessoes_contagem (camera_id)
    WHERE status = 'ativa';
-- garante a regra de negócio: 1 sessão ativa por câmera

-- =====================================================================
-- EVENTOS / LOGS  (sync vindo do Edge PC)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sistema_contagem.eventos_log (
    id              BIGSERIAL   PRIMARY KEY,
    id_local        BIGINT      NOT NULL,
    origem          TEXT        NOT NULL DEFAULT 'edge_pc',
    timestamp       TIMESTAMPTZ NOT NULL,
    nivel           TEXT        NOT NULL
                                CHECK (nivel IN ('INFO', 'WARN', 'ERROR', 'SUCCESS')),
    categoria       TEXT        NOT NULL
                                CHECK (categoria IN ('SESSAO', 'CAMERA', 'SYNC', 'SISTEMA')),
    mensagem        TEXT        NOT NULL,
    codigo_operador TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (origem, id_local)
);

COMMENT ON TABLE sistema_contagem.eventos_log IS
    'Eventos replicados do Edge PC. UNIQUE(origem, id_local) garante idempotência no upsert.';

CREATE INDEX IF NOT EXISTS idx_eventos_timestamp
    ON sistema_contagem.eventos_log (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_nivel
    ON sistema_contagem.eventos_log (nivel);

-- =====================================================================
-- PERMISSÕES  (expõe o schema para o PostgREST do Supabase)
-- =====================================================================
GRANT USAGE ON SCHEMA sistema_contagem TO anon, authenticated, service_role;
GRANT ALL    ON ALL TABLES    IN SCHEMA sistema_contagem TO service_role;
GRANT ALL    ON ALL SEQUENCES IN SCHEMA sistema_contagem TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA sistema_contagem
    GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA sistema_contagem
    GRANT ALL ON SEQUENCES TO service_role;
