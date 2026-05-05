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
  assert.equal(cfg.camera.programScanMax, 32);
  assert.equal(cfg.camera.programScanDelayMs, 200);
});

test('loadConfig falha se variável obrigatória ausente', () => {
  assert.throws(
    () => loadConfig({}),
    /variável obrigatória ausente/
  );
});

test('loadConfig permite ajustar varredura de programas da camera', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CAMERA_1_IP: '192.168.0.10',
    CAMERA_2_IP: '192.168.0.11',
    CAMERA_PROGRAM_SCAN_MAX: '16',
    CAMERA_PROGRAM_SCAN_DELAY_MS: '350',
  });

  assert.equal(cfg.camera.programScanMax, 16);
  assert.equal(cfg.camera.programScanDelayMs, 350);
});

test('loadConfig carrega configuracao de etiquetas e impressora', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'secret',
    CAMERA_1_IP: '127.0.0.1',
    CAMERA_2_IP: '127.0.0.2',
    LABEL_PRINTER_ENABLED: 'true',
    LABEL_PRINTER_MODE: 'tcp',
    LABEL_PRINTER_HOST: '192.168.0.50',
    LABEL_PRINTER_PORT: '9100',
    LABEL_DPI: '203',
    LABEL_WIDTH_DOTS: '812',
    LABEL_HEIGHT_DOTS: '609',
    LABEL_LINES_PER_PART: '8',
  });

  assert.equal(cfg.labels.linesPerPart, 8);
  assert.equal(cfg.labels.widthDots, 812);
  assert.equal(cfg.labels.template, 'caixa-default');
  assert.equal(cfg.printer.enabled, true);
  assert.equal(cfg.printer.mode, 'tcp');
  assert.equal(cfg.printer.host, '192.168.0.50');
  assert.equal(cfg.printer.port, 9100);
});
