import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export function abrirContinuarCargaMultipla({ sessoes = [], onContinuar } = {}) {
  const overlay = document.createElement('div');
  overlay.dataset.modalOverlay = 'true';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm p-4';

  const container = document.createElement('div');
  container.dataset.stage = 'continuar-multipla';
  container.className = 'w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[560px]';

  const leftCol = document.createElement('div');
  leftCol.className = 'w-full md:w-[450px] p-10 flex flex-col';
  leftCol.innerHTML = `
    <header class="mb-10">
      <h2 class="text-3xl font-headline font-light tracking-tight text-primary mb-1">Continuar Carga</h2>
      <p class="text-sm text-on-surface-variant font-light">Existem múltiplas cargas pendentes. Selecione um embarque para prosseguir.</p>
    </header>
  `;

  const campos = document.createElement('div');
  campos.className = 'space-y-6 flex-1';

  const labelSelect = document.createElement('label');
  labelSelect.className = 'text-[10px] uppercase tracking-widest text-on-surface-variant font-medium block mb-2';
  labelSelect.textContent = 'Escolha o Embarque';

  const select = document.createElement('select');
  select.dataset.input = 'embarque_selecionado';
  select.className = 'w-full appearance-none bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface text-sm focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  placeholderOption.textContent = 'Selecione a carga ativa...';
  select.appendChild(placeholderOption);
  for (const s of sessoes) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.numero_embarque ?? '-'} · ${s.programa_nome ?? 'Programa não confirmado'}`;
    select.appendChild(opt);
  }

  const selectWrap = document.createElement('div');
  selectWrap.appendChild(labelSelect);
  selectWrap.appendChild(select);

  const opInput = Input({ label: 'Ordem de Produção', id: 'ccm-op', placeholder: 'Ex: OP-8829-X' });
  opInput.querySelector('input').dataset.input = 'codigo_op';
  const operInput = Input({ label: 'Código do Operador', id: 'ccm-oper' });
  operInput.querySelector('input').dataset.input = 'codigo_operador';
  operInput.querySelector('input').type = 'password';

  campos.appendChild(selectWrap);
  campos.appendChild(opInput);
  campos.appendChild(operInput);
  leftCol.appendChild(campos);

  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-4 mt-10';
  const continuar = Button({ texto: 'Continuar', variante: 'primary', onClick: () => {
    const sessaoId = select.value;
    if (!sessaoId) { toast.erro('Selecione um embarque.'); return; }
    const codigoOperador = operInput.querySelector('input').value.trim();
    if (!codigoOperador) { toast.erro('Informe o código do operador.'); return; }
    const sessao = sessoes.find(s => s.id === sessaoId);
    fechar();
    if (onContinuar) onContinuar({ sessao, codigoOperador, codigoOp: opInput.querySelector('input').value.trim() });
    else window.location.hash = `#/cargas/${encodeURIComponent(sessao?.numero_embarque ?? '')}`;
  } });
  continuar.dataset.submitContinuar = 'true';
  continuar.classList.add('flex-1');
  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => fechar() });
  actions.appendChild(continuar);
  actions.appendChild(cancelar);
  leftCol.appendChild(actions);

  const rightCol = document.createElement('div');
  rightCol.dataset.visualizacao = 'true';
  rightCol.className = 'hidden md:flex flex-1 bg-surface-container-high p-10 flex-col';
  renderVisualizacao(rightCol, null);

  select.addEventListener('change', () => {
    const sessao = sessoes.find(s => s.id === select.value) ?? null;
    renderVisualizacao(rightCol, sessao);
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);
  overlay.appendChild(container);

  const escListener = (e) => { if (e.key === 'Escape') fechar(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
  document.addEventListener('keydown', escListener);
  document.body.appendChild(overlay);

  function fechar() {
    overlay.remove();
    document.removeEventListener('keydown', escListener);
  }

  return { fechar };
}

function renderVisualizacao(col, sessao) {
  const nome = sessao?.programa_nome ?? 'Nenhum embarque selecionado';
  const contexto = sessao ? `Câmera ${sessao.camera_id ?? '-'} · ${sessao.numero_embarque ?? '-'}` : 'Selecione para visualizar os detalhes.';
  col.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Visualização da Peça</span>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-secondary"></div>
        <span class="text-[10px] font-bold text-secondary uppercase tracking-tighter">Sistema Ativo</span>
      </div>
    </div>
    <div class="flex-1 flex flex-col">
      <div class="relative flex-1 bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 flex items-center justify-center">
        <span class="material-symbols-outlined text-[7rem] text-outline-variant/40">settings_input_component</span>
        <div class="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface-container-lowest to-transparent">
          <h3 class="text-xl font-headline font-bold tracking-tight text-on-surface">${nome}</h3>
          <p class="text-xs text-on-surface-variant font-light">${contexto}</p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 mt-6">
        <div class="p-4 bg-surface-container rounded-xl">
          <span class="block text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Última Inspeção</span>
          <span class="text-sm font-medium text-on-surface">${sessao ? rotuloHora(sessao.iniciada_em) : '—'}</span>
        </div>
        <div class="p-4 bg-surface-container rounded-xl">
          <span class="block text-[10px] text-outline font-bold uppercase tracking-widest mb-1">Contagem Atual</span>
          <span class="text-sm font-medium text-on-surface">${sessao?.quantidade_total ?? 0} peças</span>
        </div>
      </div>
      <div class="mt-6 pt-4 border-t border-outline-variant/20 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center">
          <span class="material-symbols-outlined text-on-secondary-container">verified_user</span>
        </div>
        <div>
          <p class="text-[10px] font-bold text-on-surface uppercase tracking-tighter">Status da Qualidade</p>
          <p class="text-xs text-on-surface-variant">Lote aprovado para transbordo</p>
        </div>
      </div>
    </div>
  `;
}

function rotuloHora(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}
