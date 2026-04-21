import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export async function abrirModalNovaCarga(ctx) {
  const modal = Modal({ title: 'Nova Carga', subtitle: 'Insira os parâmetros técnicos para iniciar.' });
  modal.abrir();
  const body = modal.corpo();

  const stage1 = document.createElement('div');
  stage1.dataset.stage = 'params';

  const embarqueIn = Input({ label: 'Número do Embarque', id: 'in-emb' });
  embarqueIn.querySelector('input').dataset.input = 'numero_embarque';
  const opIn = Input({ label: 'Ordem de Produção', id: 'in-op' });
  opIn.querySelector('input').dataset.input = 'codigo_op';
  const operIn = Input({ label: 'Código do Operador', id: 'in-oper' });
  operIn.querySelector('input').dataset.input = 'codigo_operador';
  const cameraIn = Input({ label: 'Câmera (1 ou 2)', id: 'in-cam', value: '1' });
  cameraIn.querySelector('input').dataset.input = 'camera_id';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-4';
  grid.appendChild(opIn);
  grid.appendChild(operIn);

  stage1.appendChild(embarqueIn);
  stage1.appendChild(grid);
  stage1.appendChild(cameraIn);

  const continuar = Button({ texto: 'Continuar', variante: 'primary', onClick: async () => {
    const form = {
      numero_embarque: document.querySelector('[data-input="numero_embarque"]').value,
      codigo_op: document.querySelector('[data-input="codigo_op"]').value,
      codigo_operador: document.querySelector('[data-input="codigo_operador"]').value,
      camera_id: Number(document.querySelector('[data-input="camera_id"]').value),
    };
    try {
      const sessao = await ctx.sessoesSvc.abrir(form);
      renderStageProgram(body, ctx, sessao, modal);
    } catch (e) { toast.erro(e.message); }
  }});
  continuar.dataset.submitAbrir = 'true';

  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4';
  actions.appendChild(continuar);
  actions.appendChild(cancelar);
  stage1.appendChild(actions);

  body.appendChild(stage1);
}

function renderStageProgram(body, ctx, sessao, modal) {
  body.innerHTML = '';
  const stage = document.createElement('div');
  stage.dataset.stage = 'programa';
  stage.innerHTML = `<p class="text-sm text-on-surface-variant mb-4">Sessão aberta na câmera ${sessao.camera_id}. Selecione o programa.</p>`;
  const busca = Input({ label: 'Buscar programa', id: 'in-busca-prog' });
  const lista = document.createElement('ul');
  lista.className = 'space-y-2 max-h-80 overflow-auto';
  stage.appendChild(busca);
  stage.appendChild(lista);
  body.appendChild(stage);

  async function refresh(q = '') {
    lista.innerHTML = '';
    const progs = await ctx.catalogos.programas(sessao.camera_id, q);
    for (const p of progs) {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-4 py-3 rounded-lg bg-surface-container-high hover:bg-secondary-container/40 transition-colors';
      btn.textContent = `${String(p.numero).padStart(3, '0')} · ${p.nome}`;
      btn.addEventListener('click', async () => {
        try {
          await ctx.sessoesSvc.confirmar(sessao.id, { programaNumero: p.numero, programaNome: p.nome });
          modal.fechar();
          window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque ?? '')}`;
        } catch (e) { toast.erro(e.message); }
      });
      lista.appendChild(btn);
    }
  }
  busca.querySelector('input').addEventListener('input', (e) => refresh(e.target.value));
  refresh('');
}
