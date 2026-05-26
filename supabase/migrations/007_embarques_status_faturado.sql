-- =====================================================================
-- Migration 007: permite status 'faturado' em embarques
-- Alvo:         Supabase / PostgreSQL (schema sistema_contagem)
-- Motivo:       A feature de faturamento (migration 006) passou a marcar
--               embarques como status='faturado', mas o CHECK original
--               (migration 001) só permitia ('aberto','fechado'). Isso fazia
--               o sync rejeitar o UPDATE (SQLSTATE 23514 — check_violation),
--               travando o outbox-pusher e deixando o Supabase OFFLINE.
-- Idempotente:  DROP IF EXISTS + ADD.
-- =====================================================================

ALTER TABLE sistema_contagem.embarques
    DROP CONSTRAINT IF EXISTS embarques_status_check;

ALTER TABLE sistema_contagem.embarques
    ADD CONSTRAINT embarques_status_check
    CHECK (status IN ('aberto', 'fechado', 'faturado'));
