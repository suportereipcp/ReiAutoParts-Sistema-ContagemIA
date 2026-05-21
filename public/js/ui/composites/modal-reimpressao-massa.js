import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalReimpressaoMassa({ embarque, preview = {}, faturamentoSvc, onConcluido } = {}) {
  const modal = Modal({
    title: 'Reimpressão em Massa',
    subtitle: 'Confirme o código do operador para autorizar a reimpressão de todas as etiquetas finais elegíveis deste embarque.',
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const containerInfo = document.createElement('div');
  containerInfo.className = 'bg-primary-container/20 border border-primary/10 rounded-xl p-4 flex flex-col gap-2';
  containerInfo.innerHTML = `
    <div class="flex justify-between items-center text-sm">
      <span class="font-medium text-on-surface">Caixas Elegíveis:</span>
      <span class="px-3 py-1 bg-primary/10 text-primary rounded-lg font-mono font-bold text-base" data-display="caixas">${preview.caixas ?? 0}</span>
    </div>
    <div class="flex justify-between items-center text-sm">
      <span class="font-medium text-on-surface">Total de Etiquetas:</span>
      <span class="px-3 py-1 bg-primary/10 text-primary rounded-lg font-mono font-bold text-base" data-display="etiquetas">${preview.etiquetas ?? 0}</span>
    </div>
  `;
  stage.appendChild(containerInfo);

  const inp = Input({
    label: 'Código do Operador',
    id: 'mmCodigoOp',
    placeholder: 'Digite ou passe o crachá...',
    required: true,
  });
  const inputEl = inp.querySelector('input');
  if (inputEl) {
    inputEl.setAttribute('data-input', 'codigo-operador');
    inputEl.className = 'w-full bg-surface-container-high border border-outline/20 rounded-xl px-4 py-4 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-surface-container-lowest transition-all duration-300 text-lg font-mono tracking-wider';
  }
  inp.className = 'space-y-2';
  stage.appendChild(inp);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4 justify-end';

  const confirmar = Button({
    texto: 'Confirmar Reimpressão',
    variante: 'primary',
    onClick: async () => {
      const codigo = inputEl ? inputEl.value.trim() : '';
      if (!codigo) {
        toast.erro('Informe o código do operador.');
        if (inputEl) inputEl.focus();
        return;
      }

      confirmar.disabled = true;
      if (inputEl) {
        inputEl.disabled = true;
      }
      cancelar.disabled = true;

      try {
        await faturamentoSvc.reimpressaoMassa(embarque, codigo);
        toast.sucesso('Reimpressão em massa solicitada com sucesso!');
        modal.fechar();
        if (onConcluido) onConcluido();
      } catch (error) {
        toast.erro(error.message || 'Erro ao processar reimpressão em massa.');
        confirmar.disabled = false;
        if (inputEl) {
          inputEl.disabled = false;
        }
        cancelar.disabled = false;
      }
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
  if (inputEl) {
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
  }

  return modal;
}
