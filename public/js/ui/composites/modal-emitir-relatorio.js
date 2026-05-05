import { Modal } from '../primitives/modal.js';

function mostrarExportacaoSucesso({ duracaoMs, onCompletar }) {
  let finalizou = false;
  const overlay = document.createElement('div');
  overlay.dataset.exportacaoSucesso = 'true';
  overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center pointer-events-none px-4';

  const card = document.createElement('div');
  card.className = 'pointer-events-auto w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 overflow-hidden';
  card.innerHTML = `
    <div class="p-6 flex gap-4 items-start">
      <div class="h-11 w-11 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-2xl">download_done</span>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-base font-bold text-on-surface">Exportação realizada</p>
        <p class="text-sm text-on-surface-variant mt-1">Download iniciado com sucesso.</p>
      </div>
      <button type="button" data-fechar-exportacao class="h-9 w-9 rounded-lg hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center" aria-label="Fechar mensagem">
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>
    <div class="h-1 bg-surface-container-high">
      <div data-exportacao-progresso class="h-full bg-secondary transition-[width] ease-linear" style="width:100%"></div>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const progresso = overlay.querySelector('[data-exportacao-progresso]');
  const animar = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));
  animar(() => { progresso.style.transitionDuration = `${duracaoMs}ms`; progresso.style.width = '0%'; });

  const fechar = ({ manual = false } = {}) => {
    if (finalizou) return;
    finalizou = true;
    clearTimeout(timer);
    overlay.remove();
    if (!manual) onCompletar?.();
  };
  const timer = setTimeout(() => fechar(), duracaoMs);
  overlay.querySelector('[data-fechar-exportacao]').addEventListener('click', () => fechar({ manual: true }));
}

export function abrirModalEmitir({ numero, onBaixar, duracaoSucessoMs = 3000 }) {
  const m = Modal({ title: `Emitir Relatório — ${numero}`, subtitle: 'Selecione o formato de saída.' });
  m.abrir();
  const body = m.corpo();
  const erro = document.createElement('p');
  erro.dataset.erroExportacao = 'true';
  erro.className = 'hidden text-sm text-error';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-4';
  for (const fmt of ['csv', 'xlsx', 'pdf']) {
    const b = document.createElement('button');
    b.dataset.fmt = fmt;
    b.className = 'flex flex-col items-center gap-3 p-6 bg-surface-container-high hover:bg-secondary-container/40 rounded-xl transition-colors';
    b.innerHTML = `<span class="material-symbols-outlined text-4xl text-secondary">description</span><span class="text-sm font-bold uppercase tracking-widest">${fmt}</span>`;
    b.addEventListener('click', async () => {
      erro.classList.add('hidden');
      b.disabled = true;
      b.classList.add('opacity-60', 'cursor-wait');
      try {
        await onBaixar(fmt);
        mostrarExportacaoSucesso({
          duracaoMs: duracaoSucessoMs,
          onCompletar: () => m.fechar(),
        });
      } catch (e) {
        erro.textContent = e.message || 'Falha ao exportar relatório.';
        erro.classList.remove('hidden');
      } finally {
        b.disabled = false;
        b.classList.remove('opacity-60', 'cursor-wait');
      }
    });
    grid.appendChild(b);
  }
  body.appendChild(grid);
  body.appendChild(erro);
}
