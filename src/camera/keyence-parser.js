const PULSO_RE = /^(\d{2}),\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/;

export function parsePulso(linha) {
  if (!linha) return null;
  const m = linha.trim().match(PULSO_RE);
  if (!m) return null;
  return {
    tipo: 'pulso',
    ferramenta: Number(m[1]),
    contagem: Number(m[2]),
    total_dia: Number(m[3]),
    brilho: Number(m[4]),
  };
}

export function parseRespostaComando(linha) {
  if (!linha) return null;
  const trimmed = linha.trim();
  const parts = trimmed.split(',').map(p => p.trim());
  if (parts[0] === 'ER') {
    return {
      tipo: 'erro',
      comando: parts[1] ?? '',
      codigo: Number(parts[2] ?? 0),
    };
  }
  return {
    tipo: 'resposta',
    comando: parts[0],
    valores: parts.slice(1),
  };
}

export function parseLinha(linha) {
  return parsePulso(linha) ?? parseRespostaComando(linha);
}
