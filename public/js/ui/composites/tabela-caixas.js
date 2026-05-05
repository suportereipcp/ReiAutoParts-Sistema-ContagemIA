import { formatarNumero, formatarHora } from '../../infra/formatters.js';
import { rotuloCaixa } from '../../domain/caixas.js';

export function TabelaCaixas({ caixas = [], onReimprimir } = {}) {
  const el = document.createElement('section');
  el.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  if (caixas.length === 0) {
    el.innerHTML = '<p class="text-on-surface-variant text-sm">Nenhuma caixa registrada ainda.</p>';
    return el;
  }
  const linhas = caixas.map(c => `
    <div data-linha-caixa class="grid grid-cols-5 py-3 text-sm items-center">
      <span class="font-medium text-on-surface">${c.numero_caixa_exibicao ?? rotuloCaixa(c.numero_caixa)}</span>
      <span class="text-on-surface-variant">${c.codigo_op}</span>
      <span class="text-on-surface font-semibold">${formatarNumero(c.quantidade_total)}</span>
      <span class="text-on-surface-variant">${formatarHora(c.atualizado_em ?? c.encerrada_em ?? c.iniciada_em)}</span>
      <span class="text-right">
        <button data-reimprimir-caixa class="text-xs font-bold text-primary hover:underline" type="button">Reimprimir</button>
      </span>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="grid grid-cols-5 pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Caixa</span><span>OP</span><span>Peças</span><span>Hora</span><span class="text-right">Ações</span>
    </div>
    ${linhas}
  `;
  [...el.querySelectorAll('[data-linha-caixa]')].forEach((linha, index) => {
    linha.querySelector('[data-reimprimir-caixa]')?.addEventListener('click', () => onReimprimir?.(caixas[index]));
  });
  return el;
}
