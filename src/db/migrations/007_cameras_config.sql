-- Configuracao de slots de camera (mapeamento botao -> camera)
CREATE TABLE IF NOT EXISTS cameras_config (
  slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 4),
  camera_id INTEGER NOT NULL UNIQUE,
  label TEXT DEFAULT ''
);

-- Seed padrao: slot = camera_id
INSERT OR IGNORE INTO cameras_config (slot, camera_id, label) VALUES (1, 1, '');
INSERT OR IGNORE INTO cameras_config (slot, camera_id, label) VALUES (2, 2, '');
