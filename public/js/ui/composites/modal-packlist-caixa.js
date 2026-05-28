import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';
import { formatarNumero, formatarHora } from '../../infra/formatters.js';
import { rotuloCaixa } from '../../domain/caixas.js';

function celula(textoOuNumero, classe) {
  const span = document.createElement('span');
  span.className = classe;
  span.textContent = textoOuNumero == null ? '-' : String(textoOuNumero);
  return span;
}

export function abrirModalPacklistCaixa({ caixaId, sessoesDaCaixa = [], onConfirmar, onVoltar } = {}) {
  const rotulo = rotuloCaixa(caixaId);
  const opCodigo = sessoesDaCaixa[0]?.codigo_op ?? '-';
  const itemNome = sessoesDaCaixa[0]?.programa_nome ?? '-';

  const modal = Modal({
    title: `Caixa ${rotulo}`,
    subtitle: `${opCodigo} - ${itemNome}`,
  });
  modal.abrir();
  const body = modal.corpo();

  const stage = document.createElement('div');
  stage.className = 'space-y-6';

  const lista = document.createElement('div');
  lista.dataset.packlistLista = 'true';
  lista.className = 'space-y-2 max-h-80 overflow-y-auto';

  const ordenadas = [...sessoesDaCaixa].sort((a, b) => {
    const ta = a.encerrada_em ?? a.iniciada_em ?? '';
    const tb = b.encerrada_em ?? b.iniciada_em ?? '';
    return ta.localeCompare(tb);
  });

  let total = 0;
  for (const sessao of ordenadas) {
    total += Number(sessao.quantidade_total) || 0;
    const linha = document.createElement('div');
    linha.dataset.linhaSessao = 'true';
    linha.className = 'grid grid-cols-[1fr,auto,auto,auto] gap-3 px-3 py-2 rounded-lg bg-surface-container-low text-sm items-center';
    linha.append(
      celula(`${sessao.codigo_op ?? '-'} - ${sessao.programa_nome ?? '-'}`, 'text-on-surface'),
      celula(formatarNumero(sessao.quantidade_total), 'font-semibold text-on-surface'),
      celula(sessao.codigo_operador ?? '-', 'text-on-surface-variant text-xs'),
      celula(formatarHora(sessao.encerrada_em ?? sessao.iniciada_em), 'text-on-surface-variant text-xs'),
    );
    lista.appendChild(linha);
  }
  stage.appendChild(lista);

  const totalEl = document.createElement('div');
  totalEl.dataset.packlistTotal = 'true';
  totalEl.className = 'flex justify-end text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/40';
  totalEl.textContent = `Total: ${formatarNumero(total)}`;
  stage.appendChild(totalEl);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';
  const btnConcluir = Button({
    texto: 'Concluir',
    variante: 'primary',
    onClick: () => { modal.fechar(); onConfirmar?.(); },
  });
  btnConcluir.dataset.acaoConcluir = 'true';
  const btnVoltar = Button({
    texto: 'Voltar',
    variante: 'secondary',
    onClick: () => { modal.fechar(); onVoltar?.(); },
  });
  btnVoltar.dataset.acaoVoltar = 'true';
  actions.appendChild(btnConcluir);
  actions.appendChild(btnVoltar);
  stage.appendChild(actions);

  body.appendChild(stage);
  return modal;
}
