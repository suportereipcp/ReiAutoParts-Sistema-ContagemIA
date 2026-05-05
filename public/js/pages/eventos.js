import { formatarData, formatarHora } from '../infra/formatters.js';

const COR_NIVEL = {
  INFO: 'text-on-surface-variant',
  SUCCESS: 'text-on-secondary-container',
  WARN: 'text-amber-700',
  ERROR: 'text-on-error-container',
};

const STATUS_CAMERA = {
  contagem_lida: { label: 'Contagem lida', classe: 'text-on-secondary-container' },
  resposta_comando_lida: { label: 'Resposta de comando', classe: 'text-on-surface-variant' },
  resposta_sem_comando: { label: 'Resposta solta', classe: 'text-amber-700' },
  erro_lido: { label: 'Erro lido', classe: 'text-on-error-container' },
  nao_interpretada: { label: 'Não interpretada', classe: 'text-on-error-container' },
};

const MAX_LOG_CAMERA = 200;

function textoStatusCamera(status) {
  return STATUS_CAMERA[status] ?? { label: status ?? 'Desconhecido', classe: 'text-on-surface-variant' };
}

function formatarJsonCamera(parsed) {
  if (!parsed) return 'null';
  try { return JSON.stringify(parsed); } catch (_) { return String(parsed); }
}

