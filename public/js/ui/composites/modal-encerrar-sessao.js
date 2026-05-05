import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalEncerrarSessao({ sessao, caixasExistentes = [], onConfirmar } = {}) {
  const modal = Modal({
    title: 'Encerrar Sessão',
    subtitle: `Defina a caixa de destino da sessão ${sessao?.programa_nome ?? ''}.`,
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const modos = document.createElement('div');
  modos.className = 'grid gap-3';
  const modoPadrao = caixasExistentes.length > 0 ? 'existente' : 'nova';
  modos.innerHTML = `
    <label class="flex items-center gap-3 text-sm text-on-surface"><input data-input="modo-caixa" type="radio" name="modo-caixa" value="existente" ${modoPadrao === 'existente' ? 'checked' : ''}/> Caixa existente</label>
    <label class="flex items-center gap-3 text-sm text-on-surface"><input data-input="modo-caixa" type="radio" name="modo-caixa" value="nova" ${modoPadrao === 'nova' ? 'checked' : ''}/> Nova caixa numerada</label>
    <label class="flex items-center gap-3 text-sm text-on-surface"><input data-input="modo-caixa" type="radio" name="modo-caixa" value="sem-numero"/> Nova caixa sem número</label>
  `;

  const existenteWrap = document.createElement('div');
  existenteWrap.className = 'space-y-1';
  existenteWrap.dataset.bloco = 'existente';
  existenteWrap.innerHTML = '<label class="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium block">Caixa existente</label>';
  const select = document.createElement('select');
  select.dataset.input = 'caixa_id';
  select.className = 'w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = caixasExistentes.length > 0 ? 'Selecione uma caixa...' : 'Nenhuma caixa compatível disponível';
  select.appendChild(placeholder);
  for (const caixa of caixasExistentes) {
    const opt = document.createElement('option');
    opt.value = caixa.id;
    opt.textContent = caixa.label;
    select.appendChild(opt);
  }
  existenteWrap.appendChild(select);

  const novaWrap = document.createElement('div');
  novaWrap.dataset.bloco = 'nova';
  const novaInput = Input({ label: 'Número da Caixa', id: 'enc-caixa' });
  novaInput.querySelector('input').dataset.input = 'numero_caixa';
  novaWrap.appendChild(novaInput);

  const semNumeroHint = document.createElement('div');
  semNumeroHint.dataset.bloco = 'sem-numero';
  semNumeroHint.className = 'rounded-xl bg-surface-container-high px-4 py-4 text-sm text-on-surface-variant';
  semNumeroHint.textContent = 'O sistema criará um identificador interno invisível e exibirá a caixa como "Sem número #N".';

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4';
  const confirmar = Button({
    texto: 'Confirmar',
    variante: 'primary',
    onClick: () => {
      const modo = stage.querySelector('[data-input="modo-caixa"]:checked')?.value;
      if (modo === 'existente') {
        if (!select.value) { toast.erro('Selecione uma caixa existente.'); return; }
        modal.fechar();
        onConfirmar?.({ caixa_id: select.value });
        return;
      }
      if (modo === 'nova') {
        const numeroCaixa = stage.querySelector('[data-input="numero_caixa"]').value.trim();
        if (!numeroCaixa) { toast.erro('Informe o número da caixa.'); return; }
        modal.fechar();
        onConfirmar?.({ numero_caixa: numeroCaixa });
        return;
      }
      modal.fechar();
      onConfirmar?.({ criar_caixa_sem_numero: true });
    },
  });
  confirmar.dataset.submitEncerrar = 'true';
  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });
  actions.appendChild(confirmar);
  actions.appendChild(cancelar);

  stage.appendChild(modos);
  stage.appendChild(existenteWrap);
  stage.appendChild(novaWrap);
  stage.appendChild(semNumeroHint);
  stage.appendChild(actions);
  body.appendChild(stage);

  function atualizarModo() {
    const modo = stage.querySelector('[data-input="modo-caixa"]:checked')?.value;
    existenteWrap.style.display = modo === 'existente' ? '' : 'none';
    novaWrap.style.display = modo === 'nova' ? '' : 'none';
    semNumeroHint.style.display = modo === 'sem-numero' ? '' : 'none';
  }

  for (const input of stage.querySelectorAll('[data-input="modo-caixa"]')) input.addEventListener('change', atualizarModo);
  for (const input of stage.querySelectorAll('[data-input="modo-caixa"]')) {
    input.addEventListener('click', () => {
      for (const radio of stage.querySelectorAll('[data-input="modo-caixa"]')) radio.checked = false;
      input.checked = true;
      atualizarModo();
    });
  }
  atualizarModo();
  return modal;
}
