-- 005_faturamento.sql
ALTER TABLE sessoes_contagem ADD COLUMN faturamento_status TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE sessoes_contagem ADD COLUMN aprovada_por TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN aprovada_em TEXT;
ALTER TABLE sessoes_contagem ADD COLUMN embarque_destino TEXT;

ALTER TABLE embarques ADD COLUMN finalizada_em TEXT;

CREATE TABLE IF NOT EXISTS aprovadores (
  codigo  TEXT PRIMARY KEY,
  nome    TEXT NOT NULL,
  ativo   INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
