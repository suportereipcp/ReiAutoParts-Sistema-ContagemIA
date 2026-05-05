import { toast } from '../primitives/toast.js';

export function abrirContinuarCargaMultipla({ sessoes = [], onContinuar } = {}) {
  const overlay = document.createElement('div');
  overlay.dataset.modalOverlay = 'true';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-md p-4';

  const container = document.createElement('div');
  container.dataset.stage = 'continuar-multipla';
  container.className = 'w-full max-w-5xl overflow-hidden rounded-[28px] bg-surface-container-lowest shadow-2xl md:grid md:grid-cols-[1.02fr_0.98fr]';

  const colunaFormulario = document.createElement('section');
  colunaFormulario.dataset.colunaFormulario = 'true';
  colunaFormulario.className = 'px-10 py-10';
  colunaFormulario.innerHTML = `
    <header class="mb-10">
      <h2 class="font-headline text-4xl font-light tracking-tight text-primary">Continuar Carga</h2>
      <p class="mt-2 text-sm font-light text-on-surface-variant">Existem múltiplas cargas pendentes no sistema. Selecione um embarque para prosseguir.</p>
    </header>
  `;

  const selectGroup = document.createElement('label');
  selectGroup.className = 'block';
  selectGroup.innerHTML = '<span class="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-primary-dim">Escolha o Embarque</span>';

  const selectWrap = document.createElement('div');
  selectWrap.className = 'relative';

  const select = document.createElement('select');
  select.dataset.input = 'embarque_selecionado';
  select.className = 'w-full appearance-none rounded-2xl border-none bg-surface-container-high px-4 py-4 pr-12 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20';
  select.innerHTML = '<option value="" disabled selected>Selecione a carga ativa...</option>';
  for (const sessao of sessoes) {
    const option = document.createElement('option');
    option.value = sessao.id;
    option.textContent = `${sessao.numero_embarque ?? '—'} · ${sessao.programa_nome ?? 'Programa não confirmado'}`;
    select.appendChild(option);
  }

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline';
  icon.textContent = 'expand_more';
  selectWrap.appendChild(select);
  selectWrap.appendChild(icon);
  selectGroup.appendChild(selectWrap);

  const opGroup = criarCampo({
    label: 'Ordem de Produção',
    inputAttrs: {
      placeholder: 'Ex: OP-8829-X',
      'data-input': 'codigo_op',
    },
  });
  const operadorGroup = criarCampo({
    label: 'Código do Operador',
    inputAttrs: {
      type: 'password',
      placeholder: '••••••••',
      'data-input': 'codigo_operador',
    },
    adornment: 'visibility',
  });

  const campos = document.createElement('div');
  campos.className = 'space-y-7';
  campos.appendChild(selectGroup);
  campos.appendChild(opGroup);
  campos.appendChild(operadorGroup);
  colunaFormulario.appendChild(campos);

  const acoes = document.createElement('div');
  acoes.className = 'mt-10 flex items-center gap-4';

  const continuar = document.createElement('button');
  continuar.type = 'button';
  continuar.dataset.submitContinuar = 'true';
  continuar.className = 'flex-1 rounded-2xl bg-gradient-to-b from-primary to-primary-dim px-6 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-on-primary shadow-lg shadow-primary/20 transition hover:scale-[1.01] active:scale-[0.99]';
  continuar.textContent = 'Continuar';
  continuar.addEventListener('click', () => {
    const sessaoId = select.value;
    if (!sessaoId) {
      toast.erro('Selecione um embarque.');
      return;
    }
    const codigoOperador = operadorGroup.querySelector('input').value.trim();
    if (!codigoOperador) {
      toast.erro('Informe o código do operador.');
      return;
    }
    const sessao = sessoes.find((item) => item.id === sessaoId);
    fechar();
    if (onContinuar) {
      onContinuar({
        sessao,
        codigoOperador,
        codigoOp: opGroup.querySelector('input').value.trim(),
      });
    } else if (sessao?.numero_embarque) {
      window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque)}`;
    }
  });

  const cancelar = document.createElement('button');
  cancelar.type = 'button';
  cancelar.className = 'rounded-2xl px-6 py-4 text-sm font-medium text-primary transition hover:bg-primary-container/30';
  cancelar.textContent = 'Cancelar';
  cancelar.addEventListener('click', fechar);

  acoes.appendChild(continuar);
  acoes.appendChild(cancelar);
  colunaFormulario.appendChild(acoes);

  const colunaVisualizacao = document.createElement('aside');
  colunaVisualizacao.dataset.colunaVisualizacao = 'true';
  colunaVisualizacao.dataset.visualizacao = 'true';
  colunaVisualizacao.className = 'hidden bg-surface-container-high px-10 py-10 md:flex md:flex-col';

  select.addEventListener('change', () => {
    const sessao = sessoes.find((item) => item.id === select.value) ?? null;
    const inputOp = opGroup.querySelector('input');
    if (sessao?.codigo_op) inputOp.value = sessao.codigo_op;
    renderVisualizacao(colunaVisualizacao, sessao);
  });

  renderVisualizacao(colunaVisualizacao, null);

  container.appendChild(colunaFormulario);
  container.appendChild(colunaVisualizacao);
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

function renderVisualizacao(coluna, sessao) {
  const titulo = sessao?.programa_nome ?? 'Nenhum embarque selecionado';
  const subtitulo = sessao
    ? `Câmera ${sessao.camera_id ?? '—'} · Embarque ${sessao.numero_embarque ?? '—'}`
    : 'Selecione um embarque para visualizar o item.';
  const ultimaInspecao = sessao ? rotuloHora(sessao.iniciada_em) : '—';
  const totalAtual = sessao?.quantidade_total ?? 0;

  coluna.innerHTML = `
    <div class="mb-7 flex items-center justify-between">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-dim">Visualização da Peça</span>
      <div class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
        <span class="h-2 w-2 rounded-full bg-secondary"></span>
        Sistema Ativo
      </div>
    </div>
    <div class="flex flex-1 flex-col">
      <div class="relative flex-1 overflow-hidden rounded-[24px] border border-outline-variant/10 bg-surface-container-lowest">
        <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-container-high via-surface-container-low to-surface-container">
          <span class="material-symbols-outlined text-[7rem] text-outline-variant/45">precision_manufacturing</span>
        </div>
        <button type="button" class="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary shadow">
          <span class="material-symbols-outlined">zoom_in</span>
        </button>
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/95 to-transparent p-6">
          <h3 class="font-headline text-2xl font-bold tracking-tight text-on-surface">${escapar(titulo)}</h3>
          <p class="mt-1 text-xs font-light text-on-surface-variant">${escapar(subtitulo)}</p>
        </div>
      </div>
      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="rounded-2xl bg-surface-container p-4">
          <span class="block text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Última Inspeção</span>
          <span class="mt-1 block text-sm font-medium text-on-surface">${escapar(ultimaInspecao)}</span>
        </div>
        <div class="rounded-2xl bg-surface-container p-4">
          <span class="block text-[10px] font-bold uppercase tracking-[0.18em] text-outline">Contagem Atual</span>
          <span class="mt-1 block text-sm font-medium text-on-surface">${escapar(`${totalAtual} peças`)}</span>
        </div>
      </div>
    </div>
    <div data-status-qualidade="true" class="mt-8 border-t border-outline-variant/20 pt-6">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
          <span class="material-symbols-outlined text-on-secondary-container">verified_user</span>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface">Status da Qualidade</p>
          <p class="text-xs text-on-surface-variant">Lote aprovado para transbordo</p>
        </div>
      </div>
    </div>
  `;
}

function criarCampo({ label, inputAttrs = {}, adornment = '' }) {
  const bloco = document.createElement('label');
  bloco.className = 'block';

  const titulo = document.createElement('span');
  titulo.className = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-primary-dim';
  titulo.textContent = label;

  const invólucro = document.createElement('div');
  invólucro.className = 'relative';

  const input = document.createElement('input');
  input.className = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20';
  for (const [chave, valor] of Object.entries(inputAttrs)) {
    if (chave in input) input[chave] = valor;
    else input.setAttribute(chave, valor);
  }
  invólucro.appendChild(input);

  if (adornment) {
    const icone = document.createElement('span');
    icone.className = 'material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline';
    icone.textContent = adornment;
    invólucro.appendChild(icone);
  }

  bloco.appendChild(titulo);
  bloco.appendChild(invólucro);
  return bloco;
}

function rotuloHora(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function escapar(valor) {
  return String(valor ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
