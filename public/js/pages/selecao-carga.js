import { CardCarga } from '../ui/composites/card-carga.js';
import { Button } from '../ui/primitives/button.js';

export async function renderSelecaoCarga(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const header = document.createElement('section');
  header.className = 'flex justify-between items-end';
  header.innerHTML = `
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Expedição</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Selecionar Carga</h2>
      <p class="text-sm text-on-surface-variant font-light">Escolha um embarque aberto ou inicie uma nova carga.</p>
    </div>
  `;

  const btn = Button({
    texto: 'Nova Carga',
    icone: 'add',
    variante: 'primary',
    onClick: async () => {
      const { abrirModalNovaCarga } = await import('../ui/composites/modal-nova-carga.js');
      abrirModalNovaCarga(ctx);
    },
  });
  btn.dataset.abrirNovaCarga = 'true';
  header.appendChild(btn);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  try {
    const lista = await ctx.catalogos.embarquesAbertos();
    for (const e of lista) grid.appendChild(CardCarga(e));
  } catch (err) {
    grid.innerHTML = `<p class="text-on-surface-variant">Falha ao carregar: ${err.message}</p>`;
  }

  el.appendChild(header);
  el.appendChild(grid);
  return el;
}
