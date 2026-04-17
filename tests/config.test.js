import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('loadConfig lê variáveis obrigatórias', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CAMERA_1_IP: '192.168.0.10',
    CAMERA_2_IP: '192.168.0.11',
  });
  assert.equal(cfg.supabase.url, 'https://x');
  assert.equal(cfg.cameras[0].ip, '192.168.0.10');
  assert.equal(cfg.cameras[0].porta, 8500);
});

test('loadConfig falha se variável obrigatória ausente', () => {
  assert.throws(
    () => loadConfig({}),
    /variável obrigatória ausente/
  );
});
