import { formatarNumero } from '../../infra/formatters.js';

export function PainelContagem({ sessao }) {
  const el = document.createElement('section');
  el.className = 'bg-surface-container-lowest rounded-2xl p-10 zen-shadow-ambient';
  el.innerHTML = `
    <div class="flex items-baseline justify-between mb-6">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Câmera ${sessao.camera_id}</p>
        <h3 class="font-headline text-2xl text-on-surface">${sessao.programa_nome ?? 'Aguardando programa'}</h3>
      </div>
      <span data-sessao-id="${sessao.id}" class="text-[10px] font-mono text-outline">${sessao.id.slice(0, 8)}</span>
    </div>
    <div data-contagem class="font-headline text-[10rem] font-extralight leading-none text-primary tracking-tight text-center py-6">${formatarNumero(sessao.quantidade_total ?? 0)}</div>
    <p class="text-center text-[10px] uppercase tracking-[0.3em] text-outline">Peças</p>
  `;
  return el;
}
