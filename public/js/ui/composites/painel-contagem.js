import { formatarHora, formatarNumero } from '../../infra/formatters.js';
import { Button } from '../primitives/button.js';

export function PainelContagem({ sessao, onEncerrar, onReiniciarContagem, onReiniciarSessao } = {}) {
  const tema = obterTema(sessao.camera_id);
  const el = document.createElement('section');
  el.dataset.painelSessao = 'true';
  el.dataset.sessaoId = sessao.id;
  el.dataset.cameraId = String(sessao.camera_id);
  el.className = `overflow-hidden rounded-[28px] border border-surface-container bg-surface-container-lowest zen-shadow-ambient ${tema.sombra}`.trim();
  el.innerHTML = `
    <div class="border-b border-surface-container ${tema.faixa}">
      <div class="flex items-center justify-between gap-3 px-6 py-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${tema.badge}">
            Câmera ${sessao.camera_id}
          </span>
          <span class="text-xs font-medium text-on-surface-variant">${sessao.programa_nome ?? 'Aguardando programa'}</span>
        </div>
        <span data-sessao-token="${sessao.id}" class="rounded-full bg-surface-container-lowest/80 px-2.5 py-1 text-[10px] font-mono text-outline">${sessao.id.slice(0, 8)}</span>
      </div>
    </div>
    <div class="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
      <div class="space-y-6 px-6 py-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Programa ativo</p>
          <h3 class="mt-2 font-headline text-3xl font-light tracking-tight text-on-surface">${sessao.programa_nome ?? 'Aguardando programa'}</h3>
        </div>
        <dl class="grid gap-4 sm:grid-cols-2">
          <div data-sessao-meta="operador" class="rounded-2xl bg-surface-container-low px-4 py-4">
            <dt class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Operador</dt>
            <dd class="mt-1 text-lg font-semibold text-on-surface">${sessao.codigo_operador ?? '—'}</dd>
          </div>
          <div data-sessao-meta="op" class="rounded-2xl bg-surface-container-low px-4 py-4">
            <dt class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">OP</dt>
            <dd class="mt-1 text-lg font-semibold text-on-surface">${sessao.codigo_op ?? '—'}</dd>
          </div>
          <div data-sessao-meta="inicio" class="rounded-2xl bg-surface-container-low px-4 py-4">
            <dt class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Início</dt>
            <dd class="mt-1 text-lg font-semibold text-on-surface">${formatarHora(sessao.iniciada_em) || '—'}</dd>
          </div>
          <div data-sessao-meta="status" class="rounded-2xl bg-surface-container-low px-4 py-4">
            <dt class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Status</dt>
            <dd class="mt-1 text-lg font-semibold ${tema.textoStatus}">Em contagem</dd>
          </div>
        </dl>
      </div>
      <div data-counter-shell class="flex flex-col justify-center border-t border-surface-container bg-gradient-to-br from-surface-container-lowest to-surface-container-low px-6 py-8 xl:border-l xl:border-t-0">
        <div class="text-center">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-outline">Contagem ao vivo</p>
          <div data-contagem class="mt-4 font-headline text-[5.5rem] font-extralight leading-none tracking-tight text-primary sm:text-[6.5rem]">${formatarNumero(sessao.quantidade_total ?? 0)}</div>
          <p class="mt-3 text-[10px] uppercase tracking-[0.3em] text-outline">Peças</p>
        </div>
      </div>
    </div>
  `;
  if (onEncerrar || onReiniciarContagem || onReiniciarSessao) {
    const actions = document.createElement('div');
    actions.dataset.sessaoActions = 'true';
    actions.className = 'flex flex-wrap items-center justify-end gap-3 border-t border-surface-container bg-surface-container-low px-6 py-4';
    if (onReiniciarContagem) {
      const btn = Button({ texto: 'Reiniciar Contagem', variante: 'secondary', onClick: onReiniciarContagem, className: 'bg-surface-container-high hover:bg-surface-container px-4 py-2.5' });
      btn.dataset.acaoPainel = 'reiniciar-contagem';
      actions.appendChild(btn);
    }
    if (onReiniciarSessao) {
      const btn = Button({ texto: 'Reiniciar Sessão', variante: 'secondary', onClick: onReiniciarSessao, className: 'bg-surface-container-high hover:bg-surface-container px-4 py-2.5' });
      btn.dataset.acaoPainel = 'reiniciar-sessao';
      actions.appendChild(btn);
    }
    if (onEncerrar) {
      const btn = Button({ texto: 'Encerrar Sessão', variante: 'primary', onClick: onEncerrar, className: 'px-5 py-2.5' });
      btn.dataset.acaoPainel = 'encerrar-sessao';
      actions.appendChild(btn);
    }
    el.appendChild(actions);
  }
  return el;
}

function obterTema(cameraId) {
  if (Number(cameraId) === 1) {
    return {
      faixa: 'bg-secondary-container/35',
      badge: 'bg-secondary-container text-on-secondary-container',
      textoStatus: 'text-secondary',
      sombra: 'shadow-secondary/10',
    };
  }
  return {
    faixa: 'bg-primary-container/45',
    badge: 'bg-primary-container text-primary-dim',
    textoStatus: 'text-primary',
    sombra: 'shadow-primary/10',
  };
}
