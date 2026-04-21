import { Icon } from './icon.js';

export function SideNav({ titulo = 'Rei AutoParts', subtitulo = '', itens = [], ativo = '' } = {}) {
  const aside = document.createElement('aside');
  aside.className = 'fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col py-6 px-4 z-50';

  const header = document.createElement('div');
  header.className = 'flex items-center gap-3 px-2 mb-10';
  header.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
      <span class="material-symbols-outlined">factory</span>
    </div>
    <div>
      <h2 class="font-black text-on-surface font-headline text-sm tracking-wide">${titulo}</h2>
      <p class="text-[10px] uppercase tracking-widest text-primary/60">${subtitulo}</p>
    </div>
  `;
  aside.appendChild(header);

  const nav = document.createElement('nav');
  nav.className = 'flex-1 space-y-1';
  for (const it of itens) {
    const a = document.createElement('a');
    a.href = it.href;
    const isAtivo = it.id === ativo;
    a.className = isAtivo
      ? 'flex items-center gap-3 px-3 py-2.5 bg-surface-container-lowest text-primary rounded-lg shadow-sm font-semibold transition-all'
      : 'flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container transition-all rounded-lg';
    if (isAtivo) a.dataset.ativo = 'true';
    a.appendChild(Icon(it.icone));
    a.appendChild(document.createTextNode(it.label));
    nav.appendChild(a);
  }
  aside.appendChild(nav);
  return aside;
}
