import { Button } from '../ui/primitives/button.js';
import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';
import { abrirModalIniciarSessao } from '../ui/composites/modal-iniciar-sessao.js';
import { toastCentralizado } from '../ui/primitives/toast-centralizado.js';

export async function renderSelecaoCarga(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'selecao-carga';
  el.className = 'space-y-8';

  const lista = await carregarEmbarques(ctx);
  const abertas = lista.filter((embarque) => !embarque.numero_nota_fiscal);
  const expedidas = lista.filter((embarque) => Boolean(embarque.numero_nota_fiscal));
  const pendentesNota = abertas.filter((embarque) => embarque.status === 'fechado').length;
  let abaAtiva = abertas.length > 0 ? 'abertas' : 'expedidas';

  const sessoesAtivas = await ctx.api.get('/sessoes').catch(() => []);
  const caixasHojeResp = await ctx.api.get('/sessoes/caixas-hoje').catch(() => ({ total: 0 }));
  const caixasHoje = caixasHojeResp?.total ?? 0;
  const ativasEmAndamento = (sessoesAtivas ?? []).filter(s => s.status === 'ativa');
  const CAMERAS = [1, 2];
  const camerasOcupadas = new Set(ativasEmAndamento.map(s => Number(s.camera_id)));
  const camerasLivres = CAMERAS.filter(id => !camerasOcupadas.has(id));

  function statusEmbarque(embarque) {
    const sessoesDoEmbarque = ativasEmAndamento.filter(s => s.numero_embarque === embarque.numero_embarque);
    if (sessoesDoEmbarque.length === 0) return { label: 'Disponivel', cameras: [], disponivel: true };
    const camerasUsadas = sessoesDoEmbarque.map(s => Number(s.camera_id));
    const label = `Em contagem · Camera ${camerasUsadas.join(', ')}`;
    return { label, cameras: camerasUsadas, disponivel: camerasLivres.length > 0 };
  }

  async function abrirIniciarSessao(numeroEmbarque) {
    const camerasConfig = await ctx.api.get('/cameras/config').catch(() => []);
    const livres = camerasLivres.map(id => ({ id }));
    abrirModalIniciarSessao({
      numeroEmbarque,
      embarques: abertas,
      api: ctx.api,
      camerasLivres: livres,
      camerasConfig,
      onConfirmar: async (dados) => {
        await ctx.sessoesSvc.abrir(dados);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      },
    });
  }

  const stats = document.createElement('section');
  stats.className = 'grid grid-cols-12 gap-4';

  const emContagem = ativasEmAndamento.length;
  const camerasTotal = CAMERAS.length;
  const camerasAtivas = camerasOcupadas.size;

  stats.innerHTML = `
    <article class="col-span-12 md:col-span-3 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 flex flex-col justify-between gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Abertas</span>
        <span class="material-symbols-outlined text-2xl text-primary/60" style="font-variation-settings:'FILL' 1,'wght' 300">package_2</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-bold tracking-tight text-on-background">${abertas.length}</span>
        <span class="text-xs text-on-surface-variant">embarques</span>
      </div>
      <div class="h-1 w-full rounded-full bg-surface-container-high overflow-hidden">
        <div class="h-full rounded-full bg-primary" style="width:${lista.length ? Math.round((abertas.length / lista.length) * 100) : 0}%"></div>
      </div>
    </article>

    <article class="col-span-12 md:col-span-3 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 flex flex-col justify-between gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Em Contagem</span>
        <span class="material-symbols-outlined text-2xl ${emContagem > 0 ? 'text-secondary' : 'text-outline/40'}" style="font-variation-settings:'FILL' 1,'wght' 300">videocam</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-bold tracking-tight ${emContagem > 0 ? 'text-secondary' : 'text-on-background'}">${emContagem}</span>
        <span class="text-xs text-on-surface-variant">sessões ativas</span>
      </div>
      <div class="flex gap-1.5">
        ${CAMERAS.map(id => `<div class="h-2 flex-1 rounded-full ${camerasOcupadas.has(id) ? 'bg-secondary' : 'bg-surface-container-high'}"></div>`).join('')}
      </div>
    </article>

    <article class="col-span-12 md:col-span-3 rounded-2xl border border-surface-container bg-surface-container-lowest p-5 flex flex-col justify-between gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Caixas Hoje</span>
        <span class="material-symbols-outlined text-2xl text-primary/60" style="font-variation-settings:'FILL' 1,'wght' 300">deployed_code</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-bold tracking-tight text-on-background">${caixasHoje}</span>
        <span class="text-xs text-on-surface-variant">fechadas</span>
      </div>
      <p class="text-[11px] text-on-surface-variant">Sessões encerradas no dia</p>
    </article>

    <article class="col-span-12 md:col-span-3 rounded-2xl border ${pendentesNota > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-surface-container bg-surface-container-lowest'} p-5 flex flex-col justify-between gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] ${pendentesNota > 0 ? 'text-amber-700' : 'text-on-surface-variant'}">Aguardando NF</span>
        <span class="material-symbols-outlined text-2xl ${pendentesNota > 0 ? 'text-amber-500' : 'text-outline/40'}" style="font-variation-settings:'FILL' 1,'wght' 300">receipt_long</span>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-bold tracking-tight ${pendentesNota > 0 ? 'text-amber-700' : 'text-on-background'}">${pendentesNota}</span>
        <span class="text-xs ${pendentesNota > 0 ? 'text-amber-600' : 'text-on-surface-variant'}">pendentes</span>
      </div>
      <p class="text-[11px] ${pendentesNota > 0 ? 'text-amber-600' : 'text-on-surface-variant'}">
        ${pendentesNota > 0 ? 'Concluídas, aguardando nota fiscal' : 'Nenhuma pendência'}
      </p>
    </article>
  `;
  el.appendChild(stats);

  const tabs = document.createElement('div');
  tabs.className = 'flex items-center justify-between border-b border-surface-container';

  const tabsLeft = document.createElement('div');
  tabsLeft.className = 'flex gap-8';
  const tabExpedidas = criarTab('expedidas', 'Cargas Expedidas', expedidas.length, () => {
    abaAtiva = 'expedidas';
    atualizar();
  });
  const tabAbertas = criarTab('abertas', 'Cargas Abertas', abertas.length, () => {
    abaAtiva = 'abertas';
    atualizar();
  });
  tabsLeft.appendChild(tabExpedidas);
  tabsLeft.appendChild(tabAbertas);
  tabs.appendChild(tabsLeft);

  // Barra de pesquisa + botão filtro
  const tabsRight = document.createElement('div');
  tabsRight.className = 'flex items-center gap-3 pb-2';
  tabsRight.innerHTML = `
    <div class="relative">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline">search</span>
      <input data-busca-tabela type="text" placeholder="Buscar embarque..." class="w-52 rounded-lg border border-surface-container bg-surface-container-low pl-9 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition" />
    </div>
    <button data-btn-filtros type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-surface-container bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low transition">
      <span class="material-symbols-outlined text-sm">tune</span>Filtros
    </button>
  `;
  tabs.appendChild(tabsRight);
  el.appendChild(tabs);

  // Lógica de busca
  let termoBusca = '';
  const inputBusca = tabsRight.querySelector('[data-busca-tabela]');
  inputBusca.addEventListener('input', (e) => {
    termoBusca = e.target.value.trim().toLowerCase();
    atualizar();
  });

  // Lógica de filtros
  let filtrosAtivos = { status: 'todos' }; // todos | disponivel | em_contagem
  const btnFiltros = tabsRight.querySelector('[data-btn-filtros]');
  btnFiltros.addEventListener('click', () => abrirModalFiltros());

  function abrirModalFiltros() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm';
    overlay.innerHTML = `
      <div class="w-80 rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-surface-container space-y-5">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-on-surface">Filtros</h3>
          <button data-fechar-filtros type="button" class="rounded-full p-1 hover:bg-surface-container-high transition">
            <span class="material-symbols-outlined text-lg text-outline">close</span>
          </button>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</label>
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="radio" name="filtro-status" value="todos" ${filtrosAtivos.status === 'todos' ? 'checked' : ''} class="accent-primary" /> Todos
            </label>
            <label class="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="radio" name="filtro-status" value="disponivel" ${filtrosAtivos.status === 'disponivel' ? 'checked' : ''} class="accent-primary" /> Disponível
            </label>
            <label class="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input type="radio" name="filtro-status" value="em_contagem" ${filtrosAtivos.status === 'em_contagem' ? 'checked' : ''} class="accent-primary" /> Em contagem
            </label>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button data-limpar-filtros type="button" class="rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high transition">Limpar</button>
          <button data-aplicar-filtros type="button" class="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/90 transition">Aplicar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-fechar-filtros]').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('[data-limpar-filtros]').addEventListener('click', () => {
      filtrosAtivos = { status: 'todos' };
      overlay.remove();
      atualizarBadgeFiltro();
      atualizar();
    });
    overlay.querySelector('[data-aplicar-filtros]').addEventListener('click', () => {
      const selecionado = overlay.querySelector('input[name="filtro-status"]:checked');
      filtrosAtivos.status = selecionado?.value ?? 'todos';
      overlay.remove();
      atualizarBadgeFiltro();
      atualizar();
    });
  }

  function atualizarBadgeFiltro() {
    const ativo = filtrosAtivos.status !== 'todos';
    btnFiltros.classList.toggle('border-primary', ativo);
    btnFiltros.classList.toggle('text-primary', ativo);
  }

  function pareceData(texto) {
    return /^\d{2}\//.test(texto);
  }

  function filtrarItens(itens) {
    let resultado = itens;
    if (termoBusca) {
      if (pareceData(termoBusca)) {
        // Filtra por data de criação (formato dd/mm/yyyy, dd/mm ou parcial)
        resultado = resultado.filter(e => {
          if (!e.data_criacao) return false;
          const d = new Date(e.data_criacao);
          const dia = String(d.getDate()).padStart(2, '0');
          const mes = String(d.getMonth() + 1).padStart(2, '0');
          const ano = String(d.getFullYear());
          const dataFormatada = `${dia}/${mes}/${ano}`;
          return dataFormatada.startsWith(termoBusca);
        });
      } else {
        resultado = resultado.filter(e => e.numero_embarque.toLowerCase().startsWith(termoBusca));
      }
    }
    if (filtrosAtivos.status === 'disponivel') {
      resultado = resultado.filter(e => statusEmbarque(e).cameras.length === 0);
    } else if (filtrosAtivos.status === 'em_contagem') {
      resultado = resultado.filter(e => statusEmbarque(e).cameras.length > 0);
    }
    return resultado;
  }

  const secaoTabela = document.createElement('section');
  secaoTabela.className = 'space-y-4';

  const tabela = document.createElement('div');
  tabela.className = 'overflow-hidden rounded-[28px] border border-surface-container bg-surface-container-lowest shadow-sm flex flex-col';
  tabela.innerHTML = `
    <div class="overflow-x-auto flex-1 min-h-0 overflow-y-auto zen-scroll" data-scroll-tabela>
      <table class="w-full border-collapse text-left">
        <thead data-head-tabela class="sticky top-0 z-10"></thead>
        <tbody data-body-tabela class="divide-y divide-surface-container"></tbody>
      </table>
    </div>
  `;
  secaoTabela.appendChild(tabela);
  el.appendChild(secaoTabela);

  const headTabela = tabela.querySelector('[data-head-tabela]');
  const bodyTabela = tabela.querySelector('[data-body-tabela]');
  const scrollContainer = tabela.querySelector('[data-scroll-tabela]');
  // Altura fixa via CSS: ocupa ~60vh (viewport restante após header/cards)
  scrollContainer.style.maxHeight = 'clamp(200px, calc(100vh - 420px), 70vh)';
  // Scroll interno só ativa quando o scroll da página chega ao final
  scrollContainer.style.overflowY = 'hidden';

  const pageScroller = document.querySelector('[data-page-scroll]') || document.documentElement;
  function verificarFimScroll() {
    const el = pageScroller === document.documentElement ? document.documentElement : pageScroller;
    const noFundo = Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 2;
    scrollContainer.style.overflowY = noFundo ? 'auto' : 'hidden';
  }
  const scrollTarget = pageScroller === document.documentElement ? window : pageScroller;
  scrollTarget.addEventListener('scroll', verificarFimScroll, { passive: true });
  requestAnimationFrame(verificarFimScroll);

  atualizar();
  return el;

  function atualizar() {
    atualizarTabs([tabExpedidas, tabAbertas], abaAtiva);
    const expedidasAtivas = abaAtiva === 'expedidas';
    const itensBase = expedidasAtivas ? expedidas : abertas;
    const itens = filtrarItens(itensBase);

    headTabela.innerHTML = expedidasAtivas ? cabecalhoExpedidas() : cabecalhoAbertas();
    bodyTabela.innerHTML = '';

    if (itens.length === 0) {
      const tr = document.createElement('tr');
      if (termoBusca || filtrosAtivos.status !== 'todos') {
        tr.innerHTML = `<td colspan="6" class="px-8 py-10 text-center text-sm text-on-surface-variant"><span class="material-symbols-outlined text-3xl text-outline mb-2 block">search_off</span>Nenhum resultado encontrado para os filtros aplicados.</td>`;
      } else if (expedidasAtivas) {
        tr.innerHTML = `<td colspan="5" class="px-8 py-10 text-center text-sm text-on-surface-variant">Nenhuma carga expedida encontrada.</td>`;
      } else {
        tr.innerHTML = `<td colspan="6" class="px-8 py-10 text-center text-sm text-on-surface-variant"><span class="material-symbols-outlined text-3xl text-outline mb-2 block">sync</span>Nenhum embarque disponivel. Aguarde sincronizacao com o ERP.</td>`;
      }
      bodyTabela.appendChild(tr);
    } else {
      for (const embarque of itens) {
        bodyTabela.appendChild(expedidasAtivas ? linhaExpedida(embarque, ctx) : linhaAberta(embarque));
      }
    }
  }

  function linhaAberta(embarque) {
    const tr = document.createElement('tr');
    tr.dataset.linhaEmbarque = embarque.numero_embarque;
    tr.className = 'hover:bg-surface-container-low/50 transition-colors';

    const data = embarque.data_criacao
      ? `${formatarData(embarque.data_criacao)} — ${formatarHora(embarque.data_criacao)}`
      : '—';

    const info = statusEmbarque(embarque);
    const badgeStatus = info.cameras.length === 0
      ? `<span class="inline-flex items-center rounded-full bg-secondary-container/50 text-on-secondary-container px-2.5 py-0.5 text-[11px] font-medium">${escapar(info.label)}</span>`
      : `<span class="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-medium">${escapar(info.label)}</span>`;

    const btnIniciar = info.disponivel
      ? `<button type="button" data-acao-iniciar="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg bg-primary text-on-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition mr-2">Iniciar Contagem</button>`
      : `<button type="button" data-acao-iniciar-disabled="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg bg-surface-container-high text-outline cursor-not-allowed opacity-60 px-4 py-1.5 text-xs font-semibold mr-2">Iniciar Contagem</button>`;

    tr.innerHTML = `
      <td class="px-8 py-5">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary/60">pending_actions</span>
          <span class="text-lg font-semibold tracking-tight text-on-background">${escapar(embarque.numero_embarque)}</span>
        </div>
      </td>
      <td class="px-8 py-5 text-sm text-on-surface-variant">${escapar(data)}</td>
      <td class="px-8 py-5 text-sm text-on-surface-variant">${formatarNumero(embarque.qtd_caixas ?? 0)}</td>
      <td class="px-8 py-5 text-sm text-on-surface-variant">${formatarNumero(embarque.qtd_pecas ?? 0)}</td>
      <td class="px-8 py-5">${badgeStatus}</td>
      <td class="px-8 py-5 text-right">
        ${btnIniciar}
        <button type="button" data-acao-carga="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5">Detalhes</button>
      </td>
    `;

    tr.querySelector('[data-acao-carga]').addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = `#/cargas/${encodeURIComponent(embarque.numero_embarque)}`;
    });

    const btnIniciarEl = tr.querySelector('[data-acao-iniciar]');
    if (btnIniciarEl) {
      btnIniciarEl.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirIniciarSessao(embarque.numero_embarque);
      });
    }

    const btnIniciarDisabledEl = tr.querySelector('[data-acao-iniciar-disabled]');
    if (btnIniciarDisabledEl) {
      btnIniciarDisabledEl.addEventListener('click', (e) => {
        e.stopPropagation();
        toastCentralizado('Nenhuma camera disponivel para nova sessao');
      });
    }

    return tr;
  }
}

