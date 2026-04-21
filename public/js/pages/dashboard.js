export function renderDashboard(ctx) {
  const container = document.createElement('div');
  container.className = 'space-y-12';

  const hero = document.createElement('section');
  hero.className = 'mb-12';
  hero.innerHTML = `
    <p class="text-on-secondary-container font-medium tracking-widest text-xs uppercase mb-1">Sessão Ativa</p>
    <h2 class="text-3xl font-light text-on-surface tracking-tight font-headline">Bem-vindo, Operador.</h2>
    <p class="text-on-surface-variant text-sm font-light">Expedição Rei AutoParts</p>
  `;

  const section = document.createElement('section');
  const title = document.createElement('h3');
  title.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-4';
  title.textContent = 'Ações Rápidas';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-4';

  const acao1 = document.createElement('a');
  acao1.dataset.quickAction = 'nova-contagem';
  acao1.href = '#/cargas';
  acao1.className = 'flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl hover:bg-secondary-container/40 transition-all zen-shadow-ambient group';
  acao1.innerHTML = `
    <div class="p-3 bg-secondary-container/50 rounded-xl"><span class="material-symbols-outlined text-2xl text-secondary">add_box</span></div>
    <span class="text-xs font-bold text-on-surface uppercase tracking-widest">Nova Contagem</span>
  `;

  const acao2 = document.createElement('a');
  acao2.dataset.quickAction = 'emitir-relatorios';
  acao2.href = '#/relatorios';
  acao2.className = 'flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl hover:bg-secondary-container/40 transition-all zen-shadow-ambient group';
  acao2.innerHTML = `
    <div class="p-3 bg-secondary-container/50 rounded-xl"><span class="material-symbols-outlined text-2xl text-secondary">print</span></div>
    <span class="text-xs font-bold text-on-surface uppercase tracking-widest">Emitir Relatórios</span>
  `;

  grid.appendChild(acao1);
  grid.appendChild(acao2);
  section.appendChild(title);
  section.appendChild(grid);
  container.appendChild(hero);
  container.appendChild(section);
  return container;
}
