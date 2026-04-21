import { PainelContagem } from './ui/composites/painel-contagem.js';

export function renderTV({ sessoes }) {
  const el = document.createElement('div');
  el.className = 'grid grid-cols-2 gap-12 w-full';
  const ativas = sessoes.todas();
  if (ativas.length === 0) {
    el.className = 'flex items-center justify-center w-full';
    el.innerHTML = '<p class="text-6xl font-headline text-outline">Nenhuma sessão ativa</p>';
    return el;
  }
  for (const s of ativas) el.appendChild(PainelContagem({ sessao: s }));
  return el;
}
