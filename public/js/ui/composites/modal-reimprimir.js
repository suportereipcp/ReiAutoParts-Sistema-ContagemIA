import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalReimprimir({ numeroCaixa, onConfirmar } = {}) {
  const modal = Modal({
    title: 'Reimprimir Etiqueta',
    subtitle: `Confirme o código do operador para autorizar a reimpressão da caixa.`,
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const containerInfo = document.createElement('div');
  containerInfo.className = 'bg-primary-container/20 border border-primary/10 rounded-xl p-4 flex items-center justify-between';
  containerInfo.innerHTML = `
    <span class="text-sm font-medium text-on-surface">Caixa para Reimpressão:</span>
    <span class="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-mono font-bold">${numeroCaixa || '-'}</span>
  `;
  stage.appendChild(containerInfo);

  const inp = Input({
    label: 'Código do Operador',
    id: 'reimp-operador',
    placeholder: 'Digite ou passe o crachá...',
    required: true,
  });
  const inputEl = inp.querySelector('input');
  
  inp.className = 'space-y-2';
  inputEl.className = 'w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-surface-container-lowest transition-all duration-300 text-lg font-mono tracking-wider';

  stage.appendChild(inp);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4 justify-end';

  const confirmar = Button({
    texto: 'Reimprimir',
    variante: 'primary',
    onClick: () => {
      const val = inputEl.value.trim();
      if (!val) {
        toast.erro('Informe o código do operador.');
        inputEl.focus();
        return;
      }
      modal.fechar();
      onConfirmar?.(val);
    },
  });

  const cancelar = Button({
    texto: 'Cancelar',
    variante: 'secondary',
    onClick: () => modal.fechar(),
  });

  actions.appendChild(cancelar);
  actions.appendChild(confirmar);
  stage.appendChild(actions);
  body.appendChild(stage);

  // Autofocus the input field
  setTimeout(() => {
    inputEl.focus();
  }, 100);

  // Submit on Enter
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmar.click();
    }
  });

  return modal;
}
