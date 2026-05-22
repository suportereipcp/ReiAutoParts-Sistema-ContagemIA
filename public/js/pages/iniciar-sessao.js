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

  const SHELL_COM_RESUMO = 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start';
  const SHELL_SEM_RESUMO = 'grid grid-cols-1 gap-6 items-start';
  const shell = document.createElement('section');
  shell.className = SHELL_COM_RESUMO;
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

  function esconderResumoSessao() {
    lateral.replaceChildren();
    lateral.classList.add('hidden');
    shell.className = SHELL_SEM_RESUMO;
  }

  // Foto do operador — origem futura: Supabase Storage.
  // Contrato: NUNCA lançar e NUNCA bloquear. Retorna a URL pública da foto, ou
  // null quando não há fonte. Se um dia precisar de signed URL, faça com
  // try/catch retornando null em qualquer falha (a foto é best-effort).
  function resolverUrlFotoOperador(_codigoOperador) {
    // TODO: integrar com Supabase Storage (bucket de fotos de operadores).
    return null;
  }

  // Aplica a foto do operador de forma best-effort: se o Supabase estiver
  // indisponível (offline/erro), a imagem simplesmente não carrega e o
  // placeholder permanece — a operação de contagem nunca é impedida por isso.
  function aplicarFotoOperador(container, codigoOperador) {
    try {
      // Sem conexão com o Supabase -> nem tenta carregar (edge-first).
      if (ctx.sync?.atual?.()?.estado === 'OFFLINE') return;

      let url = null;
      try { url = resolverUrlFotoOperador(codigoOperador); } catch { url = null; }
      if (!url) return;

      const img = document.createElement('img');
      img.className = 'h-full w-full object-cover';
      img.alt = '';
      img.addEventListener('load', () => { container.replaceChildren(img); });
      img.addEventListener('error', () => { /* mantém placeholder, sem quebrar a operação */ });
      img.src = url;
    } catch {
      /* best-effort: qualquer falha aqui jamais impede a contagem */
    }
  }

  function montarCampoResumo(rotulo, valor) {
    const wrap = document.createElement('div');
    const r = document.createElement('p');
    r.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-0.5';
    r.textContent = rotulo;
    const v = document.createElement('p');
    v.className = 'text-base font-bold text-on-surface break-words';
    const txt = valor == null ? '' : String(valor);
    v.textContent = txt === '' ? '—' : txt;
    wrap.appendChild(r);
    wrap.appendChild(v);
    return wrap;
  }

  function renderResumoSessao(programa, onConfirmar) {
    lateral.replaceChildren();

    const label = document.createElement('p');
    label.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline';
    label.textContent = 'Resumo da sessão';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'relative aspect-square w-full rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center';
    const ph = document.createElement('span');
    ph.className = 'material-symbols-outlined text-5xl text-primary/50';
    ph.textContent = 'precision_manufacturing';
    imgWrap.appendChild(ph);
    const img = document.createElement('img');
    img.className = 'absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200';
    img.alt = '';
    img.src = `/programas-imagens/camera-${encodeURIComponent(String(sessaoAberta.camera_id))}/${encodeURIComponent(programa.nome)}.bmp`;
    img.addEventListener('load', () => { img.style.opacity = '1'; });
    img.addEventListener('error', () => { img.remove(); });
    imgWrap.appendChild(img);

    const nomePrograma = document.createElement('p');
    nomePrograma.className = 'text-sm font-semibold text-on-surface text-center';
    nomePrograma.textContent = `${String(programa.numero).padStart(3, '0')} · ${programa.nome}`;

    const campos = document.createElement('div');
    campos.className = 'space-y-3';
    campos.appendChild(montarCampoResumo('Item', opAtual?.item_codigo));
    campos.appendChild(montarCampoResumo('Ordem de produção', form.codigo_op));
    campos.appendChild(montarCampoResumo('Embarque', form.numero_embarque));
    campos.appendChild(montarCampoResumo('Câmera', sessaoAberta.camera_id));

    const operRow = document.createElement('div');
    operRow.className = 'flex items-end justify-between gap-3';
    operRow.appendChild(montarCampoResumo('Operador', form.codigo_operador));
    // TODO: imagem do operador via Supabase Storage — placeholder reservado por enquanto
    const operFoto = document.createElement('div');
    operFoto.dataset.operadorFotoPlaceholder = 'true';
    operFoto.className = 'shrink-0 h-16 w-16 rounded-lg overflow-hidden border border-dashed border-outline-variant/50 bg-surface-container-low flex flex-col items-center justify-center text-center gap-0.5';
    const operIcon = document.createElement('span');
    operIcon.className = 'material-symbols-outlined text-xl text-outline';
    operIcon.textContent = 'account_circle';
    const operTxt = document.createElement('span');
    operTxt.className = 'text-[8px] font-semibold uppercase tracking-wide text-outline leading-none';
    operTxt.textContent = 'Em breve';
    operFoto.appendChild(operIcon);
    operFoto.appendChild(operTxt);
    operRow.appendChild(operFoto);
    aplicarFotoOperador(operFoto, form.codigo_operador);

    const confirmar = Button({ texto: 'Confirmar e iniciar contagem', variante: 'primary', onClick: onConfirmar, className: 'w-full' });
    confirmar.dataset.confirmarPrograma = 'true';

    lateral.appendChild(label);
    lateral.appendChild(imgWrap);
    lateral.appendChild(nomePrograma);
    lateral.appendChild(campos);
    lateral.appendChild(operRow);
    lateral.appendChild(confirmar);

    lateral.classList.remove('hidden');
    shell.className = SHELL_COM_RESUMO;
  }

  async function carregarOp(codigo) {
    const normalizado = String(codigo ?? '').trim();
    if (!normalizado) {
      opAtual = null;
      return;
    }
    try {
      opAtual = await ctx.catalogos.op(normalizado);
    } catch {
      opAtual = {
        codigo_op: normalizado,
        item_codigo: '',
        item_descricao: 'OP nao encontrada no catalogo local',
        quantidade_prevista: '-',
      };
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

    const listaHeader = document.createElement('div');
    listaHeader.className = 'flex items-center justify-between px-1 pt-2';
    const listaHeaderTitulo = document.createElement('p');
    listaHeaderTitulo.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline';
    listaHeaderTitulo.textContent = 'Programas da câmera';
    const contador = document.createElement('span');
    contador.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant tabular-nums';
    listaHeader.appendChild(listaHeaderTitulo);
    listaHeader.appendChild(contador);

    const lista = document.createElement('div');
    lista.className = 'space-y-2.5 py-1';

    const listaWrap = document.createElement('div');
    listaWrap.className = 'zen-scroll overflow-y-auto pr-2 -mr-1';
    listaWrap.style.maxHeight = 'min(26rem, 50vh)';
    listaWrap.appendChild(lista);

    const topFade = document.createElement('div');
    topFade.className = 'pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface-container-lowest to-transparent opacity-0 transition-opacity duration-200';
    const bottomFade = document.createElement('div');
    bottomFade.className = 'pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent opacity-0 transition-opacity duration-200';

    const listaShell = document.createElement('div');
    listaShell.className = 'relative';
    listaShell.appendChild(topFade);
    listaShell.appendChild(listaWrap);
    listaShell.appendChild(bottomFade);

    function atualizarFades() {
      const { scrollTop, scrollHeight, clientHeight } = listaWrap;
      const temOverflow = scrollHeight - clientHeight > 4;
      topFade.style.opacity = scrollTop > 4 ? '1' : '0';
      bottomFade.style.opacity = temOverflow && scrollTop + clientHeight < scrollHeight - 4 ? '1' : '0';
    }
    listaWrap.addEventListener('scroll', atualizarFades, { passive: true });

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
    principal.appendChild(busca);
    principal.appendChild(listaHeader);
    principal.appendChild(listaShell);
    principal.appendChild(actions);

    esconderResumoSessao();

    let programaSelecionado = null;
    let btnSelecionado = null;
    const REALCE = ['ring-2', 'ring-primary/40', 'bg-surface-container-lowest'];

    async function confirmarSelecionado() {
      if (!programaSelecionado) return;
      try {
        await ctx.sessoesSvc.confirmar(sessaoAberta.id, {
          programaNumero: programaSelecionado.numero,
          programaNome: programaSelecionado.nome,
        });
        window.location.hash = destinoCarga(form.numero_embarque);
      } catch (e) {
        toast.erro(e.message);
      }
    }

    function selecionarPrograma(programa, btn) {
      programaSelecionado = programa;
      if (btnSelecionado && btnSelecionado !== btn) btnSelecionado.classList.remove(...REALCE);
      btnSelecionado = btn;
      btn.classList.add(...REALCE);
      renderResumoSessao(programa, confirmarSelecionado);
    }

    async function carregarProgramas(q = '') {
      lista.replaceChildren();
      contador.textContent = '';
      const carregando = document.createElement('p');
      carregando.className = 'text-sm text-on-surface-variant px-1';
      carregando.textContent = 'Carregando programas da camera...';
      lista.appendChild(carregando);
      try {
        const programas = await ctx.catalogos.programas(sessaoAberta.camera_id, q);
        lista.replaceChildren();
        contador.textContent = `${programas.length} ${programas.length === 1 ? 'programa' : 'programas'}`;
        if (programas.length === 0) {
          const vazio = document.createElement('div');
          vazio.dataset.programasVazio = 'true';
          vazio.className = 'rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low px-5 py-6 space-y-2';
          const vazioTitulo = document.createElement('p');
          vazioTitulo.className = 'text-sm font-semibold text-on-surface';
          vazioTitulo.textContent = 'Nenhum programa disponivel nesta camera.';
          const vazioDica = document.createElement('p');
          vazioDica.className = 'text-xs text-on-surface-variant';
          vazioDica.textContent = 'Se voce acabou de trocar o IP no .env, reinicie o backend para recarregar a configuracao da camera.';
          vazio.appendChild(vazioTitulo);
          vazio.appendChild(vazioDica);
          lista.appendChild(vazio);
          atualizarFades();
          return;
        }
        for (const programa of programas) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.programaNumero = String(programa.numero);
          btn.className = 'group w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-xl bg-surface-container-low/70 border border-transparent hover:border-outline-variant/40 hover:bg-surface-container-lowest transition-all duration-200';

          const numStr = String(programa.numero).padStart(3, '0');
          const badge = document.createElement('span');
          badge.className = 'relative shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-primary-container flex items-center justify-center';
          const badgeNum = document.createElement('span');
          badgeNum.className = 'text-primary text-sm font-headline font-bold tabular-nums';
          badgeNum.textContent = numStr;
          badge.appendChild(badgeNum);

          const img = document.createElement('img');
          img.className = 'absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200';
          img.alt = '';
          img.loading = 'lazy';
          img.src = `/programas-imagens/camera-${encodeURIComponent(String(sessaoAberta.camera_id))}/${encodeURIComponent(programa.nome)}.bmp`;
          img.addEventListener('load', () => {
            img.style.opacity = '1';
            const tag = document.createElement('span');
            tag.className = 'absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] font-bold text-center tabular-nums leading-tight py-0.5';
            tag.textContent = numStr;
            badge.appendChild(tag);
          });
          img.addEventListener('error', () => { img.remove(); });
          badge.appendChild(img);

          const meio = document.createElement('span');
          meio.className = 'min-w-0 flex-1';
          const nome = document.createElement('span');
          nome.className = 'block text-sm font-semibold text-on-surface truncate';
          nome.textContent = programa.nome;
          const sub = document.createElement('span');
          sub.className = 'block text-xs text-on-surface-variant mt-0.5';
          sub.textContent = 'Confirma o programa e leva o operador para o workspace da carga.';
          meio.appendChild(nome);
          meio.appendChild(sub);

          const seta = document.createElement('span');
          seta.className = 'material-symbols-outlined text-outline-variant text-xl shrink-0 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200';
          seta.textContent = 'arrow_forward';

          btn.appendChild(badge);
          btn.appendChild(meio);
          btn.appendChild(seta);

          btn.addEventListener('click', () => selecionarPrograma(programa, btn));
          lista.appendChild(btn);
        }
        listaWrap.scrollTop = 0;
        atualizarFades();
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
  esconderResumoSessao();
  if (numeroEmbarque) {
    await carregarOp(form.codigo_op);
  }
  return el;
}
