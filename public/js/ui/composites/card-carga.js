import { formatarData } from '../../infra/formatters.js';

export function CardCarga({ numero_embarque = '', motorista = '-', placa = '-', data_criacao, status = 'aberto', href } = {}) {
  const a = document.createElement('a');
  a.href = href ?? `#/cargas/${encodeURIComponent(numero_embarque)}`;
  const badgeClass = status === 'fechado'
    ? 'text-on-primary-container bg-primary-container'
    : 'text-on-secondary-container bg-secondary-container';
  a.className = 'block bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient hover:bg-secondary-container/20 transition-colors';
  a.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Embarque</span>
      <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${badgeClass}">${status}</span>
    </div>
    <h3 class="text-2xl font-headline font-light text-on-surface mb-2">${numero_embarque}</h3>
    <p class="text-sm text-on-surface-variant">${motorista} · ${placa}</p>
    <p class="text-xs text-outline mt-3">${formatarData(data_criacao)}</p>
  `;
  return a;
}
