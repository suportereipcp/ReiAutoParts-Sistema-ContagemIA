import { toast } from '../ui/primitives/toast.js';
import { abrirContinuarCargaUnica } from '../ui/composites/modal-continuar-carga-unica.js';
import { abrirContinuarCargaMultipla } from '../ui/composites/modal-continuar-carga-multipla.js';
import { formatarData, formatarHora, formatarNumero } from '../infra/formatters.js';

export async function renderDashboard(ctx) {
  const container = document.createElement('div');
  container.className = 'space-y-8';

  // Fetch dados
  const [sessoes, ultimasCaixas] = await Promise.all([
    ctx.api.get('/sessoes').catch(() => []),
    ctx.api.get('/sessoes/ultimas-caixas?limite=8').catch(() => []),
  ]);
  const ativas = (sessoes ?? []).filter(s => s.status === 'ativa');

  // --- Ações Rápidas (primeiro) ---
  const secAcoes = document.createElement('section');
  secAcoes.className = 'space-y-3';
  secAcoes.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Ações Rápidas</p>`;
  const gridAcoes = document.createElement('div');
  gridAcoes.className = 'grid grid-cols-1 md:grid-cols-3 gap-5';
  gridAcoes.innerHTML = `
    <a href="#/cargas" class="group relative flex flex-col gap-4 p-6 rounded-2xl border border-surface-container bg-gradient-to-br from-surface-container-lowest to-surface-container-low overflow-hidden transition-all hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5 hover:-translate-y-0.5">
      <div class="absolute top-0 left-0 w-1 h-full bg-secondary rounded-r"></div>
      <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
        <span class="material-symbols-outlined text-2xl text-secondary" style="font-variation-settings:'FILL' 1,'wght' 400">add_box</span>
      </div>
      <div>
        <p class="text-sm font-bold text-on-surface tracking-wide">Nova Contagem</p>
        <p class="text-[11px] text-on-surface-variant mt-0.5">Iniciar sessão em embarque aberto</p>
      </div>
      <span class="material-symbols-outlined absolute bottom-3 right-4 text-lg text-outline/30 group-hover:text-secondary/50 transition-colors">arrow_forward</span>
    </a>
    <a href="#/relatorios" class="group relative flex flex-col gap-4 p-6 rounded-2xl border border-surface-container bg-gradient-to-br from-surface-container-lowest to-surface-container-low overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      <div class="absolute top-0 left-0 w-1 h-full bg-primary rounded-r"></div>
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <span class="material-symbols-outlined text-2xl text-primary" style="font-variation-settings:'FILL' 1,'wght' 400">print</span>
      </div>
      <div>
        <p class="text-sm font-bold text-on-surface tracking-wide">Emitir Relatórios</p>
        <p class="text-[11px] text-on-surface-variant mt-0.5">Gerar documentos de expedição</p>
      </div>
      <span class="material-symbols-outlined absolute bottom-3 right-4 text-lg text-outline/30 group-hover:text-primary/50 transition-colors">arrow_forward</span>
    </a>
  `;

  const btnContinuar = document.createElement('button');
  btnContinuar.type = 'button';
  btnContinuar.className = 'group relative flex flex-col gap-4 p-6 rounded-2xl border border-surface-container bg-gradient-to-br from-surface-container-lowest to-surface-container-low overflow-hidden transition-all hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5 hover:-translate-y-0.5 text-left';
  btnContinuar.innerHTML = `
    <div class="absolute top-0 left-0 w-1 h-full bg-secondary rounded-r"></div>
    <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
      <span class="material-symbols-outlined text-2xl text-secondary" style="font-variation-settings:'FILL' 1,'wght' 400">play_circle</span>
    </div>
    <div>
      <p class="text-sm font-bold text-on-surface tracking-wide">Continuar Carga</p>
      <p class="text-[11px] text-on-surface-variant mt-0.5">Retomar sessão em andamento</p>
    </div>
    <span class="material-symbols-outlined absolute bottom-3 right-4 text-lg text-outline/30 group-hover:text-secondary/50 transition-colors">arrow_forward</span>
  `;
  btnContinuar.addEventListener('click', () => dispararContinuar(ctx));
  gridAcoes.insertBefore(btnContinuar, gridAcoes.children[1]);
  secAcoes.appendChild(gridAcoes);
  container.appendChild(secAcoes);

  // --- Bloco 1: Sessões Ativas ---
  const secAtivas = document.createElement('section');
  secAtivas.className = 'space-y-3';
  secAtivas.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Sessões Ativas</p>`;

  if (ativas.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest p-6 text-center';
    empty.innerHTML = `
      <span class="material-symbols-outlined text-3xl text-outline/40 mb-2 block">videocam_off</span>
      <p class="text-sm text-on-surface-variant">Nenhuma câmera em contagem no momento.</p>
    `;
    secAtivas.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    for (const s of ativas) {
      const card = document.createElement('div');
      card.className = 'rounded-2xl border border-secondary/30 bg-surface-container-lowest p-5 flex items-start gap-4 hover:border-secondary/60 transition-colors cursor-pointer';
      const inicio = s.iniciada_em ? formatarHora(s.iniciada_em) : '--:--';
      card.innerHTML = `
        <div class="p-2.5 rounded-xl bg-secondary-container/40">
          <span class="material-symbols-outlined text-xl text-secondary" style="font-variation-settings:'FILL' 1,'wght' 300">videocam</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold text-on-surface">Câmera ${s.camera_id}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary font-medium">Contando</span>
          </div>
          <p class="text-xs text-on-surface-variant truncate">Embarque: <span class="font-medium text-on-surface">${escapar(s.numero_embarque)}</span></p>
          <div class="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">inventory_2</span>${formatarNumero(s.quantidade_total ?? 0)} peças</span>
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">schedule</span>Início ${inicio}</span>
          </div>
        </div>
      `;
      card.addEventListener('click', () => {
        window.location.hash = `#/cargas/${encodeURIComponent(s.numero_embarque)}`;
      });
      grid.appendChild(card);
    }
    secAtivas.appendChild(grid);
  }
  container.appendChild(secAtivas);

  // --- Bloco 2: Progresso da Carga Atual ---
  if (ativas.length > 0) {
    const embarquesUnicos = [...new Set(ativas.map(s => s.numero_embarque))];
    const secProgresso = document.createElement('section');
    secProgresso.className = 'space-y-3';
    secProgresso.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Progresso da Carga</p>`;

    const gridProg = document.createElement('div');
    gridProg.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

    for (const emb of embarquesUnicos) {
      const prog = await ctx.api.get(`/sessoes/progresso/${encodeURIComponent(emb)}`).catch(() => ({ total_caixas: 0, total_pecas: 0 }));
      const card = document.createElement('div');
      card.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest p-5';
      card.innerHTML = `
        <div class="flex items-center gap-3 mb-3">
          <span class="material-symbols-outlined text-lg text-primary/60" style="font-variation-settings:'FILL' 1,'wght' 300">package_2</span>
          <span class="text-sm font-semibold text-on-surface">${escapar(emb)}</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Caixas fechadas</p>
            <p class="text-2xl font-bold text-on-background">${formatarNumero(prog.total_caixas)}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Peças acumuladas</p>
            <p class="text-2xl font-bold text-on-background">${formatarNumero(prog.total_pecas)}</p>
          </div>
        </div>
      `;
      gridProg.appendChild(card);
    }
    secProgresso.appendChild(gridProg);
    container.appendChild(secProgresso);
  }

  // --- Bloco 3: Últimas Caixas Fechadas ---
  const secUltimas = document.createElement('section');
  secUltimas.className = 'space-y-3';
  secUltimas.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Últimas Caixas Fechadas</p>`;

  if (!ultimasCaixas || ultimasCaixas.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest p-6 text-center';
    empty.innerHTML = `
      <span class="material-symbols-outlined text-3xl text-outline/40 mb-2 block">deployed_code</span>
      <p class="text-sm text-on-surface-variant">Nenhuma caixa encerrada ainda.</p>
    `;
    secUltimas.appendChild(empty);
  } else {
    const tabela = document.createElement('div');
    tabela.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest overflow-hidden';
    tabela.innerHTML = `
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-surface-container-low text-on-surface-variant">
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Embarque</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Caixa</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Peças</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Câmera</th>
            <th class="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Horário</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-container">
          ${ultimasCaixas.map(c => `
            <tr class="hover:bg-surface-container-low/50 transition-colors">
              <td class="px-5 py-3 font-medium text-on-surface">${escapar(c.numero_embarque)}</td>
              <td class="px-5 py-3 text-on-surface-variant">${escapar(c.numero_caixa ?? '—')}</td>
              <td class="px-5 py-3 text-on-surface-variant">${formatarNumero(c.quantidade_total ?? 0)}</td>
              <td class="px-5 py-3 text-on-surface-variant">${c.camera_id ?? '—'}</td>
              <td class="px-5 py-3 text-on-surface-variant">${c.encerrada_em ? formatarHora(c.encerrada_em) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    secUltimas.appendChild(tabela);
  }
  container.appendChild(secUltimas);

  return container;
}

async function dispararContinuar(ctx) {
  try {
    const sessoes = normalizarSessoes(await ctx.api.get('/sessoes'));
    if (sessoes.length === 1) {
      abrirContinuarCargaUnica({
        sessao: sessoes[0],
        onContinuar: ({ sessao }) => {
          if (sessao?.numero_embarque) {
            window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque)}`;
          }
        },
      });
      return;
    }
    if (sessoes.length > 1) {
      abrirContinuarCargaMultipla({
        sessoes,
        onContinuar: ({ sessao }) => {
          if (sessao?.numero_embarque) {
            window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque)}`;
          }
        },
      });
      return;
    }

    const embarques = await ctx.api.get('/embarques?status=aberto');
    if (!Array.isArray(embarques) || embarques.length === 0) {
      toast.info('Nenhuma carga aberta no momento.');
      return;
    }
    if (embarques.length === 1) {
      window.location.hash = `#/cargas/${encodeURIComponent(embarques[0].numero_embarque)}`;
      return;
    }
    window.location.hash = '#/cargas';
  } catch (e) {
    toast.erro(`Falha ao buscar cargas abertas: ${e.message}`);
  }
}

function normalizarSessoes(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.filter((sessao) => typeof sessao?.id === 'string' && sessao.id.trim());
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
