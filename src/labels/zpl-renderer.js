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

function campo(x, y, fonte, valor) {
  return `^FT${x},${y}^A0N,${fonte}^FH\\^CI28^FD${sanitizar(valor)}^FS^CI27`;
}

function quebrarOperadores(operadores, maxChars = 22) {
  const linhas = [];
  let atual = '';
  for (const op of operadores) {
    const proximo = atual ? `${atual}, ${op}` : String(op);
    if (proximo.length > maxChars && atual) { linhas.push(atual); atual = String(op); }
    else { atual = proximo; }
  }
  if (atual) linhas.push(atual);
  return linhas.slice(0, 3);
}

export function renderizarEtiquetaCaixaZpl(documento, config = {}) {
  const largura = Number(config.larguraDots ?? 1181);
  const altura = Number(config.alturaDots ?? 709);
  const total = Math.max(documento.linhas.length, 1);
  const data = dataBR(documento.gerada_em);
  const caixa = documento.numero_caixa_exibicao ?? '';
  const nf = documento.numero_nota_fiscal ?? '';

  return documento.linhas.map((linha, index) => {
    const operadores = quebrarOperadores(linha.operadores ?? []);
    const opLinhas = operadores
      .map((txt, i) => campo(416, 518 + i * 58, '60,61', txt))
      .join('\n');

    const payload_zpl = [
      '^XA',
      '^MMT',
      `^PW${largura}`,
      `^LL${altura}`,
      '^LS0',
      '^FT45,107^A0N,67,71^FH\\^CI28^FDPRODUTO:^FS^CI27',
      campo(380, 108, '67,66', linha.item_codigo),
      '^FT44,213^A0N,68,71^FH\\^CI28^FDQTIDADE:^FS^CI27',
      campo(369, 215, '60,61', linha.quantidade_total),
      '^FT613,213^A0N,68,71^FH\\^CI28^FDEMBARQ:^FS^CI27',
      campo(911, 215, '60,61', documento.numero_embarque),
      '^FT46,311^A0N,68,71^FH\\^CI28^FDOP:^FS^CI27',
      campo(173, 316, '60,61', linha.codigo_op),
      '^FT616,311^A0N,68,66^FH\\^CI28^FDN.F:^FS^CI27',
      campo(755, 311, '60,61', nf),
      '^FT46,411^A0N,68,71^FH\\^CI28^FDDATA:^FS^CI27',
      campo(244, 413, '60,61', data),
      '^FT616,411^A0N,68,71^FH\\^CI28^FDCX:^FS^CI27',
      campo(751, 411, '68,71', caixa),
      '^FT46,519^A0N,68,71^FH\\^CI28^FDOPERADOR:^FS^CI27',
      opLinhas,
      `^FT969,691^BQN,2,8^FDMA,${sanitizar(caixa)}^FS`,
      '^FO16,17^GB1146,0,10^FS',
      '^FO1154,16^GB0,673,12^FS',
      '^FO14,16^GB0,667,10^FS',
      '^FO16,681^GB1146,0,10^FS',
      '^PQ1,0,1,Y',
      '^XZ',
    ].filter(Boolean).join('\n');

    return { parte_numero: index + 1, partes_total: total, payload_zpl };
  });
}
