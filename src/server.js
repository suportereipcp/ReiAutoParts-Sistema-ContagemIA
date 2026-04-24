import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import url from 'node:url';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { logger } from './shared/logger.js';
import { getDb } from './db/sqlite.js';
import { enfileirar } from './db/queries/outbox.js';
import { registrarEvento } from './db/queries/eventos.js';
import { buscarAtivaPorCamera } from './db/queries/sessoes.js';
import { KeyenceClient } from './camera/keyence-client.js';
import { CameraManager } from './camera/camera-manager.js';
import { ProgramCache } from './camera/program-cache.js';
import { atualizarCacheProgramasAoConectar } from './camera/programas-boot.js';
import { createSupabase, upsertSessao, upsertEvento, buscarAlteracoes } from './sync/supabase-client.js';
import { criarHealthchecker } from './sync/healthcheck.js';
import { criarPusher } from './sync/outbox-pusher.js';
import { criarPoller } from './sync/reverse-poller.js';
import { criarSyncWorker } from './sync/sync-worker.js';
import { criarSessaoService } from './domain/sessao-service.js';
import { criarContagemService } from './domain/contagem-service.js';
import { criarWSHub } from './http/ws-hub.js';
import { rotaHealth } from './http/routes/health.js';
import { rotasEmbarques } from './http/routes/embarques.js';
import { rotasOPs } from './http/routes/ops.js';
import { rotasOperadores } from './http/routes/operadores.js';
import { rotasSessoes } from './http/routes/sessoes.js';
import { rotasProgramas } from './http/routes/programas.js';
import { rotasRelatorios } from './http/routes/relatorios.js';
import { rotasEventos } from './http/routes/eventos.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

async function main() {
  const db = getDb(config);
  const fastify = Fastify({ logger });

  await fastify.register(fastifyWebsocket);
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  const wsHub = criarWSHub(fastify, logger);

  const cameraManagers = new Map();
  for (const cfg of config.cameras) {
    const client = new KeyenceClient({ ip: cfg.ip, porta: cfg.porta });
    const manager = new CameraManager({
      cameraId: cfg.id,
      client,
      logger,
      maxProgramas: config.camera.programScanMax,
      intervaloDescobertaMs: config.camera.programScanDelayMs,
      programCache: new ProgramCache({ cameraId: cfg.id }),
    });
    cameraManagers.set(cfg.id, manager);
  }

  const sb = createSupabase(config);
  const healthchecker = criarHealthchecker({
    ping: async () => {
      const { error } = await sb.from('embarques').select('numero_embarque').limit(1);
      if (error) throw error;
    },
    limite: config.sync.failureThreshold,
  });
  const pusher = criarPusher({
    db,
    enviarBatch: async ({ tabela, payload }) => {
      if (tabela === 'sessoes_contagem') await upsertSessao(sb, payload);
      else if (tabela === 'eventos_log') await upsertEvento(sb, { ...payload, origem: 'edge_pc', id_local: payload.id_local });
    },
    logger,
  });
  const poller = criarPoller({
    db,
    buscarAlteracoes: (tabela, cursor) => buscarAlteracoes(sb, tabela, cursor),
    logger,
  });
  const syncWorker = criarSyncWorker({ healthchecker, pusher, poller, logger });
  syncWorker.on('estado', ({ novo }) => wsHub.broadcast('sync.status', { estado: novo }));

  const enfileirarSync = (tabela, payload) => enfileirar(db, tabela, payload);
  const wrapEvento = (ev) => {
    const timestamp = ev.timestamp ?? new Date().toISOString();
    const idLocal = registrarEvento(db, { ...ev, timestamp });
    enfileirarSync('eventos_log', { ...ev, timestamp, id_local: idLocal, origem: 'edge_pc' });
  };

  const sessaoService = criarSessaoService({
    db, cameraManagers,
    registrarEvento: wrapEvento,
    enfileirarSync,
    gerarUUID: randomUUID,
    broadcast: wsHub.broadcast,
  });
  const contagemService = criarContagemService({
    db,
    registrarEvento: wrapEvento,
    enfileirarSync,
    broadcast: wsHub.broadcast,
  });

  const atualizarProgramasDaCamera = (manager) => atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: (cameraId) => Boolean(buscarAtivaPorCamera(db, cameraId)),
    logger,
  });

  for (const manager of cameraManagers.values()) {
    manager.on('pulso', (p) => contagemService.processarPulso({
      cameraId: p.cameraId,
      contagem: p.contagem,
      total_dia: p.total_dia,
      brilho: p.brilho,
    }));
    manager.on('estado', (estado) => wsHub.broadcast('camera.estado', { cameraId: manager.cameraId, estado }));
    manager.on('conectada', () => {
      atualizarProgramasDaCamera(manager).catch((e) => logger.warn({ err: e, cameraId: manager.cameraId }, 'refresh de programas falhou'));
    });
  }

  rotaHealth(fastify, { db, syncWorker, cameraManagers });
  rotasEmbarques(fastify, { db });
  rotasOPs(fastify, { db });
  rotasOperadores(fastify, { db });
  rotasProgramas(fastify, { cameraManagers });
  rotasSessoes(fastify, { sessaoService });
  rotasRelatorios(fastify, { db });
  rotasEventos(fastify, { db });

  await fastify.listen({ host: config.http.host, port: config.http.port });
  logger.info({ port: config.http.port }, 'HTTP ouvindo');

  for (const m of cameraManagers.values()) m.conectar().catch(e => logger.warn({ err: e, cameraId: m.cameraId }, 'falha inicial na câmera'));

  setInterval(() => syncWorker.tick().catch(e => logger.error({ err: e }, 'sync tick falhou')), config.sync.pollerIntervalMs);
  syncWorker.tick().catch(() => {});
}

main().catch(e => { logger.fatal({ err: e }, 'falha fatal'); process.exit(1); });
