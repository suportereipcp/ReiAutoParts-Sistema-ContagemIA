// ---------------------------------------------------------------------------
// ZPL Renderer — Etiqueta de Caixa (v2)
// Layout: 100×70mm @ 203 DPI (799×559 dots)
// 3 faixas: Topo (produto+OP), Meio (metadados 2 colunas), Rodapé (QR+paginação)
// ---------------------------------------------------------------------------

function sanitizar(text, max = 40) {
  return String(text ?? '')
    .replace(/[\^~\\]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, max);
}

function dataBR(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  });
  return fmt.format(d);
}

function horaLocal(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return fmt.format(d);
}

function label(x, y, tamanho, texto) {
  return `^FT${x},${y}^A0N,${tamanho},${tamanho}^FH\\^CI28^FD${texto}^FS^CI27`;
}

function valor(x, y, tamanho, texto) {
  return `^FT${x},${y}^A0N,${tamanho},${tamanho}^FH\\^CI28^FD${sanitizar(texto)}^FS^CI27`;
}

function linhaH(x, y, largura, espessura = 2) {
  return `^FO${x},${y}^GB${largura},0,${espessura}^FS`;
}

function linhaV(x, y, altura, espessura = 2) {
  return `^FO${x},${y}^GB0,${altura},${espessura}^FS`;
}

function quebrarOperadores(operadores, maxChars = 28) {
  const linhas = [];
  let atual = '';
  for (const op of operadores) {
    const proximo = atual ? `${atual}, ${op}` : String(op);
    if (proximo.length > maxChars && atual) { linhas.push(atual); atual = String(op); }
    else { atual = proximo; }
  }
  if (atual) linhas.push(atual);
  return linhas.slice(0, 2);
}

function montarQrPayload(documento, linha, sequencia) {
  const obj = {
    e: sanitizar(documento.numero_embarque, 10),
    cx: sanitizar(documento.numero_caixa_exibicao ?? '', 10),
    op: sanitizar(linha.codigo_op, 12),
    qt: Number(linha.quantidade_total ?? 0),
  };
  if (sequencia) obj.seq = sequencia;
  return JSON.stringify(obj);
}

export function renderizarEtiquetaCaixaZpl(documento, config = {}) {
  const largura = Number(config.larguraDots ?? 799);
  const altura = Number(config.alturaDots ?? 559);
  const total = Math.max(documento.linhas.length, 1);
  const data = dataBR(documento.gerada_em);
  const hora = horaLocal(documento.gerada_em);
  const caixa = documento.numero_caixa_exibicao ?? '';
  const nf = documento.numero_nota_fiscal ?? '';
  const sequencia = documento.sequencia_caixa ?? '';

  return documento.linhas.map((linha, index) => {
    const operadores = quebrarOperadores(linha.operadores ?? []);
    const qrData = montarQrPayload(documento, linha, sequencia);

    const cmds = [
      // --- Cabeçalho ZPL ---
      '^XA',
      '^MMT',
      `^PW${largura}`,
      `^LL${altura}`,
      '^LS0',

      // --- Bordas externas (espessura 4) ---
      linhaH(10, 10, largura - 20, 4),       // topo
      linhaH(10, altura - 10, largura - 20, 4), // base
      linhaV(10, 10, altura - 20, 4),         // esquerda
      linhaV(largura - 14, 10, altura - 20, 4), // direita

      // === FAIXA TOPO (y: 10–180) — Produto + OP ===
      label(30, 50, 22, 'PRODUTO:'),
      valor(30, 95, 48, linha.item_codigo),
      label(30, 135, 22, 'OP:'),
      valor(100, 135, 40, linha.codigo_op),

      // Separador topo/meio
      linhaH(10, 165, largura - 20, 2),

      // === FAIXA MEIO (y: 165–430) — 2 colunas ===
      // Coluna esquerda
      label(30, 200, 20, 'QTDE:'),
      valor(120, 200, 36, String(linha.quantidade_total ?? '')),
      label(30, 260, 20, 'DATA:'),
      valor(120, 260, 32, data),
      label(30, 315, 20, 'OPERADOR:'),
      ...operadores.map((txt, i) => valor(30, 350 + i * 35, 28, txt)),

      // Coluna direita
      label(420, 200, 20, 'EMBARQ:'),
      valor(420, 235, 36, documento.numero_embarque),
      label(420, 290, 20, 'N.F:'),
      valor(420, 320, 32, nf),
      label(420, 365, 20, 'CX:'),
      valor(480, 365, 36, caixa),
      sequencia ? valor(650, 365, 28, `(${sequencia})`) : null,

      // Separador meio/rodapé
      linhaH(10, 420, largura - 20, 2),

      // === FAIXA RODAPÉ (y: 420–549) — QR + paginação ===
      // Paginação (só se múltiplas partes)
      total > 1 ? label(30, 460, 24, `PARTE ${index + 1}/${total}`) : null,
      // Timestamp
      valor(30, 500, 20, `${data} ${hora}`),

      // QR Code (canto inferior direito)
      `^FT${largura - 140},${altura - 25}^BQN,2,5`,
      `^FDMA,${sanitizar(qrData, 80)}^FS`,

      // --- Impressão ---
      '^PQ1,0,1,Y',
      '^XZ',
    ];

    const payload_zpl = cmds.filter(Boolean).join('\n');
    return { parte_numero: index + 1, partes_total: total, payload_zpl };
  });
}
