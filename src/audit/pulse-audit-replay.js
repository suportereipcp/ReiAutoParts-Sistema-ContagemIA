export function replayNdjson(conteudo) {
  const estado = {
    header: null,
    contagem_acumulada: 0,
    proximo_chunk_seq: 1,
    chunks: {},
    status: null,
    encerrada_em: null,
  };

  const linhas = String(conteudo ?? '').split('\n');
  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa) continue;
    let ev;
    try { ev = JSON.parse(limpa); } catch { continue; }

    if (ev.type === 'session-header') {
      estado.header = ev;
      estado.status = ev.status ?? 'Aberto';
    } else if (ev.type === 'chunk-start') {
      estado.chunks[ev.seq] = {
        seq: ev.seq,
        gravado_em: ev.gravado_em,
        desde: ev.desde,
        pulsos: 0,
        sync: 'pendente',
        tentativas: [],
      };
    } else if (ev.type === 'chunk-end') {
      const chunk = estado.chunks[ev.seq] ?? (estado.chunks[ev.seq] = { seq: ev.seq, sync: 'pendente', tentativas: [] });
      chunk.pulsos = ev.pulsos;
      chunk.contagem_acumulada = ev.contagem_acumulada;
      chunk.ate = ev.ate;
      if (ev.contagem_acumulada > estado.contagem_acumulada) estado.contagem_acumulada = ev.contagem_acumulada;
      if (ev.seq >= estado.proximo_chunk_seq) estado.proximo_chunk_seq = ev.seq + 1;
    } else if (ev.type === 'upload-attempt') {
      const chunk = estado.chunks[ev.chunk];
      if (!chunk) continue;
      chunk.tentativas.push({ at: ev.at, status: ev.status, reason: ev.reason });
      chunk.sync = ev.status === 'success' ? 'enviado' : 'pendente';
    } else if (ev.type === 'session-status') {
      estado.status = ev.status;
      if (ev.encerrada && !estado.encerrada_em) estado.encerrada_em = ev.encerrada;
    }
  }
  return estado;
}

export function chunksPendentes(estado) {
  return Object.values(estado.chunks).filter((c) => c.sync === 'pendente');
}
