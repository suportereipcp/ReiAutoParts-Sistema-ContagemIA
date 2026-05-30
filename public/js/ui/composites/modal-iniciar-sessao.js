import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';

const INPUT_CLASS = 'w-full rounded-2xl border-2 border-transparent bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20';
const INPUT_ERRO_CLASS = 'w-full rounded-2xl border-2 border-error bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-error/20';
const SELECT_CLASS = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20';
const LABEL_CLASS = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline';
const ERRO_MSG_CLASS = 'mt-1 text-xs font-bold text-error hidden';

function criarCampoTexto(label, dataInput, { placeholder = '' } = {}) {
  const campo = document.createElement('div');
  campo.className = 'block';

  const span = document.createElement('span');
  span.className = LABEL_CLASS;
  span.textContent = label;
  campo.appendChild(span);

  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.input = dataInput;
  input.className = INPUT_CLASS;
  input.placeholder = placeholder;
  campo.appendChild(input);

  const erroMsg = document.createElement('p');
  erroMsg.dataset.erroInput = dataInput;
  erroMsg.className = ERRO_MSG_CLASS;
  campo.appendChild(erroMsg);

  return { campo, input, erroMsg };
}

function criarCampoSelect(label, dataInput, opcoes, { placeholder = 'Selecione...' } = {}) {
  const campo = document.createElement('label');
  campo.className = 'block';

  const span = document.createElement('span');
  span.className = LABEL_CLASS;
  span.textContent = label;
  campo.appendChild(span);

  const select = document.createElement('select');
  select.dataset.input = dataInput;
  select.className = SELECT_CLASS;

  const ph = document.createElement('option');
  ph.value = '';
  ph.selected = true;
  ph.disabled = true;
  ph.textContent = placeholder;
  select.appendChild(ph);

  for (const opt of opcoes) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    select.appendChild(option);
  }

  campo.appendChild(select);
  return { campo, select };
}

