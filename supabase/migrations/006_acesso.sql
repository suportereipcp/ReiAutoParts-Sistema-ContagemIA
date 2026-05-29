-- Configurador de Acessos — schema sistema_contagem
-- NÃO aplicar via código. Aplicar manualmente ou via CI.

CREATE TABLE IF NOT EXISTS sistema_contagem.acesso_grupos (
    id           UUID PRIMARY KEY,
    nome         TEXT UNIQUE NOT NULL,
    descricao    TEXT,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sistema_contagem.acesso_grupo_atividades (
    grupo_id     UUID NOT NULL REFERENCES sistema_contagem.acesso_grupos(id) ON DELETE CASCADE,
    atividade_id TEXT NOT NULL,
    PRIMARY KEY (grupo_id, atividade_id)
);

CREATE TABLE IF NOT EXISTS sistema_contagem.acesso_usuarios (
    id              UUID PRIMARY KEY,
    email           TEXT,
    nome            TEXT,
    sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sistema_contagem.acesso_usuario_grupos (
    usuario_id UUID NOT NULL REFERENCES sistema_contagem.acesso_usuarios(id) ON DELETE CASCADE,
    grupo_id   UUID NOT NULL REFERENCES sistema_contagem.acesso_grupos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, grupo_id)
);

CREATE TABLE IF NOT EXISTS sistema_contagem.acesso_usuario_overrides (
    usuario_id   UUID NOT NULL REFERENCES sistema_contagem.acesso_usuarios(id) ON DELETE CASCADE,
    atividade_id TEXT NOT NULL,
    efeito       TEXT NOT NULL CHECK (efeito IN ('conceder', 'revogar')),
    PRIMARY KEY (usuario_id, atividade_id)
);

CREATE INDEX IF NOT EXISTS idx_acesso_grupo_atividades_grupo
    ON sistema_contagem.acesso_grupo_atividades (grupo_id);

CREATE INDEX IF NOT EXISTS idx_acesso_usuario_grupos_usuario
    ON sistema_contagem.acesso_usuario_grupos (usuario_id);

CREATE INDEX IF NOT EXISTS idx_acesso_usuario_overrides_usuario
    ON sistema_contagem.acesso_usuario_overrides (usuario_id);
