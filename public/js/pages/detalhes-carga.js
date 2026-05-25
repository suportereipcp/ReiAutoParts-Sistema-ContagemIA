import { PainelContagem } from '../ui/composites/painel-contagem.js';
import { TabelaCaixas } from '../ui/composites/tabela-caixas.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';
import { formatarNumero } from '../infra/formatters.js';
import { agruparCaixas } from '../domain/caixas.js';
import { abrirModalEncerrarSessao } from '../ui/composites/modal-encerrar-sessao.js';
import { abrirModalReimprimir } from '../ui/composites/modal-reimprimir.js';

const CAMERAS = [1, 2];

export async function renderDetalhesCarga(ctx, numero) {
  const el = document.createElement('div');
  el.className = 'space-y-6 max-w-7xl';

  const [embarque, sessoes] = await Promise.all([
    ctx.api.get(`/embarques/${encodeURIComponent(numero)}`),
    ctx.api.get(`/sessoes?embarque=${encodeURIComponent(numero)}`).catch(() => []),
  ]);
  const caixas = agruparCaixas(sessoes);
  const ativas = sessoes.filter((sessao) => sessao.status === 'ativa');

  function recarregar() {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  const header = document.createElement('section');
  header.dataset.resumoCarga = 'true';
  header.className = 'rounded-[28px] border border-surface-container bg-surface-container-lowest px-7 py-6 zen-shadow-ambient';
  header.innerHTML = `
    <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
      <div class="space-y-4">
        ${ativas.length > 0 ? `<div class="zen-glow-ativas inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-secondary-container">
          <span class="h-1.5 w-1.5 rounded-full bg-secondary"></span>
          ${ativas.length} sess${ativas.length === 1 ? 'ão' : 'ões'} ativa${ativas.length === 1 ? '' : 's'}
        </div>` : ''}
        <div>
          <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Detalhes da Carga</p>
          <div class="inline-flex items-center rounded-2xl border border-outline-variant/40 bg-surface-container-low px-4 py-2">
            <span class="font-headline text-4xl font-bold tracking-tight text-on-surface">${embarque.numero_embarque}</span>
          </div>
          <p class="mt-3 text-sm font-light text-on-surface-variant">${embarque.motorista ?? '-'} · ${embarque.placa ?? '-'}</p>
        </div>
        <div data-header-actions class="flex flex-wrap gap-3 pt-2"></div>
      </div>
      <div class="grid gap-3 xl:w-56">
        <div class="rounded-2xl bg-surface-container-low px-4 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Ativas</p>
          <p class="mt-1 text-2xl font-headline font-semibold text-on-surface">${formatarNumero(ativas.length)}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-low px-4 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Caixas</p>
          <p class="mt-1 text-2xl font-headline font-semibold text-on-surface">${formatarNumero(caixas.length)}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-low px-4 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Total</p>
          <p class="mt-1 text-2xl font-headline font-semibold text-on-surface">${formatarNumero(caixas.reduce((acc, caixa) => acc + (Number(caixa.quantidade_total) || 0), 0))}</p>
        </div>
      </div>
    </div>
  `;
  const headerActions = header.querySelector('[data-header-actions]');
  const btnNovaSessao = Button({
    texto: 'Nova Sessão',
    variante: 'secondary',
    className: 'bg-surface-container-high hover:bg-surface-container px-5 py-3',
    onClick: async () => {
      const ocupadas = new Set(ativas.map((s) => Number(s.camera_id)));
      const todasEmUso = CAMERAS.every((cam) => ocupadas.has(cam));
      if (todasEmUso) {
        mostrarModalCamerasEmUso();
        return;
      }
      window.location.hash = `#/cargas/${encodeURIComponent(numero)}/nova-sessao`;
    },
  });
  const btnFinalizar = Button({ texto: 'Finalizar Carga', icone: 'check_circle', className: 'px-5 py-3', onClick: () => mostrarModalFaturamentoPendente(embarque.numero_embarque) });
  headerActions.appendChild(btnNovaSessao);
  if (!embarque.numero_nota_fiscal) {
    headerActions.appendChild(btnFinalizar);
  }
  el.appendChild(header);

  // Banner de sugestão de realocação (Task 19)
  if (ctx.faturamentoSvc?.sugerirRealocacoes) {
    try {
      const sugestoes = await ctx.faturamentoSvc.sugerirRealocacoes(embarque.numero_embarque);
      if (sugestoes && sugestoes.length > 0) {
        const banner = document.createElement('div');
        banner.dataset.bannerRealocacao = 'true';
        banner.className = 'rounded-xl bg-amber-50 border border-amber-200 px-6 py-4 flex items-center gap-3';
        banner.innerHTML = `
          <span class="material-symbols-outlined text-amber-600 text-xl shrink-0">swap_horiz</span>
          <div class="flex-1">
            <p class="text-sm font-medium text-amber-800">
              <strong>${sugestoes.length}</strong> item(s) reprovado(s) de embarques anteriores podem ser realocados para este embarque.
            </p>
          </div>
        `;
        el.appendChild(banner);
      }
    } catch { /* silencioso se faturamentoSvc não estiver disponível */ }
  }

  if (ativas.length > 0) {
    const paineis = document.createElement('div');
    paineis.dataset.sessoesAtivas = 'true';
    paineis.className = 'grid gap-5 xl:grid-cols-2';
    const ordenadas = [...ativas].sort((a, b) => Number(b.camera_id) - Number(a.camera_id));
    for (const ativa of ordenadas) {
      const painel = PainelContagem({
        sessao: ativa,
        onEncerrar: () => abrirModalEncerrarSessao({
          sessao: ativa,
          caixasExistentes: caixas
            .filter((caixa) => caixa.codigo_op === ativa.codigo_op)
            .map((caixa) => ({ id: caixa.id, label: caixa.numero_caixa_exibicao })),
          embarqueFaturado: Boolean(embarque.numero_nota_fiscal),
          onConfirmar: async (payload) => {
            try {
              const resultado = await ctx.sessoesSvc.encerrar(ativa.id, payload);
              const etiqueta = resultado?.etiqueta;
              if (etiqueta?.status === 'erro') toast.erro(`Sessão encerrada. Etiqueta não impressa: ${etiqueta.erro ?? etiqueta.erro_detalhe ?? 'erro'}`);
              else if (etiqueta) toast.info(`Sessão encerrada. Etiqueta ${etiqueta.status}.`);
              recarregar();
            } catch (e) { toast.erro(e.message); }
          },
        }),
        onReiniciarContagem: async () => {
          try {
            await ctx.sessoesSvc.reiniciarContagem(ativa.id);
            recarregar();
          } catch (e) { toast.erro(e.message); }
        },
        onReiniciarSessao: async () => {
          try {
            await ctx.sessoesSvc.reiniciarSessao(ativa.id);
            recarregar();
          } catch (e) { toast.erro(e.message); }
        },
      });
      if (ordenadas.length === 1) painel.classList.add('xl:col-start-2');
      paineis.appendChild(painel);
    }
    el.appendChild(paineis);
  }

  async function reimprimirCaixa(caixa) {
    abrirModalReimprimir({
      numeroCaixa: caixa.numero_caixa_exibicao || caixa.numero_caixa,
      onConfirmar: async (codigoOperador) => {
        try {
          const etiqueta = await ctx.etiquetasSvc.reimprimirCaixa({
            numero_embarque: numero,
            numero_caixa: caixa.numero_caixa,
            codigo_operador: codigoOperador,
          });
          if (etiqueta?.status === 'erro') toast.erro(`Etiqueta não impressa: ${etiqueta.erro_detalhe ?? 'erro'}`);
          else toast.info(`Etiqueta ${etiqueta?.status ?? 'pendente'}. Partes: ${etiqueta?.partes_total ?? 0}`);
        } catch (e) {
          toast.erro(e.message);
        }
      }
    });
  }

  el.appendChild(TabelaCaixas({ caixas, onReimprimir: reimprimirCaixa }));

  if (ativas.length > 0) {
    const unsub = ctx.sessoes.subscribe(() => {
      for (const ativa of ativas) {
        const atualizada = ctx.sessoes.porCamera(ativa.camera_id);
        if (!atualizada || atualizada.id !== ativa.id) continue;
        if (atualizada.status !== 'ativa') {
          recarregar();
          return;
        }
        const painel = el.querySelector(`[data-painel-sessao][data-sessao-id="${ativa.id}"]`);
        const c = painel?.querySelector('[data-contagem]');
        if (c) c.textContent = formatarNumero(atualizada.quantidade_total);
      }
    });
    window.addEventListener('hashchange', unsub, { once: true });
  }
  return el;
}

// Paletas dos modais de aviso centrais
const PALETA_CAMERAS = {
  borda: 'border-amber-300',
  sombra: 'shadow-[0_24px_70px_rgba(146,64,14,0.28)]',
  gradiente: 'from-amber-400 to-orange-500',
  iconBg: 'bg-amber-100 text-amber-600',
  tagCor: 'text-amber-600',
  tituloCor: 'text-amber-700',
  track: 'bg-amber-100',
};
const PALETA_FATURAMENTO = {
  borda: 'border-cyan-300',
  sombra: 'shadow-[0_24px_70px_rgba(8,47,73,0.30)]',
  gradiente: 'from-blue-800 to-cyan-400',
  iconBg: 'bg-cyan-50 text-blue-700',
  tagCor: 'text-cyan-600',
  tituloCor: 'text-blue-800',
  track: 'bg-cyan-100',
};

// Builder generico de modal de aviso central, auto-fechavel apos duracaoMs.
function mostrarModalAviso({ dataAttr, paleta, icone, tag, titulo, mensagem, assinatura, duracaoMs = 2500 }) {
  document.querySelector(`[${dataAttr}]`)?.remove();

  const overlay = document.createElement('div');
  overlay.setAttribute(dataAttr, 'true');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4';

  const card = document.createElement('div');
  card.className = `w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest border ${paleta.borda} ${paleta.sombra}`;

  const accent = document.createElement('div');
  accent.className = `h-1.5 bg-gradient-to-r ${paleta.gradiente}`;
  card.appendChild(accent);

  const body = document.createElement('div');
  body.className = 'px-6 py-6';

  const head = document.createElement('div');
  head.className = 'flex items-start gap-4';

  const iconWrap = document.createElement('div');
  iconWrap.className = `h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${paleta.iconBg}`;
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-2xl';
  icon.textContent = icone;
  iconWrap.appendChild(icon);

  const texts = document.createElement('div');
  texts.className = 'min-w-0';
  const tagEl = document.createElement('p');
  tagEl.className = `mb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${paleta.tagCor}`;
  tagEl.textContent = tag;
  const tituloEl = document.createElement('h3');
  tituloEl.className = `text-lg font-bold ${paleta.tituloCor}`;
  tituloEl.textContent = titulo;
  const sub = document.createElement('p');
  sub.className = 'mt-2 text-sm text-on-surface-variant';
  sub.textContent = mensagem;
  texts.appendChild(tagEl);
  texts.appendChild(tituloEl);
  texts.appendChild(sub);

  head.appendChild(iconWrap);
  head.appendChild(texts);
  body.appendChild(head);

  if (assinatura) {
    const ass = document.createElement('p');
    ass.className = `mt-5 text-right text-xs font-semibold ${paleta.tituloCor}/80`;
    ass.textContent = assinatura;
    body.appendChild(ass);
  }

  card.appendChild(body);

  const track = document.createElement('div');
  track.dataset.modalProgressTrack = 'true';
  track.className = `h-1 overflow-hidden ${paleta.track}`;
  const bar = document.createElement('div');
  bar.className = `h-full bg-gradient-to-r ${paleta.gradiente}`;
  bar.style.transformOrigin = 'left';
  bar.style.animation = `zen-modal-progress ${duracaoMs}ms linear forwards`;
  track.appendChild(bar);
  card.appendChild(track);

  overlay.appendChild(card);

  if (!document.getElementById('zen-modal-progress-style')) {
    const style = document.createElement('style');
    style.id = 'zen-modal-progress-style';
    style.textContent = '@keyframes zen-modal-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }';
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), duracaoMs);
}

// Aviso (amarelo/laranja) quando todas as cameras estao em uso.
function mostrarModalCamerasEmUso() {
  mostrarModalAviso({
    dataAttr: 'data-modal-cameras-em-uso',
    paleta: PALETA_CAMERAS,
    icone: 'warning',
    tag: 'Aviso',
    titulo: 'Todas as câmeras de contagem estão em uso',
    mensagem: 'Por favor, aguarde a conclusão das sessões ou encerrá-las por gentileza...',
    assinatura: 'Atenciosamente, Rei AutoParts!',
  });
}

// Aviso (azul-escuro/ciano) quando a carga ainda nao foi faturada.
function mostrarModalFaturamentoPendente(numeroEmbarque) {
  mostrarModalAviso({
    dataAttr: 'data-modal-faturamento-pendente',
    paleta: PALETA_FATURAMENTO,
    icone: 'receipt_long',
    tag: 'Faturamento',
    titulo: 'Faturamento do Embarque Pendente',
    mensagem: `O Embarque ${numeroEmbarque} não pode ser finalizado, aguardando departamento comercial para criação da Nota Fiscal!`,
  });
}
