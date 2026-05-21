import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalAprovarSessao({ sessao, acao, faturamentoSvc, onConcluido } = {}) {
  const isAprovar = acao === 'aprovar';
  const title = isAprovar ? 'Aprovar Sessão' : 'Reprovar Sessão';
  const subtitle = 'Autorize a alteração de status da contagem para fins de faturamento.';

  const modal = Modal({
    title,
    subtitle,
  });
  modal.abrir();

  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  // Info Box
  const infoBox = document.createElement('div');
  infoBox.className = 'rounded-xl bg-surface-container-high p-4 text-sm text-on-surface space-y-1';
  infoBox.innerHTML = `
    <div><span class="font-bold text-outline">Caixa:</span> ${sessao?.numero_caixa ?? ''}</div>
    <div><span class="font-bold text-outline">Item:</span> ${sessao?.item_codigo ?? sessao?.codigo_op ?? ''}</div>
  `;
  stage.appendChild(infoBox);

  // Input
  const inputWrap = Input({
    label: 'Código do Aprovador',
    id: 'maCodigoAprov',
    placeholder: 'Digite o código do aprovador...',
    required: true,
  });
  const inputEl = inputWrap.querySelector('input');
  if (inputEl) {
    inputEl.dataset.input = 'codigo-aprovador';
  }
  stage.appendChild(inputWrap);

  // Actions Container
  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4';

  const confirmBtn = Button({
    texto: title,
    variante: isAprovar ? 'primary' : 'danger',
  });
  confirmBtn.dataset.btnConfirmar = 'true';

  const cancelBtn = Button({
    texto: 'Cancelar',
    variante: 'secondary',
    onClick: () => modal.fechar(),
  });
  cancelBtn.dataset.btnCancelar = 'true';

  actions.appendChild(confirmBtn);
  actions.appendChild(cancelBtn);
  stage.appendChild(actions);
  body.appendChild(stage);

  // Autofocus the input field
  if (inputEl) {
    setTimeout(() => {
      inputEl.focus();
    }, 0);
  }

  // Handle submit logic
  async function handleSubmit() {
    const codigo = inputEl?.value.trim();
    if (!codigo) {
      toast.erro('Código do aprovador é obrigatório.');
      return;
    }

    // Disable elements
    if (confirmBtn) confirmBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    if (inputEl) inputEl.disabled = true;

    try {
      if (isAprovar) {
        await faturamentoSvc.aprovarSessao(sessao.id, codigo);
      } else {
        await faturamentoSvc.reprovarSessao(sessao.id, codigo);
      }
      toast.sucesso(isAprovar ? 'Sessão aprovada com sucesso.' : 'Sessão reprovada com sucesso.');
      modal.fechar();
      if (onConcluido) onConcluido();
    } catch (err) {
      toast.erro(err.message || (isAprovar ? 'Erro ao aprovar sessão.' : 'Erro ao reprovar sessão.'));
      // Re-enable elements
      if (confirmBtn) confirmBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      if (inputEl) inputEl.disabled = false;
    }
  }

  confirmBtn.addEventListener('click', handleSubmit);

  // Submit on Enter key
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });
  }

  return modal;
}
