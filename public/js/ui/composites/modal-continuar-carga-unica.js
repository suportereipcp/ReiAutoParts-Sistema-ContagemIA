import { toast } from '../primitives/toast.js';

export function abrirContinuarCargaUnica({ sessao, onContinuar } = {}) {
  const overlay = document.createElement('div');
  overlay.dataset.modalOverlay = 'true';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm p-4';

  const container = document.createElement('div');
  container.dataset.stage = 'continuar-unica';
  container.className = 'relative w-full max-w-4xl overflow-hidden rounded-[28px] bg-surface-container-lowest shadow-2xl';

  const accent = document.createElement('div');
  accent.dataset.accentoModal = 'true';
  accent.className = 'absolute inset-y-0 left-0 w-1 bg-primary/25';

  const conteudo = document.createElement('div');
  conteudo.className = 'grid gap-0 md:grid-cols-[1.1fr_0.9fr]';

  const colunaFormulario = document.createElement('section');
  colunaFormulario.className = 'px-10 py-10';
  colunaFormulario.innerHTML = `
    <header class="mb-8">
      <h2 class="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Carga Atual</h2>
      <p class="mt-2 text-sm font-light text-on-surface-variant">Uma operação está pendente. Verifique os dados para continuar.</p>
    </header>
  `;

  const grade = document.createElement('div');
  grade.className = 'grid gap-5 md:grid-cols-2';
  grade.appendChild(criarCampo({
    label: 'Ordem de Produção',
    inputAttrs: {
      value: sessao?.codigo_op ?? '',
      readOnly: true,
      'data-input': 'codigo_op',
    },
    extraClassName: 'opacity-90 cursor-not-allowed',
  }));
  const operCampo = criarCampo({
    label: 'Código do Operador',
    inputAttrs: {
      value: sessao?.codigo_operador ?? '',
      type: 'password',
      placeholder: '••••••••',
      'data-input': 'codigo_operador',
    },
  });
  grade.appendChild(operCampo);
  colunaFormulario.appendChild(grade);

  const item = document.createElement('section');
  item.dataset.itemIdentificado = 'true';
  item.className = 'mt-8 flex items-center gap-6 rounded-[24px] bg-surface-container-low px-6 py-6';

  const thumb = document.createElement('div');
  thumb.dataset.itemPreview = 'true';
  thumb.className = 'flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high to-surface-variant';
  thumb.innerHTML = '<span class="material-symbols-outlined text-[4rem] text-outline-variant/70">precision_manufacturing</span>';

  const descricao = document.createElement('div');
  descricao.className = 'min-w-0 flex-1';
  descricao.innerHTML = `
    <div class="mb-3 inline-flex rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-on-secondary-container">Item Identificado</div>
    <h3 class="font-headline text-2xl font-bold tracking-tight text-on-surface">${escapar(sessao?.programa_nome ?? 'Programa não confirmado')}</h3>
    <div class="mt-4 grid gap-4 text-sm text-on-surface-variant md:grid-cols-2">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Embarque</p>
        <p class="mt-1 font-medium text-on-surface">${escapar(sessao?.numero_embarque ?? '—')}</p>
      </div>
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Câmera</p>
        <p class="mt-1 font-medium text-on-surface">Câmera ${escapar(sessao?.camera_id ?? '—')}</p>
      </div>
    </div>
  `;

  item.appendChild(thumb);
  item.appendChild(descricao);
  colunaFormulario.appendChild(item);

  const acoes = document.createElement('div');
  acoes.className = 'mt-10 flex items-center justify-end gap-4';

  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'rounded-xl px-6 py-3 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fechar);

  const continuar = document.createElement('button');
  continuar.type = 'button';
  continuar.dataset.submitContinuar = 'true';
  continuar.className = 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-primary to-primary-dim px-8 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition hover:scale-[1.01] active:scale-[0.99]';
  continuar.innerHTML = '<span class="material-symbols-outlined !text-lg">play_arrow</span>Continuar';
  continuar.addEventListener('click', () => {
    const codigoOperador = operCampo.querySelector('input').value.trim();
    if (!codigoOperador) {
      toast.erro('Informe o código do operador.');
      return;
    }
    fechar();
    if (onContinuar) onContinuar({ sessao, codigoOperador });
    else if (sessao?.numero_embarque) window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque)}`;
  });

  acoes.appendChild(cancelar);
  acoes.appendChild(continuar);
  colunaFormulario.appendChild(acoes);

  const colunaVisual = document.createElement('aside');
  colunaVisual.className = 'hidden bg-surface-container-high px-8 py-10 md:flex md:flex-col';
  colunaVisual.innerHTML = `
    <div class="mb-6 flex items-center justify-between">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Visualização da Peça</span>
      <div class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
        <span class="h-2 w-2 rounded-full bg-secondary"></span>
        Sistema Ativo
      </div>
    </div>
    <div class="flex flex-1 flex-col rounded-[24px] border border-outline-variant/10 bg-surface-container-lowest p-6">
      <div class="relative flex-1 overflow-hidden rounded-[20px] bg-gradient-to-br from-surface-container-high to-surface-container">
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="material-symbols-outlined text-[7rem] text-outline-variant/45">manufacturing</span>
        </div>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/95 to-transparent p-5">
          <h3 class="font-headline text-xl font-bold tracking-tight text-on-surface">${escapar(sessao?.programa_nome ?? 'Programa não confirmado')}</h3>
          <p class="mt-1 text-xs font-light text-on-surface-variant">Câmera ${escapar(sessao?.camera_id ?? '—')} · Embarque ${escapar(sessao?.numero_embarque ?? '—')}</p>
        </div>
      </div>
      <div class="mt-5 grid grid-cols-2 gap-4">
        <div class="rounded-2xl bg-surface-container p-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Última Inspeção</p>
          <p class="mt-1 text-sm font-medium text-on-surface">${rotuloMomento(sessao?.iniciada_em)}</p>
        </div>
        <div class="rounded-2xl bg-surface-container p-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Contagem Atual</p>
          <p class="mt-1 text-sm font-medium text-on-surface">${sessao?.quantidade_total ?? 0} peças</p>
        </div>
      </div>
    </div>
  `;

  conteudo.appendChild(colunaFormulario);
  conteudo.appendChild(colunaVisual);
  container.appendChild(accent);
  container.appendChild(conteudo);
  overlay.appendChild(container);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) fechar();
  });

  const onKeydown = (event) => {
    if (event.key === 'Escape') fechar();
  };

  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);

  function fechar() {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  return { fechar };
}

function criarCampo({ label, inputAttrs = {}, extraClassName = '' }) {
  const bloco = document.createElement('label');
  bloco.className = 'block';

  const titulo = document.createElement('span');
  titulo.className = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline';
  titulo.textContent = label;

  const input = document.createElement('input');
  input.className = `w-full rounded-2xl border-none bg-surface-container-high px-4 py-3 text-base text-on-surface shadow-inner outline-none transition focus:ring-2 focus:ring-primary/20 ${extraClassName}`.trim();
  for (const [chave, valor] of Object.entries(inputAttrs)) {
    if (chave === 'readOnly') input.readOnly = Boolean(valor);
    else if (chave in input) input[chave] = valor;
    else input.setAttribute(chave, valor);
  }

  bloco.appendChild(titulo);
  bloco.appendChild(input);
  return bloco;
}

function rotuloMomento(iso) {
  if (!iso) return 'Agora';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Agora';
  }
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
