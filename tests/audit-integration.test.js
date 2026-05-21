import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db/sqlite.js';
import { upsertEmbarque, upsertOP, upsertOperador } from '../src/db/queries/espelhos.js';
import { criarSessaoService } from '../src/domain/sessao-service.js';
import { criarContagemService } from '../src/domain/contagem-service.js';
import { criarPulseAuditService } from '../src/audit/pulse-audit-service.js';
import { dataDeInicio } from '../src/audit/paths.js';

async function tmpDir() { return fs.mkdtemp(path.join(os.tmpdir(), 'audit-integration-')); }

function setupDb() {
  const db = openDatabase(':memory:');
  upsertEmbarque(db, { numero_embarque: 'E1', status: 'aberto' });
  upsertOP(db, { codigo_op: 'OP1', item_codigo: 'IT1', quantidade_prevista: 100 });
  upsertOperador(db, { codigo: '001', nome: 'F', ativo: true });
  return db;
}

test('fluxo completo de integracao: iniciar sessao -> enviar pulsos -> fechar sessao', async () => {
  const db = setupDb();
  const logDir = await tmpDir();
  const uploads = [];
  
  const chunkUploader = {
    upload: async (c) => {
      uploads.push(c);
      return { status: 'success' };
    }
  };

  const pulseAuditService = criarPulseAuditService({
    config: {
      baseDir: logDir,
      flushPulses: 3,
      flushSeconds: 90,
      retrySeconds: 60,
      timeZone: 'America/Sao_Paulo',
    },
    chunkUploader,
    gerarUUID: (() => { let i = 0; return () => `uuid-${++i}`; })(),
    now: () => '2026-05-19T12:00:00.000Z',
  });

  const fakeCamera = {
    cameraId: 1,
    estado: 'suspensa',
    async ativarSessao() { this.estado = 'ativa'; },
    async encerrarSessao() { this.estado = 'suspensa'; },
  };

  const sessaoService = criarSessaoService({
    db,
    cameraManagers: new Map([[1, fakeCamera]]),
    registrarEvento: () => {},
    enfileirarSync: () => {},
    gerarUUID: () => 'sessao-1',
    broadcast: () => {},
    pulseAuditService,
  });

  const contagemService = criarContagemService({
    db,
    registrarEvento: () => {},
    enfileirarSync: () => {},
    broadcast: () => {},
    pulseAuditService,
    now: () => '2026-05-19T12:00:05.000Z',
  });

  // 1. Abrir sessão
  const s = await sessaoService.abrir({
    numero_embarque: 'E1',
    codigo_op: 'OP1',
    codigo_operador: '001',
    camera_id: 1,
  });
  
  // 2. Confirmar sessão (muda para ativa e inicia auditoria)
  await sessaoService.confirmar(s.id, { programaNumero: 10, programaNome: 'P10' });

  // 3. Enviar 3 pulsos para trigger do flush (flushPulses: 3)
  contagemService.processarPulso({ cameraId: 1, contagem: 1, total_dia: 1, brilho: 100 });
  await contagemService.getUltimoAppendPromise();
  contagemService.processarPulso({ cameraId: 1, contagem: 2, total_dia: 2, brilho: 100 });
  await contagemService.getUltimoAppendPromise();
  contagemService.processarPulso({ cameraId: 1, contagem: 3, total_dia: 3, brilho: 100 });
  await contagemService.getUltimoAppendPromise();

  // Verificar se o uploader recebeu o chunk
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].chunk_seq, 1);
  assert.equal(uploads[0].pulsos_json.length, 3);
  assert.equal(uploads[0].pulsos_json[2].n, 3);

  // 4. Enviar mais 1 pulso (fica no live buffer)
  contagemService.processarPulso({ cameraId: 1, contagem: 4, total_dia: 4, brilho: 100 });
  await contagemService.getUltimoAppendPromise();

  // 5. Encerrar sessão (deve fazer flush do live buffer, tentar upload e marcar como fechada)
  await sessaoService.encerrar(s.id, { numero_caixa: 'CX-001' });

  // Verificar se o segundo chunk contendo o 4º pulso foi enviado
  assert.equal(uploads.length, 2);
  assert.equal(uploads[1].chunk_seq, 2);
  assert.equal(uploads[1].pulsos_json.length, 1);
  assert.equal(uploads[1].pulsos_json[0].n, 4);

  // Verificar integridade do arquivo .ndjson
  const dataPasta = dataDeInicio(s.iniciada_em);
  const ndjsonPath = path.join(logDir, dataPasta, 'cam-1', 'sessao-sessao-1.ndjson');
  const conteudo = await fs.readFile(ndjsonPath, 'utf8');
  const linhas = conteudo.split('\n').filter(Boolean);
  
  const header = JSON.parse(linhas[0]);
  assert.equal(header.type, 'session-header');
  assert.equal(header.operador, '001');

  const statusFinal = JSON.parse(linhas[linhas.length - 1]);
  assert.equal(statusFinal.type, 'session-status');
  assert.equal(statusFinal.status, 'Fechado');
});
