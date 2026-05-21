import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirModalRealocarSessao({ sessao, embarquesAbertos, faturamentoSvc, onConcluido }) {
  const wrapper = document.createElement('div');

  const selectWrap = document.createElement('div');
  selectWrap.className = 'space-y-1';
  const selectLabel = document.createElement('label');
  selectLabel.className = 'text-[10px] uppercase tracking-widest text-on-surface-variant font-medium block';
  selectLabel.textContent = 'Embarque destino';
  selectWrap.appendChild(selectLabel);

  const select = document.createElement('select');
  select.id = 'mrEmbarque';
  select.className = 'w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all duration-300';

  const optDefault = document.createElement('option');
  optDefault.value = '';
  optDefault.textContent = 'Selecione...';
  select.appendChild(optDefault);

  for (const e of embarquesAbertos) {
    const opt = document.createElement('option');
    opt.value = e.numero_embarque;
    opt.textContent = e.numero_embarque;
    select.appendChild(opt);
  }
  selectWrap.appendChild(select);

  const info = document.createElement('div');
  info.className = 'space-y-2 mb-4';
  info.innerHTML = `
    <p class="text-sm text-on-surface">Caixa: <strong>${sessao.numero_caixa}</strong></p>
    <p class="text-sm text-on-surface-variant">Item: <strong>${sessao.item_codigo ?? sessao.codigo_op}</strong></p>
  `;
  info.appendChild(selectWrap);

  wrapper.appendChild(info);

  let modal;
  const confirmar = Button({
    texto: 'Realocar',
    variante: 'primary',
    onClick: async () => {
      const dest = select.value;
      if (!dest) {
        toast.erro('Selecione o embarque destino.');
        return;
      }
      confirmar.disabled = true;
      try {
        await faturamentoSvc.realocarSessao(sessao.id, dest);
        toast.sucesso(`Sessão realocada para ${dest}.`);
        modal.fechar();
        onConcluido?.();
      } catch (err) {
        toast.erro(err.message || 'Erro ao realocar sessão.');
        confirmar.disabled = false;
      }
    },
  });

  modal = Modal({
    titulo: 'Realocar Sessão',
    conteudo: wrapper,
    botaoConfirmar: confirmar,
  });

  modal.abrir();
}
