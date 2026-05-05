const PREFIXO_CAIXA_SEM_NUMERO = '__SEM_NUMERO__';

export function rotuloCaixa(numeroCaixa) {
  if (!numeroCaixa) return '-';
  if (!String(numeroCaixa).startsWith(PREFIXO_CAIXA_SEM_NUMERO)) return numeroCaixa;
  const sufixo = Number(String(numeroCaixa).slice(PREFIXO_CAIXA_SEM_NUMERO.length));
  if (!Number.isFinite(sufixo) || sufixo <= 0) return 'Sem número';
  return `Sem número #${sufixo}`;
}

export function agruparCaixas(sessoes = []) {
  const porCaixa = new Map();
  for (const sessao of sessoes) {
    if (!sessao?.numero_caixa || sessao.status === 'cancelada') continue;
    const atual = porCaixa.get(sessao.numero_caixa) ?? {
      id: sessao.numero_caixa,
      numero_caixa: sessao.numero_caixa,
      numero_caixa_exibicao: rotuloCaixa(sessao.numero_caixa),
      codigo_op: sessao.codigo_op,
      quantidade_total: 0,
      atualizado_em: sessao.encerrada_em ?? sessao.iniciada_em ?? null,
    };
    atual.quantidade_total += Number(sessao.quantidade_total) || 0;
    const candidato = sessao.encerrada_em ?? sessao.iniciada_em ?? null;
    if (candidato && (!atual.atualizado_em || candidato > atual.atualizado_em)) {
      atual.atualizado_em = candidato;
    }
    porCaixa.set(sessao.numero_caixa, atual);
  }
  return [...porCaixa.values()].sort((a, b) => (b.atualizado_em ?? '').localeCompare(a.atualizado_em ?? ''));
}
