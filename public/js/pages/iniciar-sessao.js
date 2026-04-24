import { Input } from '../ui/primitives/input.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';

export async function renderIniciarSessao(ctx, { numeroEmbarque = '' } = {}) {
  const el = document.createElement('div');
  el.className = 'max-w-6xl';

  const form = {
    numero_embarque: numeroEmbarque,
    codigo_op: '',
    codigo_operador: '',
    camera_id: '1',
  };
  let opAtual = null;
  let sessaoAberta = null;

  const shell = document.createElement('section');
  shell.className = 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start';
  el.appendChild(shell);

  const principal = document.createElement('div');
  principal.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient space-y-8';
  shell.appendChild(principal);

  const lateral = document.createElement('aside');
  lateral.className = 'bg-surface-container rounded-2xl p-8 zen-shadow-ambient space-y-6';
  shell.appendChild(lateral);

  function destinoCarga(valor = form.numero_embarque) {
    return valor ? `#/cargas/${encodeURIComponent(valor)}` : '#/cargas';
  }

  function erroCameraOcupada(mensagem) {
    return /c[aâ]mera\s+\d+.*sess[aã]o ativa/i.test(String(mensagem ?? ''))
      || /camera\s+\d+.*sessao ativa/i.test(String(mensagem ?? ''));
  }

  function extrairCameraDaMensagem(mensagem, fallback) {
    const match = String(mensagem ?? '').match(/c[aâ]mera\s+(\d+)/i) ?? String(mensagem ?? '').match(/camera\s+(\d+)/i);
    return Number(match?.[1] ?? fallback);
  }

  async function buscarCamerasDisponiveis() {
    const ativas = await ctx.api.get('/sessoes');
    const ocupadas = new Set((ativas ?? []).map((s) => Number(s.camera_id)).filter(Boolean));
    return [1, 2].filter((cameraId) => !ocupadas.has(cameraId));
  }

  function mostrarModalCameraOcupada({ cameraId, camerasDisponiveis }) {
    document.querySelector('[data-camera-ocupada-modal]')?.remove();

    const temDisponivel = camerasDisponiveis.length > 0;
    const complemento = temDisponivel
      ? `Camera ${camerasDisponiveis[0]} esta disponivel para iniciar uma nova contagem.`
      : 'Todas as cameras estao com sessao de contagem em andamento.';

    const overlay = document.createElement('div');
    overlay.dataset.cameraOcupadaModal = 'true';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-scrim/20 px-4';
    overlay.innerHTML = `
      <div data-camera-ocupada-card class="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/50 ring-1 ring-outline-variant/20 shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
        <div class="px-6 py-5">
          <div class="flex items-start gap-4">
            <div class="h-11 w-11 shrink-0 rounded-xl bg-error-container/60 text-error flex items-center justify-center">
              <span class="material-symbols-outlined text-2xl">photo_camera</span>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Camera ocupada</p>
              <h3 class="text-lg font-semibold text-on-surface">Camera ${cameraId} em contagem</h3>
              <p class="text-sm text-on-surface-variant mt-2">Esta camera ja possui uma sessao em andamento. Encerre a sessao atual antes de continuar.</p>
              <p class="text-sm font-medium text-on-surface mt-4">${complemento}</p>
            </div>
          </div>
        </div>
        <div data-camera-ocupada-progress-track class="h-1 bg-surface-container-high overflow-hidden">
          <div data-camera-ocupada-progress class="h-full bg-error" style="transform-origin: left; animation: camera-ocupada-progress 2000ms linear forwards;"></div>
        </div>
      </div>
    `;

    if (!document.getElementById('camera-ocupada-progress-style')) {
      const style = document.createElement('style');
      style.id = 'camera-ocupada-progress-style';
      style.textContent = '@keyframes camera-ocupada-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2000);
  }

  async function tratarErroAbrirSessao(error) {
    if (!erroCameraOcupada(error.message)) {
      toast.erro(error.message);
      return;
    }

    let camerasDisponiveis = [];
    try {
      camerasDisponiveis = await buscarCamerasDisponiveis();
    } catch {
      camerasDisponiveis = [];
    }

    mostrarModalCameraOcupada({
      cameraId: extrairCameraDaMensagem(error.message, form.camera_id),
      camerasDisponiveis,
    });
  }

  function renderItemIdentificado() {
    lateral.innerHTML = '';
    const titulo = document.createElement('p');
    titulo.className = 'text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold';
    titulo.textContent = 'Item Identificado';

    const preview = document.createElement('div');
    preview.className = 'aspect-square rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center justify-center text-center px-6';
    preview.innerHTML = `
      <span class="material-symbols-outlined text-5xl text-primary/60 mb-3">precision_manufacturing</span>
      <p class="text-sm font-medium text-on-surface">${opAtual?.item_descricao ?? 'Nenhum item carregado'}</p>
      <p class="text-xs text-on-surface-variant mt-2">${opAtual?.item_codigo ? `Item ${opAtual.item_codigo}` : 'Informe uma OP para carregar o contexto do item.'}</p>
    `;

    const meta = document.createElement('div');
    meta.className = 'space-y-2 text-sm';
    meta.innerHTML = `
      <div>
        <p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">OP</p>
        <p class="text-on-surface">${opAtual?.codigo_op ?? '-'}</p>
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Previsto</p>
        <p class="text-on-surface">${opAtual?.quantidade_prevista ?? '-'}</p>
      </div>
      <div>
        <p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Imagem</p>
        <p class="text-on-surface-variant">O cadastro atual ainda nao fornece foto da peca.</p>
      </div>
    `;

    lateral.appendChild(titulo);
    lateral.appendChild(preview);
    lateral.appendChild(meta);
  }

  async function carregarOp(codigo) {
    const normalizado = String(codigo ?? '').trim();
    if (!normalizado) {
      opAtual = null;
      renderItemIdentificado();
      return;
    }
    try {
      opAtual = await ctx.catalogos.op(normalizado);
      renderItemIdentificado();
    } catch {
      opAtual = {
        codigo_op: normalizado,
        item_codigo: '',
        item_descricao: 'OP nao encontrada no catalogo local',
        quantidade_prevista: '-',
      };
      renderItemIdentificado();
    }
  }

  function renderFormulario() {
    principal.innerHTML = '';

    const cabecalho = document.createElement('header');
    cabecalho.innerHTML = `
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Inicio da Sessao</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Nova Sessao de Contagem</h2>
      <p class="text-sm text-on-surface-variant font-light mt-2">Defina embarque, item, operador e camera antes de selecionar o programa da Keyence.</p>
    `;

    const embarqueIn = Input({ label: 'Numero do Embarque', id: 'sessao-emb', value: form.numero_embarque });
    const embarqueInput = embarqueIn.querySelector('input');
    embarqueInput.dataset.input = 'numero_embarque';
    if (numeroEmbarque) {
      embarqueInput.readOnly = true;
      embarqueInput.classList.add('opacity-80', 'cursor-not-allowed');
    }

    const opIn = Input({ label: 'Ordem de Producao', id: 'sessao-op', value: form.codigo_op });
    const opInput = opIn.querySelector('input');
    opInput.dataset.input = 'codigo_op';
    opInput.addEventListener('change', () => {
      form.codigo_op = opInput.value.trim();
      carregarOp(form.codigo_op);
    });

    const operIn = Input({ label: 'Codigo do Operador', id: 'sessao-oper', value: form.codigo_operador });
    const operInput = operIn.querySelector('input');
    operInput.dataset.input = 'codigo_operador';

    const cameraIn = Input({ label: 'Camera (1 ou 2)', id: 'sessao-cam', value: form.camera_id });
    const cameraInput = cameraIn.querySelector('input');
    cameraInput.dataset.input = 'camera_id';

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';
    grid.appendChild(opIn);
    grid.appendChild(operIn);

    const resumo = document.createElement('div');
    resumo.className = 'rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface-variant';
    resumo.innerHTML = `
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Estado do Fluxo</p>
      <p>A sessao so segue para a carga depois que o programa for confirmado. Se o operador desistir no meio, a tela seguinte passa a oferecer cancelamento imediato da sessao.</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap gap-3 pt-2';
    const continuar = Button({
      texto: 'Continuar',
      variante: 'primary',
      onClick: async () => {
        form.numero_embarque = embarqueInput.value.trim();
        form.codigo_op = opInput.value.trim();
        form.codigo_operador = operInput.value.trim();
        form.camera_id = cameraInput.value.trim() || '1';
        try {
          sessaoAberta = await ctx.sessoesSvc.abrir({
            numero_embarque: form.numero_embarque,
            codigo_op: form.codigo_op,
            codigo_operador: form.codigo_operador,
            camera_id: Number(form.camera_id),
          });
          renderSelecaoPrograma();
        } catch (e) {
          await tratarErroAbrirSessao(e);
        }
      },
    });
    continuar.dataset.submitAbrirSessao = 'true';

    const cancelar = Button({
      texto: 'Voltar para Cargas',
      variante: 'secondary',
      onClick: () => { window.location.hash = destinoCarga(); },
    });

    actions.appendChild(continuar);
    actions.appendChild(cancelar);

    principal.appendChild(cabecalho);
    principal.appendChild(embarqueIn);
    principal.appendChild(grid);
    principal.appendChild(cameraIn);
    principal.appendChild(resumo);
    principal.appendChild(actions);
  }

  function renderSelecaoPrograma() {
    principal.innerHTML = '';

    const cabecalho = document.createElement('header');
    cabecalho.dataset.stage = 'programa';
    cabecalho.innerHTML = `
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Sessao Aberta</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Selecionar Programa da Camera</h2>
      <p class="text-sm text-on-surface-variant font-light mt-2">A sessao ${sessaoAberta.id} ja existe. Confirme um programa para entrar no detalhe da carga ou cancele a sessao agora.</p>
    `;

    const busca = Input({ label: 'Buscar programa', id: 'sessao-busca-programa' });
    const lista = document.createElement('div');
    lista.className = 'space-y-3';

    const resumo = document.createElement('div');
    resumo.className = 'rounded-2xl bg-surface-container-low p-5 text-sm text-on-surface grid grid-cols-2 gap-4';
    resumo.innerHTML = `
      <div><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Embarque</p><p>${form.numero_embarque}</p></div>
      <div><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Camera</p><p>${sessaoAberta.camera_id}</p></div>
      <div><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">OP</p><p>${form.codigo_op}</p></div>
      <div><p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Operador</p><p>${form.codigo_operador}</p></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'flex flex-wrap gap-3 pt-2';
    const cancelar = Button({
      texto: 'Cancelar Sessao',
      variante: 'secondary',
      onClick: async () => {
        try {
          await ctx.sessoesSvc.reiniciarSessao(sessaoAberta.id);
          toast.info('Sessao cancelada.');
          window.location.hash = destinoCarga(form.numero_embarque);
        } catch (e) {
          toast.erro(e.message);
        }
      },
    });
    cancelar.dataset.cancelarSessao = 'true';
    actions.appendChild(cancelar);

    principal.appendChild(cabecalho);
    principal.appendChild(resumo);
    principal.appendChild(busca);
    principal.appendChild(lista);
    principal.appendChild(actions);

    async function carregarProgramas(q = '') {
      lista.innerHTML = '<p class="text-sm text-on-surface-variant">Carregando programas da camera...</p>';
      try {
        const programas = await ctx.catalogos.programas(sessaoAberta.camera_id, q);
        lista.innerHTML = '';
        if (programas.length === 0) {
          const vazio = document.createElement('div');
          vazio.dataset.programasVazio = 'true';
          vazio.className = 'rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low px-5 py-6 space-y-3';
          vazio.innerHTML = `
            <p class="text-sm font-semibold text-on-surface">Nenhum programa disponivel nesta camera.</p>
            <p class="text-xs text-on-surface-variant">Se voce acabou de trocar o IP no .env, reinicie o backend para recarregar a configuracao da camera.</p>
          `;
          lista.appendChild(vazio);
          return;
        }
        for (const programa of programas) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.programaNumero = String(programa.numero);
          btn.className = 'w-full text-left px-5 py-4 rounded-2xl bg-surface-container-high hover:bg-secondary-container/30 transition-colors';
          btn.innerHTML = `
            <p class="text-sm font-semibold text-on-surface">${String(programa.numero).padStart(3, '0')} · ${programa.nome}</p>
            <p class="text-xs text-on-surface-variant mt-1">Confirma o programa e leva o operador para o workspace da carga.</p>
          `;
          btn.addEventListener('click', async () => {
            try {
              await ctx.sessoesSvc.confirmar(sessaoAberta.id, {
                programaNumero: programa.numero,
                programaNome: programa.nome,
              });
              window.location.hash = destinoCarga(form.numero_embarque);
            } catch (e) {
              toast.erro(e.message);
            }
          });
          lista.appendChild(btn);
        }
      } catch (e) {
        lista.innerHTML = '';
        const erro = document.createElement('div');
        erro.dataset.programasErro = 'true';
        erro.className = 'rounded-2xl border border-error/20 bg-error/5 px-5 py-6 space-y-4';
        erro.innerHTML = `
          <div class="space-y-1">
            <p class="text-sm font-semibold text-on-surface">Falha ao carregar programas da camera.</p>
            <p class="text-xs text-on-surface-variant">${e.message}</p>
          </div>
        `;
        const recarregar = Button({
          texto: 'Tentar Novamente',
          variante: 'secondary',
          onClick: () => carregarProgramas(busca.querySelector('input').value),
        });
        erro.appendChild(recarregar);
        lista.appendChild(erro);
      }
    }

    busca.querySelector('input').addEventListener('input', (event) => carregarProgramas(event.target.value));
    carregarProgramas('');
  }

  renderFormulario();
  renderItemIdentificado();
  if (numeroEmbarque) {
    await carregarOp(form.codigo_op);
  }
  return el;
}
