import { Button } from '../ui/primitives/button.js';
import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';
import { abrirModalNovaContagemCargaAberta } from '../ui/composites/modal-nova-contagem-carga-aberta.js';

export async function renderSelecaoCarga(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'selecao-carga';
  el.className = 'space-y-8';

  const lista = await carregarEmbarques(ctx);
  const abertas = lista.filter((embarque) => embarque.status !== 'fechado');
  const expedidas = lista.filter((embarque) => embarque.status === 'fechado');
  const pendentesNota = expedidas.filter((embarque) => !String(embarque.numero_nota_fiscal ?? '').trim()).length;
  let abaAtiva = abertas.length > 0 ? 'abertas' : 'expedidas';

  const header = document.createElement('section');
  header.className = 'flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between';
  header.innerHTML = `
    <div>
      <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Gestão de Cargas</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Gerenciador de Cargas</h2>
      <p class="mt-2 text-sm font-light text-on-surface-variant">Painel operacional para acompanhar embarques abertos, expedidos e pendências de expedição.</p>
    </div>
  `;

  const novaCarga = Button({
    texto: 'Nova Carga',
    icone: 'add',
    variante: 'primary',
    onClick: () => { window.location.hash = '#/sessoes/nova'; },
  });
  novaCarga.dataset.abrirNovaCarga = 'true';
  const novaContagem = Button({
    texto: 'Nova Contagem',
    icone: 'add',
    variante: 'secondary',
    onClick: () => {
      if (abertas.length === 0) return;
      abrirModalNovaContagemCargaAberta({
        embarques: abertas,
        onConfirmar: (numeroEmbarque) => {
          window.location.hash = `#/cargas/${encodeURIComponent(numeroEmbarque)}/nova-sessao`;
        },
      });
    },
  });
  novaContagem.dataset.acaoNovaContagem = 'true';
  const headerActions = document.createElement('div');
  headerActions.className = 'flex items-center gap-3';
  headerActions.appendChild(novaContagem);
  headerActions.appendChild(novaCarga);
  header.appendChild(headerActions);
  el.appendChild(header);

  const stats = document.createElement('section');
  stats.className = 'grid grid-cols-12 gap-6';
  stats.innerHTML = `
    <article data-stat="produtividade" class="col-span-12 rounded-[28px] border border-surface-container bg-surface-container-lowest p-8 md:col-span-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div class="space-y-4">
          <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Produtividade Semanal</span>
          <h3 class="text-3xl font-headline font-light tracking-tight text-primary">Cargas Processadas</h3>
          <div class="flex items-baseline gap-3">
            <span class="text-5xl font-bold tracking-tight text-on-background">${formatarNumero(lista.length)}</span>
            <span class="text-sm font-medium text-secondary">${lista.length === 0 ? 'sem registros' : `${formatarNumero(abertas.length)} abertas`}</span>
          </div>
        </div>
        <div class="flex h-24 w-40 items-end gap-2">
          ${['38','62','28','80','48','100'].map((altura, indice) => `<div class="w-3 rounded-t-sm ${indice === 5 ? 'bg-primary' : 'bg-primary/15'}" style="height:${altura}%"></div>`).join('')}
        </div>
      </div>
    </article>
    <article data-stat="pendentes-nota" class="relative col-span-12 overflow-hidden rounded-[28px] border border-white/40 bg-white/70 p-8 shadow-sm backdrop-blur md:col-span-4">
      <div class="relative z-10 space-y-4">
        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Alerta de Status</span>
        <h3 class="text-2xl font-headline font-light tracking-tight text-primary">Aguardando Expedição</h3>
        <div class="text-6xl font-extrabold tracking-tighter text-primary">${formatarNumero(pendentesNota)}</div>
        <p class="max-w-xs text-sm font-medium text-on-surface-variant">Cargas concluídas pendentes de nota fiscal.</p>
      </div>
      <span class="material-symbols-outlined pointer-events-none absolute -bottom-6 -right-6 text-[9rem] text-primary/5">local_shipping</span>
    </article>
  `;
  el.appendChild(stats);

  const tabs = document.createElement('div');
  tabs.className = 'flex gap-8 border-b border-surface-container';
  const tabExpedidas = criarTab('expedidas', 'Cargas Expedidas', expedidas.length, () => {
    abaAtiva = 'expedidas';
    atualizar();
  });
  const tabAbertas = criarTab('abertas', 'Cargas Abertas', abertas.length, () => {
    abaAtiva = 'abertas';
    atualizar();
  });
  tabs.appendChild(tabExpedidas);
  tabs.appendChild(tabAbertas);
  el.appendChild(tabs);

  const secaoTabela = document.createElement('section');
  secaoTabela.className = 'space-y-4';

  const cabecalhoTabela = document.createElement('div');
  cabecalhoTabela.className = 'flex items-center justify-between gap-4';

  const legenda = document.createElement('div');
  legenda.innerHTML = `
    <h3 data-titulo-tabela class="text-2xl font-headline font-light tracking-tight text-primary"></h3>
    <p data-subtitulo-tabela class="mt-1 text-sm text-outline"></p>
  `;

  const acoes = document.createElement('div');
  acoes.className = 'flex items-center gap-2';
  const filtro = document.createElement('button');
  filtro.type = 'button';
  filtro.className = 'inline-flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-2 text-xs font-medium text-primary shadow-sm';
  filtro.innerHTML = '<span class="material-symbols-outlined text-sm">filter_list</span>Filtros';
  const exportar = document.createElement('a');
  exportar.dataset.exportarManifesto = 'true';
  exportar.href = '#/relatorios';
  exportar.className = 'inline-flex items-center gap-2 rounded-xl bg-primary-dim px-4 py-2 text-xs font-medium text-on-primary shadow-sm';
  exportar.innerHTML = '<span class="material-symbols-outlined text-sm">download</span>Exportar Manifesto';
  acoes.appendChild(filtro);
  acoes.appendChild(exportar);

  cabecalhoTabela.appendChild(legenda);
  cabecalhoTabela.appendChild(acoes);
  secaoTabela.appendChild(cabecalhoTabela);

  const tabela = document.createElement('div');
  tabela.className = 'overflow-hidden rounded-[28px] border border-surface-container bg-surface-container-lowest shadow-sm';
  tabela.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-left">
        <thead data-head-tabela></thead>
        <tbody data-body-tabela class="divide-y divide-surface-container"></tbody>
      </table>
    </div>
    <div class="flex items-center justify-between border-t border-surface-container px-8 py-4">
      <span data-rodape-tabela class="text-xs font-medium text-outline"></span>
      <div class="flex gap-2">
        <button type="button" class="rounded border border-surface-container px-2 py-2 text-outline">
          <span class="material-symbols-outlined text-sm leading-none">chevron_left</span>
        </button>
        <button type="button" class="rounded border border-surface-container px-2 py-2 text-outline">
          <span class="material-symbols-outlined text-sm leading-none">chevron_right</span>
        </button>
      </div>
    </div>
  `;
  secaoTabela.appendChild(tabela);
  el.appendChild(secaoTabela);

  const tituloTabela = legenda.querySelector('[data-titulo-tabela]');
  const subtituloTabela = legenda.querySelector('[data-subtitulo-tabela]');
  const headTabela = tabela.querySelector('[data-head-tabela]');
  const bodyTabela = tabela.querySelector('[data-body-tabela]');
  const rodapeTabela = tabela.querySelector('[data-rodape-tabela]');

  atualizar();
  return el;

  function atualizar() {
    atualizarTabs([tabExpedidas, tabAbertas], abaAtiva);
    const expedidasAtivas = abaAtiva === 'expedidas';
    const itens = expedidasAtivas ? expedidas : abertas;
    const deveMostrarNovaContagem = !expedidasAtivas && abertas.length > 0;
    if (deveMostrarNovaContagem && !novaContagem.isConnected) {
      headerActions.insertBefore(novaContagem, novaCarga);
    }
    if (!deveMostrarNovaContagem && novaContagem.isConnected) {
      novaContagem.remove();
    }

    tituloTabela.textContent = expedidasAtivas ? 'Relatório de Cargas Expedidas' : 'Relatório de Cargas em Processo';
    subtituloTabela.textContent = expedidasAtivas
      ? 'Listagem de embarques finalizados com acesso rápido ao detalhamento e manifesto.'
      : 'Listagem de embarques abertos aguardando conferência ou processamento.';

    headTabela.innerHTML = expedidasAtivas ? cabecalhoExpedidas() : cabecalhoAbertas();
    bodyTabela.innerHTML = '';

    if (itens.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" class="px-8 py-10 text-center text-sm text-on-surface-variant">${expedidasAtivas ? 'Nenhuma carga expedida encontrada.' : 'Nenhuma carga aberta no momento.'}</td>`;
      bodyTabela.appendChild(tr);
    } else {
      for (const embarque of itens) {
        bodyTabela.appendChild(expedidasAtivas ? linhaExpedida(embarque) : linhaAberta(embarque));
      }
    }

    const rotulo = expedidasAtivas ? 'cargas expedidas' : 'cargas abertas';
    rodapeTabela.textContent = `Mostrando ${itens.length} de ${itens.length} ${rotulo}`;
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

function linhaAberta(embarque) {
  const tr = document.createElement('tr');
  tr.dataset.linhaEmbarque = embarque.numero_embarque;
  tr.className = 'hover:bg-surface-container-low/50 transition-colors';

  const data = embarque.data_criacao
    ? `${formatarData(embarque.data_criacao)} — ${formatarHora(embarque.data_criacao)}`
    : '—';

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
    <td class="px-8 py-5 text-right">
      <button type="button" data-acao-carga="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5">Detalhes</button>
    </td>
  `;

  tr.querySelector('[data-acao-carga]').addEventListener('click', () => {
    window.location.hash = `#/cargas/${encodeURIComponent(embarque.numero_embarque)}`;
  });
  return tr;
}

function linhaExpedida(embarque) {
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
      <button type="button" data-acao-carga="${escaparAttr(embarque.numero_embarque)}" class="rounded-lg border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/5">Detalhes</button>
    </td>
  `;

  tr.querySelector('[data-acao-carga]').addEventListener('click', () => {
    window.location.hash = `#/expedidas/${encodeURIComponent(embarque.numero_embarque)}`;
  });
  return tr;
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escaparAttr(valor) {
  return escapar(valor).replaceAll('"', '&quot;');
}
