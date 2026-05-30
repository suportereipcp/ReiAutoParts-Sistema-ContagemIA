import { abrirModalEmitir } from '../ui/composites/modal-emitir-relatorio.js';
import { baixarArquivo } from '../infra/download.js';
import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';

export async function renderRelatoriosCargasAbertas(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'relatorios-cargas-abertas';
  el.className = 'space-y-6';

  const [abertos] = await Promise.all([
    ctx.api.get('/embarques?status=aberto').catch(() => []),
  ]);

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'flex items-center justify-between';
  toolbar.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline">search</span>
        <input data-busca type="text" placeholder="Buscar embarque..." class="w-52 rounded-lg border border-surface-container bg-surface-container-low pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition" />
      </div>
    </div>
    <a href="#/relatorios" class="text-xs font-semibold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all">
      Todos os Embarques
    </a>
  `;
  el.appendChild(toolbar);

  // Tabela
  const tabelaWrapper = document.createElement('div');
  tabelaWrapper.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest overflow-hidden';
  tabelaWrapper.innerHTML = `
    <div class="overflow-y-auto zen-scroll" style="max-height:clamp(300px, calc(100vh - 260px), 80vh)">
      <table class="w-full text-left border-collapse">
        <thead class="sticky top-0 z-10 bg-surface-container-low">
          <tr class="text-on-surface-variant">
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Embarque</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Data de Criação</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Caixas</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Peças</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-right">Ação</th>
          </tr>
        </thead>
        <tbody data-corpo class="divide-y divide-surface-container"></tbody>
      </table>
    </div>
  `;

  const corpo = tabelaWrapper.querySelector('[data-corpo]');
  const inputBusca = toolbar.querySelector('[data-busca]');

  function renderTabela(filtro = '') {
    corpo.innerHTML = '';
    const filtrados = filtro
      ? abertos.filter(e => e.numero_embarque.toLowerCase().startsWith(filtro.toLowerCase()))
      : abertos;

    if (filtrados.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="px-5 py-10 text-center text-sm text-on-surface-variant">Nenhuma carga aberta encontrada.</td>`;
      corpo.appendChild(tr);
      return;
    }

    for (const emb of filtrados) {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-surface-container-low/50 transition-colors';
      const data = emb.data_criacao ? `${formatarData(emb.data_criacao)} — ${formatarHora(emb.data_criacao)}` : '—';
      tr.innerHTML = `
        <td class="px-5 py-3.5">
          <span class="text-sm font-semibold text-on-background">${escapar(emb.numero_embarque)}</span>
        </td>
        <td class="px-5 py-3.5 text-sm text-on-surface-variant">${data}</td>
        <td class="px-5 py-3.5 text-sm text-on-surface-variant">${formatarNumero(emb.qtd_caixas ?? 0)}</td>
        <td class="px-5 py-3.5 text-sm text-on-surface-variant">${formatarNumero(emb.qtd_pecas ?? 0)}</td>
        <td class="px-5 py-3.5 text-right">
          <button data-acao class="text-xs font-semibold text-primary px-4 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all">Detalhes</button>
        </td>
      `;
      tr.querySelector('[data-acao]').addEventListener('click', () => abrirModalEmitir({
        numero: emb.numero_embarque,
        onBaixar: (fmt) => baixarArquivo(`/relatorios/embarque/${encodeURIComponent(emb.numero_embarque)}?fmt=${fmt}`),
      }));
      corpo.appendChild(tr);
    }
  }

  inputBusca.addEventListener('input', (e) => renderTabela(e.target.value.trim()));
  renderTabela();

  el.appendChild(tabelaWrapper);
  return el;
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
