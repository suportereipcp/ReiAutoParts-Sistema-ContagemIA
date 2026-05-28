import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';
import { abrirModalSelecionarCaixa } from './modal-selecionar-caixa.js';
import { abrirModalPacklistCaixa } from './modal-packlist-caixa.js';
import { agruparCaixas } from '../../domain/caixas.js';

function montarAlertaFaturado() {
  const alertBox = document.createElement('div');
  alertBox.className = 'rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 space-y-3';

  const header = document.createElement('div');
  header.className = 'text-sm font-semibold flex items-center gap-2';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined text-amber-600';
  icon.textContent = 'warning';
  const msg = document.createElement('span');
  msg.textContent = 'Atencao: Este embarque ja foi faturado! O encerramento tardio pode gerar divergencias fiscais.';
  header.append(icon, msg);

  const label = document.createElement('label');
  label.className = 'flex items-center gap-3 text-sm font-medium cursor-pointer';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.input = 'confirmar-recusa';
  cb.className = 'w-4 h-4 rounded text-amber-600 border-amber-400 focus:ring-amber-500';
  const labelText = document.createElement('span');
  labelText.textContent = 'Estou ciente e desejo prosseguir com o encerramento tardio.';
  label.append(cb, labelText);

  alertBox.append(header, label);
  return { alertBox, checkbox: cb };
}

export function abrirModalEncerrarSessao({ sessao, sessoesDoEmbarque = [], embarqueFaturado = false, onConfirmar } = {}) {
  const estado = { faturadoConfirmado: false };

  function abrirModal1() {
    const modal = Modal({
      title: 'Encerrar Sessao',
      subtitle: `Defina a caixa de destino da sessao ${sessao?.programa_nome ?? ''}.`,
    });
    modal.abrir();
    const body = modal.corpo();

    const stage = document.createElement('div');
    stage.className = 'space-y-6';

    let checkboxFaturado = null;
    if (embarqueFaturado) {
      const { alertBox, checkbox } = montarAlertaFaturado();
      checkbox.checked = estado.faturadoConfirmado;
      checkbox.addEventListener('change', () => { estado.faturadoConfirmado = checkbox.checked; });
      checkboxFaturado = checkbox;
      stage.appendChild(alertBox);
    }

    function validarFaturado() {
      if (!embarqueFaturado) return true;
      if (!checkboxFaturado || !checkboxFaturado.checked) {
        toast.erro('Voce deve confirmar que esta ciente do encerramento tardio.');
        return false;
      }
      estado.faturadoConfirmado = true;
      return true;
    }

    const botoes = document.createElement('div');
    botoes.className = 'grid gap-3';

    const temCaixas = agruparCaixas(sessoesDoEmbarque).length > 0;
    if (temCaixas) {
      const btnExistente = Button({
        texto: 'Caixa ja existente',
        variante: 'primary',
        className: 'w-full justify-center py-4',
        onClick: () => {
          if (!validarFaturado()) return;
          modal.fechar();
          abrirModal2();
        },
      });
      btnExistente.dataset.acaoCaixaExistente = 'true';
      botoes.appendChild(btnExistente);
    }

    const btnNumerada = Button({
      texto: 'Nova caixa numerada',
      variante: 'secondary',
      className: 'w-full justify-center py-4 bg-surface-container-high',
      onClick: () => {
        if (!validarFaturado()) return;
        mostrarEstadoNovaNumerada();
      },
    });
    btnNumerada.dataset.acaoNovaNumerada = 'true';
    botoes.appendChild(btnNumerada);

    const btnSemNumero = Button({
      texto: 'Nova caixa sem numero',
      variante: 'secondary',
      className: 'w-full justify-center py-4 bg-surface-container-high',
      onClick: () => {
        if (!validarFaturado()) return;
        modal.fechar();
        onConfirmar?.({ criar_caixa_sem_numero: true });
      },
    });
    btnSemNumero.dataset.acaoSemNumero = 'true';
    botoes.appendChild(btnSemNumero);

    stage.appendChild(botoes);
    body.appendChild(stage);

    function mostrarEstadoNovaNumerada() {
      botoes.remove();
      const numWrap = document.createElement('div');
      numWrap.className = 'space-y-4';
      const inputWrap = Input({ label: 'Numero da Caixa', id: 'enc-caixa' });
      inputWrap.querySelector('input').dataset.input = 'numero_caixa';
      numWrap.appendChild(inputWrap);

      const acoes = document.createElement('div');
      acoes.className = 'flex gap-4';
      const btnConfirmar = Button({
        texto: 'Confirmar',
        variante: 'primary',
        onClick: () => {
          const num = numWrap.querySelector('[data-input="numero_caixa"]').value.trim();
          if (!num) { toast.erro('Informe o numero da caixa.'); return; }
          modal.fechar();
          onConfirmar?.({ numero_caixa: num });
        },
      });
      btnConfirmar.dataset.acaoConfirmarNumerada = 'true';
      const btnVoltar = Button({
        texto: 'Voltar',
        variante: 'secondary',
        onClick: () => {
          numWrap.remove();
          stage.appendChild(botoes);
        },
      });
      btnVoltar.dataset.acaoVoltarNumerada = 'true';
      acoes.append(btnConfirmar, btnVoltar);
      numWrap.appendChild(acoes);
      stage.appendChild(numWrap);
    }
  }

  function abrirModal2() {
    abrirModalSelecionarCaixa({
      sessoesDoEmbarque,
      opAtual: sessao?.codigo_op,
      onSelecionar: (caixaId) => {
        abrirModal3(caixaId);
      },
      onVoltar: () => {
        abrirModal1();
      },
    });
  }

  function abrirModal3(caixaId) {
    const sessoesDaCaixa = sessoesDoEmbarque.filter((s) => s.numero_caixa === caixaId && s.status !== 'cancelada');
    abrirModalPacklistCaixa({
      caixaId,
      sessoesDaCaixa,
      onConfirmar: () => {
        onConfirmar?.({ caixa_id: caixaId });
      },
      onVoltar: () => {
        abrirModal2();
      },
    });
  }

  abrirModal1();
}
