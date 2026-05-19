import fs from 'node:fs/promises';
import { arquivoNdjson, arquivoLive, pastaDataCamera, dataDeInicio } from './paths.js';
import { chunksPendentes, replayNdjson } from './pulse-audit-replay.js';

function ehLinhaPulso(linha) {
  try {
    const obj = JSON.parse(linha);
    return !obj.type && obj.t && typeof obj.n === 'number';
  } catch { return false; }
}

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

export async function criarPulseAuditLogger({
  base, header, flushPulses, flushSecondsMs, timeZone,
  chunkUploader, gerarUUID, now = () => new Date().toISOString(),
  setTimeout: setTimeoutInjetado = setTimeout,
  clearTimeout: clearTimeoutInjetado = clearTimeout,
  logger,
} = {}) {
  const data = dataDeInicio(header.iniciada, timeZone);
  const pasta = pastaDataCamera(base, data, header.camera);
  const ndjson = arquivoNdjson(base, data, header.camera, header.sessao);
  const live = arquivoLive(base, data, header.camera, header.sessao);

  await fs.mkdir(pasta, { recursive: true });

  const conteudoExistente = await fs.readFile(ndjson, 'utf8').catch(() => '');
  const estado = replayNdjson(conteudoExistente);
  if (!estado.header) {
    await fs.appendFile(ndjson, JSON.stringify({ type: 'session-header', ...header, status: 'Aberto' }) + '\n');
  }

  let proximoSeq = estado.proximo_chunk_seq;
  let pulsosNoLive = 0;
  const liveExistente = await fs.readFile(live, 'utf8').catch(() => '');
  if (liveExistente) pulsosNoLive = liveExistente.split('\n').filter(ehLinhaPulso).length;

  let timerHandle = null;
  function agendarTimer() {
    if (timerHandle) clearTimeoutInjetado(timerHandle);
    timerHandle = setTimeoutInjetado(() => { flushPorTempo().catch(() => {}); }, flushSecondsMs);
  }

  async function appendPulso(pulso) {
    await fs.appendFile(live, JSON.stringify(pulso) + '\n');
    pulsosNoLive++;
    if (pulsosNoLive >= flushPulses) await flush();
    else if (pulsosNoLive === 1) agendarTimer();
  }

  async function flush() {
    if (timerHandle) { clearTimeoutInjetado(timerHandle); timerHandle = null; }
    const conteudo = await fs.readFile(live, 'utf8').catch(() => '');
    const linhasPulso = conteudo.split('\n').filter(ehLinhaPulso);
    if (linhasPulso.length === 0) { pulsosNoLive = 0; return null; }

    const pulsos = linhasPulso.map((l) => JSON.parse(l));
    const seq = proximoSeq++;
    const gravadoEm = now();
    const desde = pulsos[0].t;
    const ate = pulsos[pulsos.length - 1].t;
    const contagemAcumulada = pulsos[pulsos.length - 1].n;

    const bloco = [
      JSON.stringify({ type: 'chunk-start', seq, gravado_em: gravadoEm, desde }),
      ...linhasPulso,
      JSON.stringify({ type: 'chunk-end', seq, pulsos: pulsos.length, contagem_acumulada: contagemAcumulada, ate }),
    ];
    await fs.appendFile(ndjson, bloco.join('\n') + '\n');
    await fs.truncate(live, 0).catch(async () => { await fs.writeFile(live, ''); });
    pulsosNoLive = 0;

    const chunk = {
      id: gerarUUID(),
      sessao_id: header.sessao, camera_id: header.camera, chunk_seq: seq,
      pulsos_json: pulsos, gravado_em: gravadoEm,
    };
    const resultado = await chunkUploader.upload(chunk);
    const tentativa = { type: 'upload-attempt', chunk: seq, at: now(), status: resultado.status };
    if (resultado.status === 'success') tentativa.destacado = true;
    if (resultado.reason) tentativa.reason = resultado.reason;
    await fs.appendFile(ndjson, JSON.stringify(tentativa) + '\n');
    return { seq, resultado };
  }

  async function flushPorTempo() { return flush(); }

  async function retryPendentes() {
    const conteudo = await fs.readFile(ndjson, 'utf8').catch(() => '');
    const estadoAtual = replayNdjson(conteudo);
    const pendentes = chunksPendentes(estadoAtual);
    for (const c of pendentes) {
      const pulsos = extrairPulsosDoChunk(conteudo, c.seq);
      const payload = {
        id: gerarUUID(),
        sessao_id: header.sessao, camera_id: header.camera, chunk_seq: c.seq,
        pulsos_json: pulsos, gravado_em: c.gravado_em,
      };
      const r = await chunkUploader.upload(payload);
      const tentativa = { type: 'upload-attempt', chunk: c.seq, at: now(), status: r.status };
      if (r.status === 'success') tentativa.destacado = true;
      if (r.reason) tentativa.reason = r.reason;
      await fs.appendFile(ndjson, JSON.stringify(tentativa) + '\n');
    }
  }

  async function fechar({ encerradaEm }) {
    await flush();
    await fs.unlink(live).catch(() => {});
    if (timerHandle) { clearTimeoutInjetado(timerHandle); timerHandle = null; }

    await retryPendentes();

    const conteudo = await fs.readFile(ndjson, 'utf8');
    const aindaPendentes = chunksPendentes(replayNdjson(conteudo));
    const statusFinal = aindaPendentes.length === 0 ? 'Fechado' : 'Envio-Pendente';
    await fs.appendFile(ndjson, JSON.stringify({
      type: 'session-status', status: statusFinal, at: now(), encerrada: encerradaEm,
    }) + '\n');
    return { status: statusFinal };
  }

  return {
    appendPulso, flush, flushPorTempo, fechar, retryPendentes,
    sessaoId: header.sessao, cameraId: header.camera,
    arquivoNdjson: ndjson, arquivoLive: live,
  };
}
