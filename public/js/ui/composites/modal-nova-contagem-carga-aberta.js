import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalNovaContagemCargaAberta({ embarques = [], onConfirmar } = {}) {
  const modal = Modal({
    title: 'Nova Contagem',
    subtitle: 'Escolha em qual carga aberta a nova sessão será iniciada.',
  });
  modal.abrir();

  const corpo = modal.corpo();
  const stage = document.createElement('div');
  stage.dataset.stage = 'selecionar-carga-nova-contagem';
  stage.className = 'space-y-6';

  const campo = document.createElement('label');
  campo.className = 'block';
  campo.innerHTML = '<span class="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline">Carga Aberta</span>';

  const select = document.createElement('select');
  select.dataset.input = 'embarque-nova-contagem';
  select.className = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-4 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20';
  select.innerHTML = '<option value="" selected disabled>Selecione o embarque...</option>';
  for (const embarque of embarques) {
    const option = document.createElement('option');
    option.value = embarque.numero_embarque;
    option.textContent = embarque.numero_embarque;
    select.appendChild(option);
  }
  campo.appendChild(select);

  const acoes = document.createElement('div');
  acoes.className = 'flex items-center justify-end gap-3';
  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });
  const confirmar = Button({
    texto: 'Continuar',
    variante: 'primary',
    onClick: () => {
      const numeroEmbarque = select.value;
      if (!numeroEmbarque) {
        toast.erro('Selecione uma carga aberta.');
        return;
      }
      modal.fechar();
      onConfirmar?.(numeroEmbarque);
    },
  });
  confirmar.dataset.submitNovaContagem = 'true';
  acoes.appendChild(cancelar);
  acoes.appendChild(confirmar);

  stage.appendChild(campo);
  stage.appendChild(acoes);
  corpo.appendChild(stage);
  return modal;
}
