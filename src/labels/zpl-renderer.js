function ascii(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 80);
}

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function linhaZpl(linha, y) {
  const texto = `${linha.ordem} ${linha.codigo_op} ${linha.item_codigo ?? ''} QTD ${linha.quantidade_total} OPR ${linha.codigo_operador}`;
  const desc = ascii(linha.item_descricao);
  return [
    `^FO30,${y}^A0N,26,26^FD${ascii(texto)}^FS`,
    `^FO30,${y + 30}^A0N,20,20^FD${desc}^FS`,
  ].join('\n');
}

export function renderizarEtiquetaCaixaZpl(documento, config = {}) {
  const linhasPorParte = Number(config.linhasPorParte ?? 10);
  const largura = Number(config.larguraDots ?? 812);
  const altura = Number(config.alturaDots ?? 609);
  const grupos = chunks(documento.linhas, linhasPorParte);
  const total = Math.max(grupos.length, 1);

  return grupos.map((linhas, index) => {
    const parte = index + 1;
    const corpo = linhas.map((linha, linhaIndex) => linhaZpl(linha, 170 + linhaIndex * 62)).join('\n');
    const payload_zpl = [
      '^XA',
      '^CI27',
      `^PW${largura}`,
      `^LL${altura}`,
      '^FO30,25^A0N,34,34^FDETIQUETA DE CAIXA^FS',
      `^FO30,70^A0N,28,28^FDCaixa: ${ascii(documento.numero_caixa_exibicao)}^FS`,
      `^FO30,105^A0N,22,22^FDEmbarque: ${ascii(documento.numero_embarque)}^FS`,
      `^FO30,132^A0N,22,22^FDParte ${parte}/${total} - ${ascii(documento.motivo)}^FS`,
      corpo,
      `^FO30,${altura - 45}^A0N,20,20^FDGerada: ${ascii(documento.gerada_em)} OPR ${ascii(documento.operador_emissao)}^FS`,
      '^XZ',
    ].join('\n');
    return { parte_numero: parte, partes_total: total, payload_zpl };
  });
}
