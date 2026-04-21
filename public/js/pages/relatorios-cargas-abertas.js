import { abrirModalEmitir } from '../ui/composites/modal-emitir-relatorio.js';
import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';

export async function renderRelatoriosCargasAbertas(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'relatorios-cargas-abertas';
  el.className = 'space-y-8';

  const header = document.createElement('section');
  header.innerHTML = `
    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Gestão de Cargas</p>
    <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Emitir Relatórios</h2>
    <p class="text-sm text-on-surface-variant font-light">Listagem de embarques abertos aguardando conferência ou processamento.</p>
  `;
  el.appendChild(header);

  const [abertos, todos] = await Promise.all([
    ctx.api.get('/embarques?status=aberto').catch(() => []),
    ctx.api.get('/embarques').catch(() => []),
  ]);
  const expedidos = todos.filter(e => e.status !== 'aberto');
  const totalCargas = todos.length;
  const aguardando = abertos.length;

  const stats = document.createElement('section');
  stats.className = 'grid grid-cols-12 gap-6';
  stats.innerHTML = `
    <div data-stat="produtividade" class="col-span-12 md:col-span-8 bg-surface-container-lowest rounded-xl p-8 flex justify-between items-end zen-shadow-ambient">
      <div class="space-y-3">
        <span class="text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase">Produtividade Total</span>
        <h3 class="text-2xl font-headline font-light text-primary">Cargas Processadas</h3>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-bold text-on-background">${formatarNumero(totalCargas)}</span>
          <span class="text-secondary font-medium text-sm">${totalCargas === 0 ? '—' : 'em catálogo'}</span>
        </div>
      </div>
      <div class="h-20 w-40 flex items-end gap-1">
        ${['30','60','40','80','55','100'].map(h => `<div class="w-2 bg-primary/30 rounded-t-sm" style="height:${h}%"></div>`).join('')}
      </div>
    </div>
    <div data-stat="aguardando" class="col-span-12 md:col-span-4 bg-surface-container-lowest rounded-xl p-8 relative overflow-hidden zen-shadow-ambient">
      <div class="relative z-10 space-y-3">
        <span class="text-primary text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Alerta de Status</span>
        <h3 class="text-xl font-headline font-light text-primary tracking-tight">Aguardando Expedição</h3>
        <div class="text-5xl font-extrabold text-primary tracking-tighter">${aguardando}</div>
        <p class="text-on-surface-variant text-xs font-medium">Cargas concluídas pendentes de nota fiscal.</p>
      </div>
      <span class="material-symbols-outlined absolute -bottom-4 -right-4 text-[7rem] text-primary/5 pointer-events-none">local_shipping</span>
    </div>
  `;
  el.appendChild(stats);

  const tabs = document.createElement('div');
  tabs.className = 'flex gap-8 border-b border-surface-container';
  const tabExpedidas = document.createElement('button');
  tabExpedidas.dataset.tab = 'expedidas';
  tabExpedidas.type = 'button';
  tabExpedidas.className = 'pb-3 text-sm font-medium text-outline hover:text-primary transition-colors';
  tabExpedidas.innerHTML = `Cargas Expedidas <span class="ml-1 text-[10px] text-on-surface-variant">(${expedidos.length})</span>`;
  const tabAbertas = document.createElement('button');
  tabAbertas.dataset.tab = 'abertas';
  tabAbertas.type = 'button';
  tabAbertas.className = 'pb-3 text-sm font-semibold text-primary border-b-2 border-primary relative';
  tabAbertas.innerHTML = `Cargas Abertas <span class="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">${aguardando}</span>`;
  tabs.appendChild(tabExpedidas);
  tabs.appendChild(tabAbertas);
  el.appendChild(tabs);

  const tabelaSection = document.createElement('section');
  tabelaSection.dataset.tabela = 'cargas-abertas';
  tabelaSection.className = 'bg-surface-container-lowest rounded-xl overflow-hidden zen-shadow-ambient';
  tabelaSection.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-surface-container-low text-on-surface-variant">
            <th class="px-6 py-3 text-[10px] font-bold tracking-widest uppercase">Embarque</th>
            <th class="px-6 py-3 text-[10px] font-bold tracking-widest uppercase">Data de Criação</th>
            <th class="px-6 py-3 text-[10px] font-bold tracking-widest uppercase">Qtd. Caixa</th>
            <th class="px-6 py-3 text-[10px] font-bold tracking-widest uppercase">Qtd. Peças</th>
            <th class="px-6 py-3 text-[10px] font-bold tracking-widest uppercase text-right">Ação</th>
          </tr>
        </thead>
        <tbody data-corpo class="divide-y divide-surface-container"></tbody>
      </table>
    </div>
    <div class="px-6 py-3 bg-surface-container-lowest border-t border-surface-container text-[10px] text-outline font-medium">
      Mostrando ${aguardando} de ${aguardando} cargas abertas
    </div>
  `;

  const corpo = tabelaSection.querySelector('[data-corpo]');
  if (aguardando === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="px-6 py-8 text-center text-on-surface-variant">Nenhuma carga aberta no momento.</td>`;
    corpo.appendChild(tr);
  } else {
    for (const emb of abertos) {
      const tr = document.createElement('tr');
      tr.dataset.linhaEmbarque = emb.numero_embarque;
      tr.className = 'hover:bg-surface-container-low/50 transition-colors';
      const data = emb.data_criacao ? `${formatarData(emb.data_criacao)} — ${formatarHora(emb.data_criacao)}` : '—';
      tr.innerHTML = `
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary/60 text-lg">pending_actions</span>
            <span class="text-sm font-semibold text-on-background">${emb.numero_embarque}</span>
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${data}</td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${formatarNumero(emb.qtd_caixas ?? 0)}</td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${formatarNumero(emb.qtd_pecas ?? 0)}</td>
        <td class="px-6 py-4 text-right">
          <button data-acao-detalhes="${emb.numero_embarque}" class="text-xs font-semibold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all">Detalhes</button>
        </td>
      `;
      tr.querySelector('[data-acao-detalhes]').addEventListener('click', () => abrirModalEmitir({
        numero: emb.numero_embarque,
        onBaixar: (fmt) => { window.location.href = `/relatorios/embarque/${encodeURIComponent(emb.numero_embarque)}?fmt=${fmt}`; },
      }));
      corpo.appendChild(tr);
    }
  }

  tabExpedidas.addEventListener('click', () => { window.location.hash = '#/relatorios'; });
  tabAbertas.addEventListener('click', () => { /* já estamos aqui */ });

  el.appendChild(tabelaSection);
  return el;
}
