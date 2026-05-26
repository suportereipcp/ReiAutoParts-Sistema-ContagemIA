import { PainelContagem } from './ui/composites/painel-contagem.js';

export function renderTV({ sessoes }) {
  const el = document.createElement('div');
  el.className = 'grid grid-cols-2 gap-12 w-full';
  // Câmera 1 sempre à esquerda, câmera 2 à direita (ordem crescente por id).
  const ativas = [...sessoes.todas()].sort((a, b) => Number(a.camera_id) - Number(b.camera_id));
  if (ativas.length === 0) {
    el.className = 'flex items-center justify-center w-full';
    el.innerHTML = '<p class="text-6xl font-headline text-outline">Nenhuma sessão ativa</p>';
    return el;
  }
  for (const s of ativas) el.appendChild(PainelContagem({ sessao: s, liveImage: true }));
  return el;
}
