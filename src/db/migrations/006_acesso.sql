-- Configurador de Acessos: grupos, atividades, usuários e overrides

CREATE TABLE IF NOT EXISTS acesso_grupos (
    id           TEXT PRIMARY KEY,
    nome         TEXT UNIQUE NOT NULL,
    descricao    TEXT,
    criado_em    TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acesso_grupo_atividades (
    grupo_id     TEXT NOT NULL REFERENCES acesso_grupos(id) ON DELETE CASCADE,
    atividade_id TEXT NOT NULL,
    PRIMARY KEY (grupo_id, atividade_id)
);

CREATE TABLE IF NOT EXISTS acesso_usuarios (
    id              TEXT PRIMARY KEY,
    email           TEXT,
    nome            TEXT,
    sincronizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acesso_usuario_grupos (
    usuario_id TEXT NOT NULL REFERENCES acesso_usuarios(id) ON DELETE CASCADE,
    grupo_id   TEXT NOT NULL REFERENCES acesso_grupos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, grupo_id)
);

CREATE TABLE IF NOT EXISTS acesso_usuario_overrides (
    usuario_id   TEXT NOT NULL REFERENCES acesso_usuarios(id) ON DELETE CASCADE,
    atividade_id TEXT NOT NULL,
    efeito       TEXT NOT NULL CHECK (efeito IN ('conceder', 'revogar')),
    PRIMARY KEY (usuario_id, atividade_id)
);

CREATE INDEX IF NOT EXISTS idx_acesso_grupo_atividades_grupo
    ON acesso_grupo_atividades (grupo_id);

CREATE INDEX IF NOT EXISTS idx_acesso_usuario_grupos_usuario
    ON acesso_usuario_grupos (usuario_id);

CREATE INDEX IF NOT EXISTS idx_acesso_usuario_overrides_usuario
    ON acesso_usuario_overrides (usuario_id);
