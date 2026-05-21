-- supabase/migrations/006_faturamento.sql
ALTER TABLE sistema_contagem.sessoes_contagem ADD COLUMN IF NOT EXISTS faturamento_status TEXT NOT NULL DEFAULT 'regular';
ALTER TABLE sistema_contagem.sessoes_contagem ADD COLUMN IF NOT EXISTS aprovada_por TEXT;
ALTER TABLE sistema_contagem.sessoes_contagem ADD COLUMN IF NOT EXISTS aprovada_em TIMESTAMPTZ;
ALTER TABLE sistema_contagem.sessoes_contagem ADD COLUMN IF NOT EXISTS embarque_destino TEXT;
-- aprovadores e embarques.finalizada_em são local-only; não sincronizam
