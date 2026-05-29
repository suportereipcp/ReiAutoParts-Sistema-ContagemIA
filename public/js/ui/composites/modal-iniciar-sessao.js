import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';

const SELECT_CLASS = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20';
const LABEL_CLASS = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline';

function criarCampo(label, dataInput, opcoes, { placeholder = 'Selecione...', preSelect = false } = {}) {
  const campo = document.createElement('label');
  campo.className = 'block';

  const span = document.createElement('span');
  span.className = LABEL_CLASS;
  span.textContent = label;
  campo.appendChild(span);

  const select = document.createElement('select');
  select.dataset.input = dataInput;
  select.className = SELECT_CLASS;

  if (!preSelect) {
    const ph = document.createElement('option');
    ph.value = '';
    ph.selected = true;
    ph.disabled = true;
    ph.textContent = placeholder;
    select.appendChild(ph);
  }

  for (const opt of opcoes) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (preSelect && opcoes.length === 1) option.selected = true;
    select.appendChild(option);
  }

  campo.appendChild(select);
  return { campo, select };
}

export function abrirModalIniciarSessao({ numeroEmbarque, embarques = [], ops = [], operadores = [], camerasLivres = [], onConfirmar } = {}) {
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
    const { campo, select } = criarCampo('Embarque', 'embarque', embarques.map(e => ({ value: e.numero_embarque, text: e.numero_embarque })), { placeholder: 'Selecione o embarque...' });
    selectEmbarque = select;
    stage.appendChild(campo);
  }

  // OP field
  const { campo: campoOp, select: selectOp } = criarCampo('Ordem de Producao', 'codigo_op', ops.map(op => ({ value: op.codigo_op, text: `${op.codigo_op} — ${op.item_descricao || op.item_codigo}` })), { placeholder: 'Selecione a OP...' });
  stage.appendChild(campoOp);

  // Operador field
  const { campo: campoOperador, select: selectOperador } = criarCampo('Operador', 'codigo_operador', operadores.map(o => ({ value: o.codigo, text: `${o.codigo} — ${o.nome}` })), { placeholder: 'Selecione o operador...' });
  stage.appendChild(campoOperador);

  // Camera field
  const preSelectCamera = camerasLivres.length === 1;
  const { campo: campoCamera, select: selectCamera } = criarCampo('Camera', 'camera_id', camerasLivres.map(c => ({ value: c.id, text: `Camera ${c.id}` })), { placeholder: 'Selecione a camera...', preSelect: preSelectCamera });
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
      const codigoOp = selectOp.value;
      const codigoOperador = selectOperador.value;
      const cameraId = selectCamera.value;

      if (!embarque) { erro.textContent = 'Selecione um embarque.'; erro.classList.remove('hidden'); return; }
      if (!codigoOp) { erro.textContent = 'Selecione uma Ordem de Producao.'; erro.classList.remove('hidden'); return; }
      if (!codigoOperador) { erro.textContent = 'Selecione um operador.'; erro.classList.remove('hidden'); return; }
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
