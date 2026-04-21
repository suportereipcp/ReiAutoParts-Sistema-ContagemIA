import { formatarNumero, formatarHora } from '../../infra/formatters.js';

export function TabelaCaixas({ caixas = [] } = {}) {
  const el = document.createElement('section');
  el.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  if (caixas.length === 0) {
    el.innerHTML = '<p class="text-on-surface-variant text-sm">Nenhuma caixa registrada ainda.</p>';
    return el;
  }
  const linhas = caixas.map(c => `
    <div data-linha-caixa class="grid grid-cols-4 py-3 text-sm">
      <span class="font-medium text-on-surface">${c.numero_caixa ?? '-'}</span>
      <span class="text-on-surface-variant">${c.codigo_op}</span>
      <span class="text-on-surface font-semibold">${formatarNumero(c.quantidade_total)}</span>
      <span class="text-on-surface-variant text-right">${formatarHora(c.encerrada_em ?? c.iniciada_em)}</span>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="grid grid-cols-4 pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Caixa</span><span>OP</span><span>Peças</span><span class="text-right">Hora</span>
    </div>
    ${linhas}
  `;
  return el;
}
