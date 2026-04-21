import { abrirModalEmitir } from '../ui/composites/modal-emitir-relatorio.js';

export async function renderEmitirRelatorios(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const header = document.createElement('section');
  header.className = 'flex justify-between items-end';
  header.innerHTML = `
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Gestão de Cargas</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Emitir Relatórios</h2>
    </div>
    <a data-link-agrupadas href="#/relatorios/abertas" class="text-xs font-semibold text-primary px-4 py-2 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all">
      Ver Cargas Abertas Agrupadas
    </a>
  `;
  el.appendChild(header);

  const lista = await ctx.api.get('/embarques');
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';

  for (const emb of lista) {
    const card = document.createElement('button');
    card.dataset.embarque = emb.numero_embarque;
    card.className = 'text-left bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient hover:bg-secondary-container/20 transition-colors';
    card.innerHTML = `
      <div class="flex justify-between mb-3">
        <span class="text-[10px] uppercase tracking-[0.2em] text-outline font-bold">Embarque</span>
        <span class="text-[10px] uppercase tracking-widest text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded">${emb.status}</span>
      </div>
      <h3 class="text-2xl font-headline font-light">${emb.numero_embarque}</h3>
    `;
    card.addEventListener('click', () => abrirModalEmitir({
      numero: emb.numero_embarque,
      onBaixar: (fmt) => { window.location.href = `/relatorios/embarque/${encodeURIComponent(emb.numero_embarque)}?fmt=${fmt}`; },
    }));
    grid.appendChild(card);
  }
  el.appendChild(grid);
  return el;
}
