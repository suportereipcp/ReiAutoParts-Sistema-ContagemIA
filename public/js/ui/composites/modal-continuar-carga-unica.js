import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirContinuarCargaUnica({ sessao, onContinuar }) {
  const modal = Modal({ title: 'Continuar Carga', subtitle: 'Existe uma contagem em andamento no sistema.' });
  modal.abrir();
  const body = modal.corpo();

  const wrapper = document.createElement('div');
  wrapper.dataset.stage = 'continuar-unica';
  wrapper.className = 'flex gap-6';

  const accent = document.createElement('div');
  accent.dataset.accent = 'true';
  accent.className = 'w-1 rounded-full bg-primary/20';
  wrapper.appendChild(accent);

  const formCol = document.createElement('div');
  formCol.className = 'flex-1 space-y-6';

  const ordem = Input({ label: 'Ordem de Produção', id: 'cc-op', value: sessao?.codigo_op ?? '' });
  const inputOrdem = ordem.querySelector('input');
  inputOrdem.dataset.input = 'codigo_op';
  inputOrdem.readOnly = true;
  inputOrdem.classList.add('opacity-80', 'cursor-not-allowed');

  const operador = Input({ label: 'Código do Operador', id: 'cc-oper', value: sessao?.codigo_operador ?? '' });
  operador.querySelector('input').dataset.input = 'codigo_operador';
  operador.querySelector('input').type = 'password';

  const itemCard = document.createElement('section');
  itemCard.dataset.itemIdentificado = 'true';
  itemCard.className = 'p-5 bg-surface-container-high rounded-xl flex items-center gap-4';
  itemCard.innerHTML = `
    <div class="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center">
      <span class="material-symbols-outlined text-3xl text-on-surface-variant">settings_input_component</span>
    </div>
    <div class="flex-1">
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Item Identificado</p>
      <p class="text-base font-semibold text-on-surface">${sessao?.programa_nome ?? 'Programa não confirmado'}</p>
      <p class="text-xs text-on-surface-variant">Câmera ${sessao?.camera_id ?? '-'} · ${sessao?.numero_embarque ?? '-'}</p>
    </div>
  `;

  formCol.appendChild(ordem);
  formCol.appendChild(operador);
  formCol.appendChild(itemCard);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4';
  const continuar = Button({ texto: 'Continuar', variante: 'primary', onClick: () => {
    const codigoOperador = operador.querySelector('input').value.trim();
    if (!codigoOperador) { toast.erro('Informe o código do operador.'); return; }
    modal.fechar();
    if (onContinuar) onContinuar({ sessao, codigoOperador });
    else window.location.hash = `#/cargas/${encodeURIComponent(sessao?.numero_embarque ?? '')}`;
  } });
  continuar.dataset.submitContinuar = 'true';
  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });
  actions.appendChild(continuar);
  actions.appendChild(cancelar);
  formCol.appendChild(actions);

  wrapper.appendChild(formCol);
  body.appendChild(wrapper);
  return modal;
}
