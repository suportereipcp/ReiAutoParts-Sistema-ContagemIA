import { Modal } from '../primitives/modal.js';

export function abrirModalEmitir({ numero, onBaixar }) {
  const m = Modal({ title: `Emitir Relatório — ${numero}`, subtitle: 'Selecione o formato de saída.' });
  m.abrir();
  const body = m.corpo();
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-4';
  for (const fmt of ['csv', 'xlsx', 'pdf']) {
    const b = document.createElement('button');
    b.dataset.fmt = fmt;
    b.className = 'flex flex-col items-center gap-3 p-6 bg-surface-container-high hover:bg-secondary-container/40 rounded-xl transition-colors';
    b.innerHTML = `<span class="material-symbols-outlined text-4xl text-secondary">description</span><span class="text-sm font-bold uppercase tracking-widest">${fmt}</span>`;
    b.addEventListener('click', () => { onBaixar(fmt); m.fechar(); });
    grid.appendChild(b);
  }
  body.appendChild(grid);
}
