import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { formatarNumero } from '../../infra/formatters.js';
import { agruparCaixas } from '../../domain/caixas.js';

function celula(texto, classe) {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = texto == null ? '-' : String(texto);
  return span;
}

export function abrirModalSelecionarCaixa({ sessoesDoEmbarque = [], opAtual, onSelecionar, onVoltar } = {}) {
  const modal = Modal({
    title: 'Qual caixa deseja descarregar?',
    subtitle: 'Selecione a caixa de destino. As pecas contadas serao somadas ao conteudo existente.',
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const caixas = agruparCaixas(sessoesDoEmbarque);

  if (caixas.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'text-sm text-on-surface-variant';
    vazio.textContent = 'Nenhuma caixa registrada neste embarque.';
    stage.appendChild(vazio);
  } else {
    const lista = document.createElement('div');
    lista.className = 'space-y-2 max-h-96 overflow-y-auto';
    for (const caixa of caixas) {
      const incompativel = opAtual != null && caixa.codigo_op !== opAtual;
      const qtdSessoes = sessoesDoEmbarque.filter(
        (s) => s.numero_caixa === caixa.numero_caixa && s.status !== 'cancelada',
      ).length;

      const linha = document.createElement('button');
      linha.type = 'button';
      linha.dataset.linhaCaixaOpcao = 'true';
      if (incompativel) {
        linha.dataset.incompativel = 'true';
        linha.disabled = true;
        linha.setAttribute('title', 'OP diferente - incompativel com a sessao atual');
      }
      const base = 'w-full text-left grid grid-cols-[1fr,auto,auto,auto] gap-3 px-4 py-3 rounded-lg text-sm items-center transition-colors';
      const ativo = 'bg-surface-container-low hover:bg-surface-container cursor-pointer';
      const inativo = 'bg-surface-container-low opacity-50 cursor-not-allowed';
      linha.className = `${base} ${incompativel ? inativo : ativo}`;
      linha.append(
        celula(caixa.numero_caixa_exibicao, 'font-medium text-on-surface'),
        celula(caixa.codigo_op, 'text-on-surface-variant text-xs'),
        celula(formatarNumero(caixa.quantidade_total), 'font-semibold text-on-surface'),
        celula(`${qtdSessoes} sess${qtdSessoes === 1 ? 'ao' : 'oes'}`, 'text-on-surface-variant text-xs'),
      );
      if (!incompativel) {
        linha.addEventListener('click', () => { modal.fechar(); onSelecionar?.(caixa.numero_caixa); });
      }
      lista.appendChild(linha);
    }
    stage.appendChild(lista);
  }

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';
  const btnVoltar = Button({
    texto: 'Voltar',
    variante: 'secondary',
    onClick: () => { modal.fechar(); onVoltar?.(); },
  });
  btnVoltar.dataset.acaoVoltar = 'true';
  actions.appendChild(btnVoltar);
  stage.appendChild(actions);

  body.appendChild(stage);
  return modal;
}
