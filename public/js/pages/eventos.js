import { formatarHora } from '../infra/formatters.js';

const COR_NIVEL = {
  INFO: 'text-on-surface-variant',
  SUCCESS: 'text-on-secondary-container',
  WARN: 'text-amber-700',
  ERROR: 'text-on-error-container',
};

export async function renderEventos(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';
  el.innerHTML = `
    <section>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Observabilidade</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Eventos</h2>
    </section>
  `;
  const eventos = await ctx.api.get('/eventos');
  const tabela = document.createElement('section');
  tabela.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  tabela.innerHTML = `
    <div class="grid grid-cols-[80px_100px_140px_1fr] pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Hora</span><span>Nível</span><span>Categoria</span><span>Mensagem</span>
    </div>
    ${eventos.map(e => `
      <div data-linha-evento class="grid grid-cols-[80px_100px_140px_1fr] py-3 text-sm">
        <span class="text-on-surface-variant">${formatarHora(e.timestamp)}</span>
        <span class="${COR_NIVEL[e.nivel] ?? 'text-on-surface-variant'} font-semibold">${e.nivel}</span>
        <span class="text-on-surface-variant">${e.categoria}</span>
        <span class="text-on-surface">${e.mensagem}</span>
      </div>
    `).join('')}
  `;
  el.appendChild(tabela);
  return el;
}
