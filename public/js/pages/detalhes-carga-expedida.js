import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';

export async function renderDetalhesCargaExpedida(ctx, numero) {
  const el = document.createElement('div');
  el.dataset.page = 'detalhes-carga-expedida';
  el.className = 'space-y-8';

  const [embarque, caixas] = await Promise.all([
    ctx.api.get(`/embarques/${encodeURIComponent(numero)}`),
    ctx.api.get(`/sessoes?embarque=${encodeURIComponent(numero)}`).catch(() => []),
  ]);

  const encerradas = caixas.filter(c => c.status === 'encerrada');
  const totalItens = encerradas.reduce((acc, c) => acc + (Number(c.quantidade_total) || 0), 0);

  const bento = document.createElement('section');
  bento.className = 'grid grid-cols-12 gap-6';
  bento.innerHTML = `
    <div data-bento-resumo class="col-span-12 md:col-span-8 bg-surface-container-lowest rounded-xl p-8 relative overflow-hidden zen-shadow-ambient">
      <span class="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-headline font-semibold tracking-widest uppercase mb-4 inline-block">Status: Expedido</span>
      <h2 class="text-4xl font-headline font-light text-on-surface tracking-tight leading-tight">Embarque<br/><span class="font-bold">${embarque.numero_embarque}</span></h2>
      <div class="grid grid-cols-3 gap-8 mt-10">
        <div>
          <p class="text-[10px] font-headline uppercase tracking-widest text-outline mb-1">Nota Fiscal</p>
          <p class="text-lg font-headline text-primary-dim">${embarque.nota_fiscal ?? '—'}</p>
        </div>
        <div>
          <p class="text-[10px] font-headline uppercase tracking-widest text-outline mb-1">Data Expedida</p>
          <p class="text-lg font-headline text-primary-dim">${embarque.data_expedicao ? formatarData(embarque.data_expedicao) : '—'}</p>
        </div>
        <div>
          <p class="text-[10px] font-headline uppercase tracking-widest text-outline mb-1">Total Itens</p>
          <p class="text-lg font-headline text-primary-dim">${formatarNumero(totalItens)} un</p>
        </div>
      </div>
    </div>
    <div data-bento-logistica class="col-span-12 md:col-span-4 bg-primary text-on-primary rounded-xl p-8 flex flex-col justify-center items-center text-center">
      <span class="material-symbols-outlined text-5xl mb-3 opacity-60">local_shipping</span>
      <p class="font-headline text-xs uppercase tracking-[0.2em] opacity-80 mb-2">Logística de Saída</p>
      <p class="font-headline text-xl font-light">Motorista: <span class="font-bold">${embarque.motorista ?? '—'}</span></p>
      <p class="font-headline text-sm">Placa: <span class="font-bold uppercase">${embarque.placa ?? '—'}</span></p>
    </div>
  `;
  el.appendChild(bento);

  const tabela = document.createElement('section');
  tabela.dataset.tabela = 'detalhamento';
  tabela.className = 'bg-surface-container-low rounded-xl overflow-hidden zen-shadow-ambient';
  tabela.innerHTML = `
    <div class="px-8 py-6 flex justify-between items-center bg-surface-container-lowest/40 border-b border-outline-variant/10">
      <h3 class="font-headline font-semibold text-on-surface tracking-tight">Detalhamento da Carga</h3>
      <div class="flex gap-2">
        <button data-acao="filtros" class="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest rounded-lg text-xs font-medium text-primary zen-shadow-ambient hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-sm">filter_list</span><span>Filtros</span>
        </button>
        <button data-acao="exportar" class="flex items-center gap-2 px-4 py-2 bg-primary-dim text-on-primary rounded-lg text-xs font-medium zen-shadow-ambient hover:opacity-90 transition-opacity">
          <span class="material-symbols-outlined text-sm">download</span><span>Exportar Manifesto</span>
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="font-headline uppercase text-[10px] tracking-[0.15em] text-outline">
            <th class="px-6 py-4 font-medium">Item / SKU</th>
            <th class="px-4 py-4 font-medium">OP</th>
            <th class="px-4 py-4 font-medium">Quantidade</th>
            <th class="px-4 py-4 font-medium">Nº Caixa</th>
            <th class="px-4 py-4 font-medium">Cód. Operador</th>
            <th class="px-4 py-4 font-medium">Data Contagem</th>
            <th class="px-6 py-4 font-medium text-right">Ação</th>
          </tr>
        </thead>
        <tbody data-corpo class="text-sm"></tbody>
      </table>
    </div>
    <div class="px-8 py-4 bg-surface-container-lowest/30 text-[10px] text-outline-variant font-headline uppercase tracking-widest">
      Exibindo ${encerradas.length} SKU${encerradas.length === 1 ? '' : 's'} carregados
    </div>
  `;

  const corpo = tabela.querySelector('[data-corpo]');
  if (encerradas.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="px-6 py-8 text-center text-on-surface-variant">Nenhuma caixa encerrada nesta carga.</td>`;
    corpo.appendChild(tr);
  } else {
    encerradas.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.linhaCaixa = 'true';
      tr.className = idx % 2 === 0 ? 'bg-surface-container-lowest/40 hover:bg-surface-container-lowest transition-colors' : 'bg-surface-container-low/30 hover:bg-surface-container-lowest transition-colors';
      tr.innerHTML = `
        <td class="px-6 py-4 border-t border-outline-variant/10">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-surface-container flex items-center justify-center">
              <span class="material-symbols-outlined text-lg text-outline">settings_input_component</span>
            </div>
            <div>
              <p class="font-semibold text-on-surface">${c.programa_nome ?? '—'}</p>
              <p class="text-[10px] text-outline">${c.programa_numero != null ? `PRG-${String(c.programa_numero).padStart(3, '0')}` : '—'}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-4 border-t border-outline-variant/10">
          <span class="font-mono text-xs text-primary bg-primary-container/40 px-2 py-0.5 rounded">${c.codigo_op ?? '—'}</span>
        </td>
        <td class="px-4 py-4 border-t border-outline-variant/10 font-medium">${formatarNumero(c.quantidade_total)} un</td>
        <td class="px-4 py-4 border-t border-outline-variant/10 text-outline">${c.numero_caixa ?? '—'}</td>
        <td class="px-4 py-4 border-t border-outline-variant/10">${c.codigo_operador ?? '—'}</td>
        <td class="px-4 py-4 border-t border-outline-variant/10 text-outline">${c.encerrada_em ? `${formatarData(c.encerrada_em)} ${formatarHora(c.encerrada_em)}` : '—'}</td>
        <td class="px-6 py-4 border-t border-outline-variant/10 text-right">
          <a data-ver-relatorio="${c.id}" href="/relatorios/embarque/${encodeURIComponent(embarque.numero_embarque)}?fmt=pdf" class="text-primary hover:text-primary-dim font-semibold text-xs tracking-tight transition-colors">Ver Relatório</a>
        </td>
      `;
      corpo.appendChild(tr);
    });
  }

  tabela.querySelector('[data-acao="exportar"]').addEventListener('click', () => {
    window.location.href = `/relatorios/embarque/${encodeURIComponent(embarque.numero_embarque)}?fmt=xlsx`;
  });

  el.appendChild(tabela);
  return el;
}
