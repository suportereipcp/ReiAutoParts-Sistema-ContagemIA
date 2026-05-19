import fs from 'node:fs/promises';
import path from 'node:path';
import { criarPulseAuditLogger } from './pulse-audit-logger.js';
import { replayNdjson, chunksPendentes } from './pulse-audit-replay.js';

function extrairPulsosDoChunk(conteudo, seq) {
  const pulsos = [];
  let dentro = false;
  for (const linha of conteudo.split('\n')) {
    const limpa = linha.trim();
    if (!limpa) continue;
    let ev; try { ev = JSON.parse(limpa); } catch { continue; }
    if (ev.type === 'chunk-start' && ev.seq === seq) { dentro = true; continue; }
    if (ev.type === 'chunk-end' && ev.seq === seq) { dentro = false; continue; }
    if (dentro && !ev.type && ev.t) pulsos.push(ev);
  }
  return pulsos;
}

export function criarPulseAuditService({
  config, chunkUploader, gerarUUID,
  now = () => new Date().toISOString(),
  setTimeout: setTimeoutInjetado = setTimeout,
  clearTimeout: clearTimeoutInjetado = clearTimeout,
  setInterval: setIntervalInjetado = setInterval,
  clearInterval: clearIntervalInjetado = clearInterval,
  logger,
} = {}) {
  const registry = new Map();
  let retryTimer = null;

  async function abrir(header) {
    const novo = await criarPulseAuditLogger({
      base: config.baseDir, header,
      flushPulses: config.flushPulses, flushSecondsMs: config.flushSeconds * 1000,
      timeZone: config.timeZone, chunkUploader, gerarUUID, now,
      setTimeout: setTimeoutInjetado, clearTimeout: clearTimeoutInjetado, logger,
    });
    registry.set(header.sessao, novo);
    return novo;
  }

  async function fechar(sessaoId, { encerradaEm }) {
    const lg = registry.get(sessaoId);
    if (!lg) return null;
    const r = await lg.fechar({ encerradaEm });
    registry.delete(sessaoId);
    return r;
  }

  async function appendPulso(sessaoId, pulso) {
    const lg = registry.get(sessaoId);
    if (!lg) return;
    await lg.appendPulso(pulso);
  }

  function obterLogger(sessaoId) { return registry.get(sessaoId); }

  async function recuperarSessoesAtivas(sessoesAbertas) {
    for (const s of sessoesAbertas) {
      await abrir({
        sessao: s.id, camera: s.camera_id, operador: s.codigo_operador,
        embarque: s.numero_embarque, op: s.codigo_op, programa: s.programa ?? null,
        iniciada: s.iniciada_em,
      });
    }
  }

  async function listarArquivosPendentes() {
    const base = config.baseDir;
    const resultado = [];
    let dirsData;
    try { dirsData = await fs.readdir(base, { withFileTypes: true }); } catch { return []; }
    for (const ed of dirsData) {
      if (!ed.isDirectory()) continue;
      const dirData = path.join(base, ed.name);
      let dirsCam;
      try { dirsCam = await fs.readdir(dirData, { withFileTypes: true }); } catch { continue; }
      for (const ec of dirsCam) {
        if (!ec.isDirectory()) continue;
        const dirCam = path.join(dirData, ec.name);
        let arquivos;
        try { arquivos = await fs.readdir(dirCam); } catch { continue; }
        for (const nome of arquivos) {
          if (!nome.endsWith('.ndjson')) continue;
          const arquivo = path.join(dirCam, nome);
          const conteudo = await fs.readFile(arquivo, 'utf8').catch(() => '');
          const estado = replayNdjson(conteudo);
          if (estado.status === 'Envio-Pendente') resultado.push({ arquivo, estado, conteudo });
        }
      }
    }
    return resultado;
  }

  async function executarRetry() {
    const pendentes = await listarArquivosPendentes();
    for (const item of pendentes) {
      const restantes = chunksPendentes(item.estado);
      for (const c of restantes) {
        const pulsos = extrairPulsosDoChunk(item.conteudo, c.seq);
        const payload = {
          id: gerarUUID(),
          sessao_id: item.estado.header.sessao,
          camera_id: item.estado.header.camera,
          chunk_seq: c.seq,
          pulsos_json: pulsos,
          gravado_em: c.gravado_em,
        };
        const r = await chunkUploader.upload(payload);
        const tentativa = { type: 'upload-attempt', chunk: c.seq, at: now(), status: r.status };
        if (r.status === 'success') tentativa.destacado = true;
        if (r.reason) tentativa.reason = r.reason;
        await fs.appendFile(item.arquivo, JSON.stringify(tentativa) + '\n');
      }
      const novoConteudo = await fs.readFile(item.arquivo, 'utf8');
      const aindaPendentes = chunksPendentes(replayNdjson(novoConteudo));
      if (aindaPendentes.length === 0) {
        await fs.appendFile(item.arquivo,
          JSON.stringify({ type: 'session-status', status: 'Fechado', at: now() }) + '\n');
      }
    }
  }

  function iniciarRetryLoop() {
    if (retryTimer) return;
    retryTimer = setIntervalInjetado(() => {
      executarRetry().catch((e) => logger?.warn?.({ err: e }, 'erro no retry loop'));
    }, config.retrySeconds * 1000);
  }

  function pararRetryLoop() {
    if (retryTimer) { clearIntervalInjetado(retryTimer); retryTimer = null; }
  }

  return {
    abrir, fechar, appendPulso, obterLogger,
    recuperarSessoesAtivas, executarRetry,
    iniciarRetryLoop, pararRetryLoop,
  };
}