async function carregarEmbarques(ctx) {
  try {
    return await ctx.catalogos.embarques();
  } catch (error) {
    const fallback = document.createElement('div');
    fallback.className = 'rounded-2xl bg-error-container/10 p-4 text-sm text-error';
    fallback.textContent = `Falha ao carregar cargas: ${error.message}`;
    throw error;
  }
}

function criarTab(id, label, total, onClick) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.dataset.tabCargas = id;
  botao.className = 'relative pb-4 text-sm font-medium transition-colors';
  botao.innerHTML = `${label} <span class="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">${formatarNumero(total)}</span>`;
  botao.addEventListener('click', onClick);
  return botao;
}

function atualizarTabs(tabs, ativo) {
  for (const tab of tabs) {
    const selecionado = tab.dataset.tabCargas === ativo;
    tab.dataset.ativo = selecionado ? 'true' : 'false';
    tab.className = selecionado
      ? 'relative pb-4 text-sm font-semibold text-primary border-b-2 border-primary'
      : 'relative pb-4 text-sm font-medium text-outline hover:text-primary';
  }
}

function cabecalhoAbertas() {
  return `
    <tr class="bg-surface-container-low text-on-surface-variant">
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Embarque</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Data de Criação</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Qtd. Caixa</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Qtd. Peças</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Status</th>
      <th class="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Ação</th>
    </tr>
  `;
}