function dataLocalISO(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

function cameraIdLog(payload) {
  return String(payload.camera_id ?? payload.cameraId ?? '-');
}

function criarLinhaLogCamera(payload) {
  const status = textoStatusCamera(payload.status);
  const cameraId = cameraIdLog(payload);
  const linha = document.createElement('div');
  linha.dataset.logCamera = '';
  linha.dataset.camera = cameraId;
  linha.dataset.dia = dataLocalISO(payload.timestamp);
  linha.className = 'grid grid-cols-[72px_88px_130px_minmax(240px,1fr)_minmax(260px,1fr)] gap-3 border-t border-outline-variant py-3 text-xs first:border-t-0';

  const hora = document.createElement('span');
  hora.className = 'text-on-surface-variant';
  hora.textContent = formatarHora(payload.timestamp ?? new Date().toISOString());

  const camera = document.createElement('span');
  camera.className = 'font-semibold text-on-surface';
  camera.textContent = `Camera ${cameraId}`;

  const situacao = document.createElement('span');
  situacao.className = `${status.classe} font-semibold`;
  situacao.textContent = status.label;

  const bruto = document.createElement('code');
  bruto.className = 'font-mono text-[11px] text-on-surface break-all';
  bruto.textContent = payload.linha ?? '';

  const json = document.createElement('code');
  json.className = 'font-mono text-[11px] text-on-surface-variant break-all';
  json.textContent = formatarJsonCamera(payload.parsed);

  linha.append(hora, camera, situacao, bruto, json);
  return linha;
}

function criarGrupoLogCamera(payload) {
  const grupo = document.createElement('div');
  grupo.dataset.logCameraGrupo = '';
  grupo.className = 'sticky top-0 z-10 border-t border-outline-variant bg-surface-container-lowest py-2 text-[10px] font-bold uppercase tracking-widest text-outline';
  grupo.textContent = `${formatarData(payload.timestamp)} - Camera ${cameraIdLog(payload)}`;
  return grupo;
}

function atualizarOpcoesCamera(select, logs) {
  const atual = select.value || 'todas';
  const cameras = [...new Set(logs.map(cameraIdLog))].filter(id => id !== '-').sort((a, b) => Number(a) - Number(b));
  select.innerHTML = '<option value="todas">Todas</option>';
  for (const camera of cameras) {
    const option = document.createElement('option');
    option.value = camera;
    option.textContent = `Camera ${camera}`;
    select.appendChild(option);
  }
  select.value = cameras.includes(atual) ? atual : 'todas';
}

function filtrarLogsCamera(logs, filtros) {
  return logs.filter(payload => {
    if (filtros.dia && dataLocalISO(payload.timestamp) !== filtros.dia) return false;
    if (filtros.camera !== 'todas' && cameraIdLog(payload) !== filtros.camera) return false;
    return true;
  });
}

function renderizarLogsCamera({ lista, vazio, filtroCamera, logs, filtros }) {
  atualizarOpcoesCamera(filtroCamera, logs);
  lista.innerHTML = '';
  const filtrados = filtrarLogsCamera(logs, filtros);
  vazio.hidden = filtrados.length > 0;
  vazio.textContent = logs.length === 0
    ? 'Aguardando linhas da câmera.'
    : 'Nenhuma linha para os filtros selecionados.';

  let grupoAtual = '';
  for (const payload of filtrados) {
    const grupo = `${dataLocalISO(payload.timestamp)}|${cameraIdLog(payload)}`;
    if (grupo !== grupoAtual) {
      lista.appendChild(criarGrupoLogCamera(payload));
      grupoAtual = grupo;
    }
    lista.appendChild(criarLinhaLogCamera(payload));
  }
}

export async function renderEventos(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';
  el.innerHTML = `
    <section>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Observabilidade</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Eventos</h2>
    </section>
  `;
  const painelCamera = document.createElement('section');
  painelCamera.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  painelCamera.innerHTML = `
    <div class="flex items-start justify-between gap-4 pb-4">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Câmera</p>
        <h3 class="text-xl font-headline font-light text-on-surface">Tráfego ao vivo</h3>
      </div>
      <span class="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-secondary-container">WebSocket</span>
    </div>
    <div class="mb-4 grid grid-cols-[180px_180px_1fr] gap-3">
      <label class="block">
        <span class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-outline">Dia</span>
        <input data-filtro-log-dia type="date" class="w-full rounded-lg border-outline-variant bg-surface-container-low text-sm text-on-surface">
      </label>
      <label class="block">
        <span class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-outline">Câmera</span>
        <select data-filtro-log-camera class="w-full rounded-lg border-outline-variant bg-surface-container-low text-sm text-on-surface">
          <option value="todas">Todas</option>
        </select>
      </label>
    </div>
    <div data-log-camera-scroll class="max-h-[420px] overflow-auto pr-1">
      <div class="min-w-[980px]">
        <div class="grid grid-cols-[72px_88px_130px_minmax(240px,1fr)_minmax(260px,1fr)] gap-3 border-b border-outline-variant pb-3 text-[10px] font-bold uppercase tracking-widest text-outline">
          <span>Hora</span>
          <span>Câmera</span>
          <span>Status</span>
          <span>ASCII/CSV recebido</span>
          <span>JSON interpretado</span>
        </div>
        <div data-log-camera-vazio class="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Aguardando linhas da câmera.
        </div>
        <div data-log-camera-lista></div>
      </div>
    </div>
  `;
  const listaCamera = painelCamera.querySelector('[data-log-camera-lista]');
  const vazioCamera = painelCamera.querySelector('[data-log-camera-vazio]');
  const filtroDia = painelCamera.querySelector('[data-filtro-log-dia]');
  const filtroCamera = painelCamera.querySelector('[data-filtro-log-camera]');
  const logsCamera = [];
  const filtros = { dia: '', camera: 'todas' };
  const renderLog = () => renderizarLogsCamera({ lista: listaCamera, vazio: vazioCamera, filtroCamera, logs: logsCamera, filtros });
  filtroDia.addEventListener('change', () => { filtros.dia = filtroDia.value; renderLog(); });
  filtroCamera.addEventListener('change', () => { filtros.camera = filtroCamera.value || 'todas'; renderLog(); });
  const onTrafegoCamera = (e) => {
    logsCamera.unshift(e.detail ?? {});
    while (logsCamera.length > MAX_LOG_CAMERA) logsCamera.pop();
    renderLog();
  };
  document.addEventListener('ws:camera.trafego', onTrafegoCamera);
  el.appendChild(painelCamera);

  const eventos = await ctx.api.get('/eventos');
  const tabela = document.createElement('section');
  tabela.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  tabela.innerHTML = `
    <div class="grid grid-cols-[80px_100px_140px_1fr] pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Hora</span><span>Nível</span><span>Categoria</span><span>Mensagem</span>
    </div>
    ${eventos.map(e => `
      <div data-linha-evento class="grid grid-cols-[80px_100px_140px_1fr] py-3 text-sm">
        <span class="text-on-surface-variant">${formatarHora(e.timestamp)}</span>
        <span class="${COR_NIVEL[e.nivel] ?? 'text-on-surface-variant'} font-semibold">${e.nivel}</span>
        <span class="text-on-surface-variant">${e.categoria}</span>
        <span class="text-on-surface">${e.mensagem}</span>
      </div>
    `).join('')}
  `;
  el.appendChild(tabela);
  return el;
}
