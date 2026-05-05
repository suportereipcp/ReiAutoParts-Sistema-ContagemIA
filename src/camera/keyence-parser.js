const PULSO_RE = /^(\d{2}),\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?(?:\s*,\s*(\d+))?$/;
const NUMERICO_RE = /^\d+$/;

function ehNumerico(valor) {
  return NUMERICO_RE.test(String(valor ?? '').trim());
}

function parsePulsoRT(linha) {
  const parts = linha.split(',').map(p => p.trim());
  if (parts[0] !== 'RT' || parts.length < 6) return null;

  const numeroResultado = parts[1];
  const statusGeral = parts[2];
  if (!ehNumerico(numeroResultado)) return null;

  const candidatos = [
    { inicio: 3, tamanho: 3, indiceBrilho: null },
    { inicio: 6, tamanho: 4, indiceBrilho: 3 },
  ];

  for (const { inicio, tamanho, indiceBrilho } of candidatos) {
    if (parts.length < inicio + tamanho) continue;
    const ferramenta = parts[inicio];
    const contagem = parts[inicio + 1];
    const totalDia = parts[inicio + 2];
    const brilho = indiceBrilho == null ? '0' : parts[inicio + indiceBrilho];
    if (![ferramenta, contagem, totalDia, brilho].every(ehNumerico)) continue;

    return {
      tipo: 'pulso',
      ferramenta: Number(ferramenta),
      contagem: Number(contagem),
      total_dia: Number(totalDia),
      brilho: Number(brilho),
      numero_resultado: Number(numeroResultado),
      status_geral: statusGeral,
    };
  }

  return null;
}

export function parsePulso(linha) {
  if (!linha) return null;
  const trimmed = linha.trim();
  const rt = parsePulsoRT(trimmed);
  if (rt) return rt;

  const m = trimmed.match(PULSO_RE);
  if (!m) return null;
  const pulso = {
    tipo: 'pulso',
    ferramenta: Number(m[1]),
    contagem: Number(m[2]),
    total_dia: Number(m[3]),
    brilho: Number(m[4]),
  };
  if (m[5] != null) pulso.pixels_objeto = Number(m[5]);
  if (m[6] != null) pulso.frames_detectados = Number(m[6]);
  return pulso;
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
