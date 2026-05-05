import { PainelContagem } from '../ui/composites/painel-contagem.js';
import { TabelaCaixas } from '../ui/composites/tabela-caixas.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';
import { formatarNumero } from '../infra/formatters.js';
import { agruparCaixas } from '../domain/caixas.js';
import { abrirModalEncerrarSessao } from '../ui/composites/modal-encerrar-sessao.js';

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
    <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div class="space-y-3">
        <div class="inline-flex items-center rounded-full bg-secondary-container/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-secondary-container">
          ${ativas.length} sessão${ativas.length === 1 ? '' : 'ões'} ativa${ativas.length === 1 ? '' : 's'}
        </div>
        <div>
          <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Detalhes da Carga</p>
          <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">${embarque.numero_embarque}</h2>
          <p class="mt-2 text-sm font-light text-on-surface-variant">${embarque.motorista ?? '-'} · ${embarque.placa ?? '-'}</p>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-3 xl:min-w-[28rem]">
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
  const headerActions = document.createElement('div');
  headerActions.className = 'mt-6 flex flex-wrap gap-3';
  const btnNovaSessao = Button({
    texto: 'Nova Sessão',
    variante: 'secondary',
    className: 'bg-surface-container-high hover:bg-surface-container px-5 py-3',
    onClick: async () => { window.location.hash = `#/cargas/${encodeURIComponent(numero)}/nova-sessao`; },
  });
  const btnFinalizar = Button({ texto: 'Finalizar Carga', icone: 'check_circle', className: 'px-5 py-3', onClick: () => toast.info('Finalização via Supabase ainda pendente.') });
  headerActions.appendChild(btnNovaSessao);
  headerActions.appendChild(btnFinalizar);
  header.appendChild(headerActions);
  el.appendChild(header);

  if (ativas.length > 0) {
    const paineis = document.createElement('div');
    paineis.dataset.sessoesAtivas = 'true';
    paineis.className = 'grid gap-5 xl:grid-cols-2';
    for (const ativa of ativas) {
      paineis.appendChild(PainelContagem({
        sessao: ativa,
        onEncerrar: () => abrirModalEncerrarSessao({
          sessao: ativa,
          caixasExistentes: caixas
            .filter((caixa) => caixa.codigo_op === ativa.codigo_op)
            .map((caixa) => ({ id: caixa.id, label: caixa.numero_caixa_exibicao })),
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
      }));
    }
    el.appendChild(paineis);
  }

  async function reimprimirCaixa(caixa) {
    try {
      const codigoOperador = window.prompt('Código do operador para reimpressão');
      if (!codigoOperador) return;
      const etiqueta = await ctx.etiquetasSvc.reimprimirCaixa({
        numero_embarque: numero,
        numero_caixa: caixa.numero_caixa,
        codigo_operador: codigoOperador.trim(),
      });
      if (etiqueta?.status === 'erro') toast.erro(`Etiqueta não impressa: ${etiqueta.erro_detalhe ?? 'erro'}`);
      else toast.info(`Etiqueta ${etiqueta?.status ?? 'pendente'}. Partes: ${etiqueta?.partes_total ?? 0}`);
    } catch (e) {
      toast.erro(e.message);
    }
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
