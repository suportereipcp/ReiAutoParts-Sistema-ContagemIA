import { formatarHora, formatarNumero } from '../../infra/formatters.js';
import { Button } from '../primitives/button.js';

export function PainelContagem({ sessao, onEncerrar, onReiniciarContagem, onReiniciarSessao, liveImage = false } = {}) {
  const tema = obterTema(sessao.camera_id);
  const el = document.createElement('section');
  el.dataset.painelSessao = 'true';
  el.dataset.sessaoId = sessao.id;
  el.dataset.cameraId = String(sessao.camera_id);
  el.className = 'zen-card-flutuante overflow-hidden rounded-[28px] border border-surface-container bg-surface-container-lowest';
  // No modo TV (liveImage) o card vira coluna flex e ocupa toda a altura
  // disponível, para a imagem preencher o espaço restante de forma uniforme
  // em qualquer resolução (HD/FullHD/2K/4K).
  if (liveImage) el.className += ' flex flex-col h-full';
  // Escalona a flutuacao entre as cameras para um efeito mais organico
  el.style.animationDelay = Number(sessao.camera_id) === 1 ? '0s' : '-3.5s';
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
          <div data-sessao-meta="tempo" class="rounded-2xl bg-surface-container-low px-4 py-4">
            <dt class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Tempo</dt>
            <dd data-tempo class="mt-1 text-lg font-semibold tabular-nums ${tema.textoStatus}">${formatarDuracao(sessao.iniciada_em)}</dd>
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

  if (liveImage) {
    // A área da imagem cresce para ocupar o espaço restante do card (flex-1),
    // após o cabeçalho e os detalhes. Assim a imagem preenche de forma uniforme
    // em qualquer resolução, sem altura fixa que sobra em telas grandes.
    // object-cover preenche toda a área (corta de leve o topo/base; as linhas
    // de contagem ficam no centro e permanecem visíveis). min-h piso para telas
    // muito baixas.
    const area = document.createElement('div');
    area.dataset.cameraLive = 'true';
    area.className = 'relative flex flex-1 min-h-[180px] items-center justify-center overflow-hidden border-t border-surface-container bg-black/80';

    const img = document.createElement('img');
    img.dataset.cameraLiveImg = 'true';
    img.className = 'h-full w-full object-cover';
    img.alt = `Imagem ao vivo da câmera ${sessao.camera_id}`;

    // Controla o ritmo do polling: só pede o próximo quadro quando o anterior
    // termina (load/erro). Evita acumular requisições quando a câmera/rede não
    // acompanham a taxa-alvo — o FPS efetivo vira o máximo sustentável.
    let carregando = true;
    img.src = `/cameras/${sessao.camera_id}/live-image?${Date.now()}`;

    const placeholder = document.createElement('div');
    placeholder.dataset.cameraLivePlaceholder = 'true';
    // `flex` é adicionado só quando o placeholder está visível; mantê-lo junto de
    // `hidden` não esconde nada no Tailwind (`.flex` vence `.hidden` por ordem).
    placeholder.className = 'hidden absolute inset-0 items-center justify-center text-sm font-medium text-outline';
    placeholder.textContent = 'Câmera indisponível';

    img.addEventListener('error', () => {
      carregando = false;
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
      placeholder.classList.add('flex');
    });
    img.addEventListener('load', () => {
      carregando = false;
      img.classList.remove('hidden');
      placeholder.classList.add('hidden');
      placeholder.classList.remove('flex');
    });

    area.appendChild(img);
    area.appendChild(placeholder);
    el.appendChild(area);

    // Polling do JPEG ao vivo; auto-limpa quando o painel sai da tela
    // (mesmo padrão do cronômetro de tempo abaixo). Alvo de ~30 FPS, mas na
    // prática fica limitado à taxa em que a câmera atualiza o iliveimage.jpg e
    // à banda; a guarda `carregando` pula o tick se o quadro anterior ainda não
    // chegou, então o FPS efetivo é o máximo sustentável sem acumular.
    const FPS_ALVO = 30;
    const PERIODO_MS = Math.max(16, Math.round(1000 / FPS_ALVO));
    const timerImg = setInterval(() => {
      if (!el.isConnected) { clearInterval(timerImg); return; }
      if (carregando) return;
      carregando = true;
      img.src = `/cameras/${sessao.camera_id}/live-image?${Date.now()}`;
    }, PERIODO_MS);
    timerImg.unref?.();
  }

  // Cronometro do tempo de sessao: atualiza a cada segundo e se auto-limpa
  // quando o painel sai da tela (evita vazamento de intervalo).
  const tempoEl = el.querySelector('[data-tempo]');
  if (tempoEl) {
    const timer = setInterval(() => {
      if (!el.isConnected) { clearInterval(timer); return; }
      tempoEl.textContent = formatarDuracao(sessao.iniciada_em);
    }, 1000);
    timer.unref?.();
  }

  return el;
}

function formatarDuracao(desde) {
  const inicio = desde ? new Date(desde).getTime() : NaN;
  if (!Number.isFinite(inicio)) return '00:00:00';
  const totalSeg = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function obterTema(cameraId) {
  if (Number(cameraId) === 1) {
    return {
      faixa: 'bg-secondary-container/35',
      badge: 'bg-secondary-container text-on-secondary-container',
      textoStatus: 'text-secondary',
    };
  }
  return {
    faixa: 'bg-primary-container/45',
    badge: 'bg-primary-container text-primary-dim',
    textoStatus: 'text-primary',
  };
}