export function abrirModalIniciarSessao({ numeroEmbarque, embarques = [], api, camerasLivres = [], camerasConfig = [], onConfirmar } = {}) {
  const subtitle = numeroEmbarque
    ? `Embarque ${numeroEmbarque}`
    : 'Selecione o embarque e preencha os dados para iniciar.';

  const modal = Modal({
    title: 'Iniciar Contagem',
    subtitle,
  });
  modal.abrir();

  const corpo = modal.corpo();
  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  // Embarque field (only when not provided)
  let selectEmbarque = null;
  if (!numeroEmbarque) {
    const { campo, select } = criarCampoSelect('Embarque', 'embarque', embarques.map(e => ({ value: e.numero_embarque, text: e.numero_embarque })), { placeholder: 'Selecione o embarque...' });
    selectEmbarque = select;
    stage.appendChild(campo);
  }

  // OP field — input com validação on blur/tab
  let opValida = false;
  const { campo: campoOp, input: inputOp, erroMsg: erroOp } = criarCampoTexto('Ordem de Producao', 'codigo_op', { placeholder: 'Digite o codigo da O.P.' });

  async function validarOp() {
    const codigo = inputOp.value.trim();
    if (!codigo) { opValida = false; return; }
    try {
      await api.get(`/ops/${encodeURIComponent(codigo)}`);
      opValida = true;
      inputOp.className = INPUT_CLASS;
      erroOp.classList.add('hidden');
    } catch {
      opValida = false;
      inputOp.className = INPUT_ERRO_CLASS;
      erroOp.textContent = 'O.P. NAO ENCONTRADA POR FAVOR TENTE NOVAMENTE.';
      erroOp.classList.remove('hidden');
    }
  }

  inputOp.addEventListener('blur', validarOp);
  stage.appendChild(campoOp);

  // Operador field — input com validação on blur/tab
  let operadorValido = false;
  const { campo: campoOper, input: inputOper, erroMsg: erroOper } = criarCampoTexto('Operador', 'codigo_operador', { placeholder: 'Digite o codigo do operador' });

  async function validarOperador() {
    const codigo = inputOper.value.trim();
    if (!codigo) { operadorValido = false; return; }
    try {
      await api.get(`/operadores/${encodeURIComponent(codigo)}`);
      operadorValido = true;
      inputOper.className = INPUT_CLASS;
      erroOper.classList.add('hidden');
    } catch {
      operadorValido = false;
      inputOper.className = INPUT_ERRO_CLASS;
      erroOper.textContent = 'OPERADOR NAO ENCONTRADO POR FAVOR TENTE NOVAMENTE.';
      erroOper.classList.remove('hidden');
    }
  }

  inputOper.addEventListener('blur', validarOperador);
  stage.appendChild(campoOper);

  // Camera field — botões ordenados por slot (da config)
  const livresSet = new Set(camerasLivres.map(c => Number(c.id)));
  const slotsBotoes = camerasConfig.length > 0
    ? camerasConfig.map(cfg => ({ slot: cfg.slot, camera_id: cfg.camera_id, label: cfg.label || '', livre: livresSet.has(cfg.camera_id) }))
    : camerasLivres.map(c => ({ slot: c.id, camera_id: c.id, label: '', livre: true }));

  let cameraSelecionada = '';
  const livresSlots = slotsBotoes.filter(s => s.livre);
  if (livresSlots.length === 1) cameraSelecionada = String(livresSlots[0].camera_id);

  const campoCamera = document.createElement('div');
  campoCamera.className = 'block';
  const cameraLabel = document.createElement('span');
  cameraLabel.className = LABEL_CLASS;
  cameraLabel.textContent = 'Camera';
  campoCamera.appendChild(cameraLabel);

  const cameraBtns = document.createElement('div');
  cameraBtns.className = 'flex items-center gap-3 mt-2';

  const BTN_ATIVO = 'flex-1 rounded-2xl px-4 py-4 text-sm font-semibold transition bg-primary text-on-primary shadow-md';
  const BTN_INATIVO = 'flex-1 rounded-2xl px-4 py-4 text-sm font-semibold transition bg-surface-container-high text-on-surface hover:bg-surface-container';
  const BTN_DESABILITADO = 'flex-1 rounded-2xl px-4 py-4 text-sm font-semibold bg-surface-container-high text-outline/40 cursor-not-allowed opacity-50';

  for (const slotInfo of slotsBotoes) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.cameraBtn = String(slotInfo.camera_id);
    if (slotInfo.label) btn.title = slotInfo.label;

    if (!slotInfo.livre) {
      btn.className = BTN_DESABILITADO;
      btn.disabled = true;
    } else {
      btn.className = cameraSelecionada === String(slotInfo.camera_id) ? BTN_ATIVO : BTN_INATIVO;
      btn.addEventListener('click', () => {
        cameraSelecionada = String(slotInfo.camera_id);
        for (const b of cameraBtns.querySelectorAll('[data-camera-btn]')) {
          if (b.disabled) continue;
          b.className = b.dataset.cameraBtn === cameraSelecionada ? BTN_ATIVO : BTN_INATIVO;
        }
      });
    }

    btn.textContent = String(slotInfo.slot);
    cameraBtns.appendChild(btn);
  }
  campoCamera.appendChild(cameraBtns);
  stage.appendChild(campoCamera);

  // Inline error
  const erro = document.createElement('p');
  erro.dataset.erroModal = '';
  erro.className = 'hidden text-sm text-error font-medium';
  stage.appendChild(erro);

  // Actions
  const acoes = document.createElement('div');
  acoes.className = 'flex items-center justify-end gap-3';

  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });

  const confirmar = Button({
    texto: 'Iniciar',
    variante: 'primary',
    icone: 'play_arrow',
    onClick: async () => {
      erro.classList.add('hidden');

      const embarque = numeroEmbarque || selectEmbarque?.value;
      const codigoOp = inputOp.value.trim();
      const codigoOperador = inputOper.value.trim();
      const cameraId = cameraSelecionada;

      if (!embarque) { erro.textContent = 'Selecione um embarque.'; erro.classList.remove('hidden'); return; }
      if (!codigoOp) { erro.textContent = 'Informe a Ordem de Producao.'; erro.classList.remove('hidden'); return; }
      if (!opValida) { await validarOp(); if (!opValida) return; }
      if (!codigoOperador) { erro.textContent = 'Informe o codigo do operador.'; erro.classList.remove('hidden'); return; }
      if (!operadorValido) { await validarOperador(); if (!operadorValido) return; }
      if (!cameraId) { erro.textContent = 'Selecione uma camera.'; erro.classList.remove('hidden'); return; }

      confirmar.disabled = true;
      try {
        await onConfirmar({ numero_embarque: embarque, codigo_op: codigoOp, codigo_operador: codigoOperador, camera_id: cameraId });
        modal.fechar();
      } catch (err) {
        erro.textContent = err.message || 'Erro ao iniciar contagem.';
        erro.classList.remove('hidden');
      } finally {
        confirmar.disabled = false;
      }
    },
  });

  acoes.appendChild(cancelar);
  acoes.appendChild(confirmar);
  stage.appendChild(acoes);

  corpo.appendChild(stage);
  return modal;
}
