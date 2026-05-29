import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';

export async function renderConfiguradorCameras(ctx, container) {
  container.innerHTML = '';

  let configSlots, cameras;
  try {
    [configSlots, cameras] = await Promise.all([
      ctx.api.get('/cameras/config'),
      ctx.api.get('/cameras'),
    ]);
  } catch (err) {
    toast.erro('Falha ao carregar configuração de câmeras: ' + err.message);
    return;
  }

  // Header
  const header = document.createElement('div');
  header.className = 'space-y-1 mb-6';
  header.innerHTML = `
    <h3 class="text-lg font-semibold text-on-surface">Configuração de Câmeras</h3>
    <p class="text-sm text-on-surface-variant">Defina a ordem dos botões e labels para cada câmera.</p>
  `;
  container.appendChild(header);

  // Grid of cards
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const selects = [];

  for (const slot of configSlots) {
    const camera = cameras.find(c => Number(c.id) === slot.camera_id);
    const conectada = camera?.estado !== 'desconectada';

    const card = document.createElement('div');
    card.className = 'rounded-2xl border border-surface-container bg-surface-container-lowest p-6 space-y-4';

    // Slot number + connection status
    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between';
    topRow.innerHTML = `
      <span class="text-3xl font-bold text-primary">${slot.slot}</span>
      <span class="inline-flex items-center gap-1.5 text-xs font-medium ${conectada ? 'text-secondary' : 'text-error'}">
        <span class="h-2.5 w-2.5 rounded-full ${conectada ? 'bg-secondary' : 'bg-error'}"></span>
        ${conectada ? 'Conectada' : 'Desconectada'}
      </span>
    `;
    card.appendChild(topRow);

    // Camera select
    const selectLabel = document.createElement('label');
    selectLabel.className = 'block';
    selectLabel.innerHTML = '<span class="mb-1 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline">Câmera</span>';
    const select = document.createElement('select');
    select.dataset.slot = String(slot.slot);
    select.className = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-3 text-sm text-on-surface outline-none';
    for (const cam of cameras) {
      const opt = document.createElement('option');
      opt.value = cam.id;
      opt.textContent = `Câmera ${cam.id} (${cam.ip || 'IP?'})`;
      if (Number(cam.id) === slot.camera_id) opt.selected = true;
      select.appendChild(opt);
    }
    selectLabel.appendChild(select);
    card.appendChild(selectLabel);
    selects.push(select);

    // Label input
    const inputLabel = document.createElement('label');
    inputLabel.className = 'block';
    inputLabel.innerHTML = '<span class="mb-1 block text-[11px] font-bold uppercase tracking-[0.22em] text-outline">Label</span>';
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.slotLabel = String(slot.slot);
    input.className = 'w-full rounded-2xl border-none bg-surface-container-high px-4 py-3 text-sm text-on-surface outline-none';
    input.placeholder = 'Ex: Linha A';
    input.value = slot.label || '';
    inputLabel.appendChild(input);
    card.appendChild(inputLabel);

    grid.appendChild(card);
  }
  container.appendChild(grid);

  // Error message area
  const erroEl = document.createElement('p');
  erroEl.className = 'text-sm text-error font-medium mt-4 hidden';
  container.appendChild(erroEl);

  // Save button
  const acoes = document.createElement('div');
  acoes.className = 'flex justify-end mt-6';
  const btnSalvar = Button({
    texto: 'Salvar',
    variante: 'primary',
    icone: 'save',
    onClick: async () => {
      erroEl.classList.add('hidden');

      const dados = [];
      const cameraIdsSeen = new Set();
      for (const select of selects) {
        const slotNum = Number(select.dataset.slot);
        const cameraId = Number(select.value);
        const labelInput = container.querySelector(`[data-slot-label="${slotNum}"]`);
        const label = labelInput?.value?.trim() || '';

        if (cameraIdsSeen.has(cameraId)) {
          erroEl.textContent = `Câmera ${cameraId} está em mais de um slot.`;
          erroEl.classList.remove('hidden');
          return;
        }
        cameraIdsSeen.add(cameraId);
        dados.push({ slot: slotNum, camera_id: cameraId, label });
      }

      btnSalvar.disabled = true;
      try {
        await ctx.api.put('/cameras/config', dados);
        toast.sucesso('Configuração de câmeras salva.');
      } catch (e) {
        toast.erro(e.message || 'Erro ao salvar configuração.');
      } finally {
        btnSalvar.disabled = false;
      }
    },
  });
  acoes.appendChild(btnSalvar);
  container.appendChild(acoes);
}