function cabecalhoExpedidas() {
  return `
    <tr class="bg-surface-container-low text-on-surface-variant">
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Embarque</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Nota Fiscal</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Data</th>
      <th class="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em]">Qtd. Peças</th>
      <th class="px-8 py-4 text-right text-[10px] font-bold uppercase tracking-[0.18em]">Ação</th>
    </tr>
  `;
}

function linhaExpedida(embarque, ctx) {
  const tr = document.createElement('tr');
  tr.dataset.linhaEmbarque = embarque.numero_embarque;
  tr.className = 'hover:bg-surface-container-low/50 transition-colors';

  tr.innerHTML = `
    <td class="px-8 py-5">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-primary/60">inventory_2</span>
        <span class="text-lg font-semibold tracking-tight text-on-background">${escapar(embarque.numero_embarque)}</span>
      </div>
    </td>
    <td class="px-8 py-5 text-sm text-on-surface-variant">${escapar(embarque.numero_nota_fiscal || 'Pendente')}</td>
    <td class="px-8 py-5 text-sm text-on-surface-variant">${escapar(formatarData(embarque.data_criacao) || '—')}</td>
    <td class="px-8 py-5 text-sm text-on-surface-variant">${formatarNumero(embarque.qtd_pecas ?? 0)}</td>
    <td class="px-8 py-5 text-right">
      <button type="button" data-acao-imprimir="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg bg-primary text-on-primary px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition mr-2">Imprimir etiquetas finais</button>
      <button type="button" data-acao-carga="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5">Detalhes</button>
    </td>
  `;

  tr.querySelector('[data-acao-carga]').addEventListener('click', () => {
    window.location.hash = `#/expedidas/${encodeURIComponent(embarque.numero_embarque)}`;
  });

  tr.querySelector('[data-acao-imprimir]').addEventListener('click', async () => {
    try {
      const preview = await ctx.faturamentoSvc.previewMassa(embarque.numero_embarque);
      try {
        const { abrirModalReimpressaoMassa } = await import('../ui/composites/modal-reimpressao-massa.js');
        abrirModalReimpressaoMassa({
          embarque: embarque.numero_embarque,
          preview,
          faturamentoSvc: ctx.faturamentoSvc
        });
      } catch (err) {
        console.error(err);
        alert('Modal de reimpressão ainda não disponível ou erro ao carregar.');
      }
    } catch (err) {
      alert(`Erro ao carregar preview: ${err.message}`);
    }
  });

  return tr;
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escaparAttr(valor) {
  return escapar(valor).replaceAll('"', '&quot;');
}
