import { formatarData, formatarHora } from '../infra/formatters.js';

const COR_NIVEL = {
  INFO: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    indicator: 'bg-slate-400',
    icon: 'info',
    text: 'text-slate-600'
  },
  SUCCESS: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indicator: 'bg-emerald-500',
    icon: 'check_circle',
    text: 'text-emerald-600'
  },
  WARN: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    indicator: 'bg-amber-500',
    icon: 'warning',
    text: 'text-amber-600'
  },
  ERROR: {
    bg: 'bg-red-50 text-red-700 border-red-200',
    indicator: 'bg-red-500',
    icon: 'error',
    text: 'text-red-600'
  },
};

const CATEGORIA_ESTILO = {
  SESSAO: { icon: 'assignment_ind', color: 'text-blue-500 bg-blue-50 border-blue-100' },
  CAMERA: { icon: 'sensors', color: 'text-orange-500 bg-orange-50 border-orange-100' },
  SYNC: { icon: 'cloud_sync', color: 'text-teal-500 bg-teal-50 border-teal-100' },
  SISTEMA: { icon: 'settings', color: 'text-purple-500 bg-purple-50 border-purple-100' },
};

const STATUS_CAMERA = {
  contagem_lida: { label: 'Contagem lida', cor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
  resposta_comando_lida: { label: 'Resposta', cor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' },
  resposta_sem_comando: { label: 'Resposta avulsa', cor: 'text-amber-400 bg-amber-950/60 border-amber-800' },
  erro_lido: { label: 'Erro', cor: 'text-rose-400 bg-rose-950/60 border-rose-800' },
  nao_interpretada: { label: 'Não interpretada', cor: 'text-rose-400/80 bg-rose-950/40 border-rose-900/60' },
};

const MAX_LOG_CAMERA = 200;

function formatarDataHoraCompleta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const seg = String(d.getSeconds()).padStart(2, '0');
  return `${dia}/${mes}/${ano}, ${hora}:${min}:${seg}`;
}

function textoStatusCamera(status) {
  return STATUS_CAMERA[status] ?? { label: status ?? 'Desconhecido', cor: 'text-slate-400 bg-slate-800 border-slate-700' };
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
  const horaFormatada = formatarHora(payload.timestamp ?? new Date().toISOString());

  const container = document.createElement('div');
  container.className = 'border-b border-slate-900/40 last:border-b-0 hover:bg-slate-900/30 transition-colors duration-150';
  container.dataset.logCamera = '';
  container.dataset.camera = cameraId;
  container.dataset.dia = dataLocalISO(payload.timestamp);

  // Layout principal da linha
  const mainRow = document.createElement('div');
  mainRow.className = 'flex items-center gap-4 py-2 px-3 cursor-pointer text-slate-300 hover:text-white select-none';

  // Hora
  const horaSpan = document.createElement('span');
  horaSpan.className = 'text-slate-500 font-mono text-[11px] shrink-0 w-16';
  horaSpan.textContent = horaFormatada;

  // Câmera
  const camSpan = document.createElement('span');
  const isCam1 = cameraId === '1';
  camSpan.className = `text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 border ${
    isCam1 ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/50' : 'bg-teal-950/80 text-teal-300 border-teal-800/50'
  }`;
  camSpan.textContent = `Camera ${cameraId}`;

  // Status
  const statusSpan = document.createElement('span');
  statusSpan.className = `text-[10px] px-2 py-0.5 rounded font-bold shrink-0 border uppercase tracking-wider ${status.cor}`;
  statusSpan.textContent = status.label;

  // Raw ASCII
  const rawCode = document.createElement('span');
  rawCode.className = 'font-mono text-xs truncate flex-1 text-slate-300 font-medium break-all';
  rawCode.textContent = payload.linha ?? '';

  // Chevron para indicar expansão se houver dados parseados
  const actionContainer = document.createElement('div');
  actionContainer.className = 'shrink-0 flex items-center text-slate-500 hover:text-slate-300 transition-colors';
  if (payload.parsed) {
    actionContainer.innerHTML = '<span class="material-symbols-outlined text-lg transition-transform duration-200">keyboard_arrow_down</span>';
  } else {
    actionContainer.className = 'shrink-0 w-5';
  }

  mainRow.append(horaSpan, camSpan, statusSpan, rawCode, actionContainer);
  container.appendChild(mainRow);

  // Detalhes em JSON (oculto por padrão)
  if (payload.parsed) {
    const detailsRow = document.createElement('div');
    detailsRow.className = 'hidden px-4 pb-4 pt-1 border-t border-slate-900/60 bg-slate-950/80';
    
    const detailsTitle = document.createElement('div');
    detailsTitle.className = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono';
    detailsTitle.textContent = 'JSON Interpretado:';
    
    const jsonPre = document.createElement('pre');
    jsonPre.className = 'text-cyan-400/90 font-mono text-[11px] p-3 bg-slate-950 border border-slate-900 rounded-lg overflow-x-auto whitespace-pre-wrap';
    jsonPre.textContent = formatarJsonCamera(payload.parsed);

    detailsRow.append(detailsTitle, jsonPre);
    container.appendChild(detailsRow);

    // Evento de clique para expandir
    mainRow.addEventListener('click', () => {
      const isHidden = detailsRow.classList.toggle('hidden');
      const icon = actionContainer.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  }

  return container;
}

function criarGrupoLogCamera(payload) {
  const grupo = document.createElement('div');
  grupo.dataset.logCameraGrupo = '';
  grupo.className = 'sticky top-0 z-10 bg-slate-950/90 border-y border-slate-900 px-3 py-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400';
  grupo.textContent = `${formatarData(payload.timestamp)} - Camera ${cameraIdLog(payload)}`;
  return grupo;
}

function filtrarLogsCamera(logs, filtros) {
  return logs.filter(payload => {
    if (filtros.dia && dataLocalISO(payload.timestamp) !== filtros.dia) return false;
    if (filtros.camera !== 'todas' && cameraIdLog(payload) !== filtros.camera) return false;
    if (filtros.busca) {
      const query = filtros.busca.toLowerCase();
      const txtRaw = (payload.linha ?? '').toLowerCase();
      const txtParsed = JSON.stringify(payload.parsed ?? '').toLowerCase();
      if (!txtRaw.includes(query) && !txtParsed.includes(query)) return false;
    }
    return true;
  });
}

function renderizarLogsCamera({ lista, vazio, filtroCamera, logs, filtros }) {
  // Atualiza as opções do select de câmeras de forma dinâmica
  const atual = filtroCamera.value || 'todas';
  const cameras = [...new Set(logs.map(cameraIdLog))].filter(id => id !== '-').sort((a, b) => Number(a) - Number(b));
  filtroCamera.innerHTML = '<option value="todas">Todas as Câmeras</option>';
  for (const camera of cameras) {
    const option = document.createElement('option');
    option.value = camera;
    option.textContent = `Camera ${camera}`;
    filtroCamera.appendChild(option);
  }
  filtroCamera.value = cameras.includes(atual) ? atual : 'todas';

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

// Renderiza a linha individual do log do banco de dados/Supabase
function criarLinhaEvento(e) {
  const nivelEstilo = COR_NIVEL[e.nivel] ?? COR_NIVEL.INFO;

  const row = document.createElement('tr');
  row.className = 'hover:bg-surface-container-low/50 transition-colors';

  const tdTime = document.createElement('td');
  tdTime.className = 'px-4 py-2.5 text-xs text-on-surface-variant font-mono whitespace-nowrap';
  tdTime.textContent = formatarDataHoraCompleta(e.timestamp);

  const tdNivel = document.createElement('td');
  tdNivel.className = 'px-4 py-2.5';
  tdNivel.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${nivelEstilo.bg}">${e.nivel}</span>`;

  const tdCategoria = document.createElement('td');
  tdCategoria.className = 'px-4 py-2.5 text-xs text-on-surface-variant font-medium uppercase';
  tdCategoria.textContent = e.categoria ?? '—';

  const tdMsg = document.createElement('td');
  tdMsg.className = 'px-4 py-2.5 text-sm text-on-surface';
  tdMsg.textContent = e.mensagem;

  const tdOp = document.createElement('td');
  tdOp.className = 'px-4 py-2.5 text-xs text-on-surface-variant font-mono';
  tdOp.textContent = e.codigo_operador ?? '—';

  row.append(tdTime, tdNivel, tdCategoria, tdMsg, tdOp);
  return row;
}

function filtrarLogsSistema(logs, filtros) {
  return logs.filter(e => {
    if (filtros.nivel !== 'todos' && e.nivel !== filtros.nivel) return false;
    if (filtros.categoria !== 'todas' && e.categoria !== filtros.categoria) return false;
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      const msg = (e.mensagem ?? '').toLowerCase();
      const op = (e.codigo_operador ?? '').toLowerCase();
      if (!msg.includes(q) && !op.includes(q)) return false;
    }
    return true;
  });
}

function renderizarLogsSistema({ container, vazio, logs, filtros }) {
  container.innerHTML = '';
  const filtrados = filtrarLogsSistema(logs, filtros);
  vazio.hidden = filtrados.length > 0;

  for (const e of filtrados) {
    container.appendChild(criarLinhaEvento(e));
  }
}

export async function renderEventos(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-6';

  // Carrega histórico de eventos do banco
  let eventosSistema = [];
  try {
    eventosSistema = await ctx.api.get('/eventos');
  } catch (err) {
    console.error('Falha ao carregar eventos do sistema', err);
  }

  // Grid de Cards com Estatísticas
  const statsGrid = document.createElement('section');
  statsGrid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-3';
  statsGrid.innerHTML = `
    <!-- Card Sincronização -->
    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between zen-shadow-ambient">
      <div class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-widest text-outline">Sincronizador</p>
        <h4 data-stat-sync-estado class="text-lg font-black tracking-wide text-on-surface uppercase flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span> Carregando...
        </h4>
        <p data-stat-sync-outbox class="text-xs text-on-surface-variant">Verificando fila outbox...</p>
      </div>
      <div class="p-3 bg-surface-container rounded-xl text-primary"><span class="material-symbols-outlined text-2xl">cloud_sync</span></div>
    </div>

    <!-- Card Total Câmeras -->
    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between zen-shadow-ambient">
      <div class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-widest text-outline">Mensagens Câmeras</p>
        <h4 data-stat-total-camera class="text-2xl font-black font-headline text-on-surface">0</h4>
        <p class="text-xs text-on-surface-variant">Trafegados nesta sessão</p>
      </div>
      <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-500"><span class="material-symbols-outlined text-2xl">sensors</span></div>
    </div>

    <!-- Card Sucessos -->
    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between zen-shadow-ambient">
      <div class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-widest text-outline">Sucessos Sincronizados</p>
        <h4 data-stat-total-sucessos class="text-2xl font-black font-headline text-secondary">0</h4>
        <p class="text-xs text-on-surface-variant">Sessões e contagens OK</p>
      </div>
      <div class="p-3 bg-secondary-container border border-secondary/20 rounded-xl text-secondary"><span class="material-symbols-outlined text-2xl">check_circle</span></div>
    </div>

    <!-- Card Alertas e Erros -->
    <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 flex items-center justify-between zen-shadow-ambient">
      <div class="space-y-1">
        <p class="text-[10px] font-bold uppercase tracking-widest text-outline">Alertas & Erros</p>
        <h4 data-stat-total-erros class="text-2xl font-black font-headline text-red-600">0</h4>
        <p class="text-xs text-on-surface-variant">Requer atenção técnica</p>
      </div>
      <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600"><span class="material-symbols-outlined text-2xl">warning</span></div>
    </div>
  `;
  el.appendChild(statsGrid);

  // Tabs de Navegação
  const abasNav = document.createElement('div');
  abasNav.className = 'border-b border-outline-variant flex gap-6 mt-4';
  abasNav.innerHTML = `
    <button data-tab-btn="cameras" class="pb-3 border-b-2 border-primary text-sm font-semibold text-primary flex items-center gap-2 transition-all">
      <span class="material-symbols-outlined text-lg">sensors</span>
      Tráfego das Câmeras (Live)
    </button>
    <button data-tab-btn="sistema" class="pb-3 border-b-2 border-transparent text-sm font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-2 transition-all">
      <span class="material-symbols-outlined text-lg">history</span>
      Logs do Sistema & Sincronização
    </button>
  `;
  el.appendChild(abasNav);

  // Painéis das Abas
  const paineisContainer = document.createElement('div');
  paineisContainer.className = 'space-y-4';

  // ------------------ PAINEL 1: CÂMERAS ------------------
  const painelCameras = document.createElement('div');
  painelCameras.dataset.tabContent = 'cameras';
  painelCameras.className = 'space-y-4';
  painelCameras.innerHTML = `
    <!-- Barra de Filtros Câmeras -->
    <div class="flex flex-wrap gap-2 items-center bg-surface-container-low rounded-xl p-3 border border-outline-variant">
      <input data-filtro-log-dia type="date" class="rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface font-medium focus:ring-primary h-8 px-2">
      <select data-filtro-log-camera class="rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface font-medium focus:ring-primary h-8 px-2">
        <option value="todas">Todas as Câmeras</option>
      </select>
      <input data-filtro-log-busca type="text" placeholder="Filtrar console..." class="flex-1 min-w-[140px] rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-primary h-8 px-3">
      <button data-btn-limpar-console class="h-8 px-3 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-outline-variant hover:border-outline rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold shrink-0">
        <span class="material-symbols-outlined text-sm">mop</span> Limpar
      </button>
    </div>

    <!-- Console de Tráfego -->
    <div class="bg-[#0b0f19] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-slate-900">
      <div class="bg-slate-950 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 select-none">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-mono text-xs text-slate-400 font-bold uppercase tracking-wider">camera-traffic-console.log</span>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-500">
          <span>Formatos: <strong class="text-slate-400">ASCII/CSV recebido</strong> & <strong class="text-slate-400">JSON interpretado</strong></span>
          <span class="hidden sm:inline text-slate-700">|</span>
          <span class="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold tracking-wider">WS ACTIVE</span>
        </div>
      </div>
      <div data-log-camera-scroll class="max-h-[calc(100vh-380px)] min-h-[300px] overflow-auto p-2 zen-scroll">
        <div data-log-camera-vazio class="text-slate-500 py-16 text-center italic text-xs font-mono">
          Aguardando fluxo de dados das câmeras Keyence...
        </div>
        <div data-log-camera-lista class="font-mono divide-y divide-slate-900/40"></div>
      </div>
    </div>
  `;
  paineisContainer.appendChild(painelCameras);

  // ------------------ PAINEL 2: SISTEMA ------------------
  const painelSistema = document.createElement('div');
  painelSistema.dataset.tabContent = 'sistema';
  painelSistema.className = 'space-y-4 hidden';
  painelSistema.innerHTML = `
    <!-- Barra de Filtros Sistema -->
    <div class="flex flex-wrap gap-2 items-center bg-surface-container-low rounded-xl p-3 border border-outline-variant">
      <select data-filtro-sys-nivel class="rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface font-medium focus:ring-primary h-8 px-2">
        <option value="todos">Todos os Níveis</option>
        <option value="SUCCESS">Sucessos</option>
        <option value="INFO">Informação</option>
        <option value="WARN">Avisos</option>
        <option value="ERROR">Erros</option>
      </select>
      <select data-filtro-sys-categoria class="rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface font-medium focus:ring-primary h-8 px-2">
        <option value="todas">Todas as Categorias</option>
        <option value="SESSAO">Sessão</option>
        <option value="CAMERA">Câmera</option>
        <option value="SYNC">Sincronização</option>
        <option value="SISTEMA">Sistema</option>
      </select>
      <input data-filtro-sys-busca type="text" placeholder="Pesquisar mensagens..." class="flex-1 min-w-[140px] rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-primary h-8 px-3">
    </div>

    <!-- Lista de Logs -->
    <div class="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div data-log-sys-vazio class="p-8 text-center text-sm text-on-surface-variant hidden">
        Nenhum evento registrado no sistema para os filtros aplicados.
      </div>
      <div data-log-sys-scroll class="max-h-[calc(100vh-380px)] min-h-[300px] overflow-auto zen-scroll">
        <table class="w-full text-left text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-surface-container-low">
            <tr class="text-on-surface-variant">
              <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] w-40">Data/Hora</th>
              <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] w-24">Nível</th>
              <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] w-28">Categoria</th>
              <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em]">Mensagem</th>
              <th class="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] w-20">Operador</th>
            </tr>
          </thead>
          <tbody data-log-sys-lista class="divide-y divide-surface-container"></tbody>
        </table>
      </div>
    </div>
  `;
  paineisContainer.appendChild(painelSistema);
  el.appendChild(paineisContainer);

  // Elementos do Painel 1 (Câmeras)
  const listaCamera = painelCameras.querySelector('[data-log-camera-lista]');
  const vazioCamera = painelCameras.querySelector('[data-log-camera-vazio]');
  const filtroDia = painelCameras.querySelector('[data-filtro-log-dia]');
  const filtroCamera = painelCameras.querySelector('[data-filtro-log-camera]');
  const filtroBuscaCamera = painelCameras.querySelector('[data-filtro-log-busca]');
  const btnLimparConsole = painelCameras.querySelector('[data-btn-limpar-console]');
  const scrollContainer = painelCameras.querySelector('[data-log-camera-scroll]');

  // Elementos do Painel 2 (Sistema)
  const listaSistema = painelSistema.querySelector('[data-log-sys-lista]');
  const vazioSistema = painelSistema.querySelector('[data-log-sys-vazio]');
  const filtroSysNivel = painelSistema.querySelector('[data-filtro-sys-nivel]');
  const filtroSysCategoria = painelSistema.querySelector('[data-filtro-sys-categoria]');
  const filtroSysBusca = painelSistema.querySelector('[data-filtro-sys-busca]');

  // Elementos de Estatísticas
  const statSyncEstado = el.querySelector('[data-stat-sync-estado]');
  const statSyncOutbox = el.querySelector('[data-stat-sync-outbox]');
  const statTotalCamera = el.querySelector('[data-stat-total-camera]');
  const statTotalSucessos = el.querySelector('[data-stat-total-sucessos]');
  const statTotalErros = el.querySelector('[data-stat-total-erros]');

  // Inicializa Filtros e Buffers
  const logsCamera = [];
  const filtrosCam = { dia: '', camera: 'todas', busca: '' };
  const filtrosSys = { nivel: 'todos', categoria: 'todas', busca: '' };

  // Atualização dos contadores de estatísticas de logs do sistema
  const recalcularEstatisticasSistema = () => {
    let sucessos = 0;
    let erros = 0;
    for (const e of eventosSistema) {
      if (e.nivel === 'SUCCESS') sucessos++;
      else if (e.nivel === 'ERROR' || e.nivel === 'WARN') erros++;
    }
    statTotalSucessos.textContent = sucessos;
    statTotalErros.textContent = erros;
  };
  recalcularEstatisticasSistema();

  // Renderizadores
  const renderLogCam = () => {
    renderizarLogsCamera({
      lista: listaCamera,
      vazio: vazioCamera,
      filtroCamera,
      logs: logsCamera,
      filtros: filtrosCam
    });
  };

  const renderLogSys = () => {
    renderizarLogsSistema({
      container: listaSistema,
      vazio: vazioSistema,
      logs: eventosSistema,
      filtros: filtrosSys
    });
  };

  // Inicializa filtros da câmera vazios por padrão
  filtroDia.value = '';
  filtrosCam.dia = '';

  // Listeners Câmeras
  filtroDia.addEventListener('change', () => { filtrosCam.dia = filtroDia.value; renderLogCam(); });
  filtroCamera.addEventListener('change', () => { filtrosCam.camera = filtroCamera.value || 'todas'; renderLogCam(); });
  filtroBuscaCamera.addEventListener('input', () => { filtrosCam.busca = filtroBuscaCamera.value; renderLogCam(); });
  btnLimparConsole.addEventListener('click', () => {
    logsCamera.length = 0;
    statTotalCamera.textContent = '0';
    renderLogCam();
  });

  // Listeners Sistema
  filtroSysNivel.addEventListener('change', () => { filtrosSys.nivel = filtroSysNivel.value || 'todos'; renderLogSys(); });
  filtroSysCategoria.addEventListener('change', () => { filtrosSys.categoria = filtroSysCategoria.value || 'todas'; renderLogSys(); });
  filtroSysBusca.addEventListener('input', () => { filtrosSys.busca = filtroSysBusca.value; renderLogSys(); });

  // Alternância de Abas
  const tabButtons = el.querySelectorAll('[data-tab-btn]');
  const tabContents = el.querySelectorAll('[data-tab-content]');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tabBtn;
      tabButtons.forEach(b => {
        b.className = b.dataset.tabBtn === target
          ? 'pb-3 border-b-2 border-primary text-sm font-semibold text-primary flex items-center gap-2 transition-all'
          : 'pb-3 border-b-2 border-transparent text-sm font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-2 transition-all';
      });
      tabContents.forEach(c => {
        if (c.dataset.tabContent === target) {
          c.classList.remove('hidden');
        } else {
          c.classList.add('hidden');
        }
      });
    });
  });

  // Render inicial das listas
  renderLogCam();
  renderLogSys();

  // Escuta Tráfego Câmeras via WS
  const onTrafegoCamera = (e) => {
    logsCamera.unshift(e.detail ?? {});
    while (logsCamera.length > MAX_LOG_CAMERA) logsCamera.pop();
    statTotalCamera.textContent = logsCamera.length;
    renderLogCam();

    // Auto-scroll para o topo se estiver perto do topo
    if (scrollContainer.scrollTop < 60) {
      scrollContainer.scrollTop = 0;
    }
  };
  document.addEventListener('ws:camera.trafego', onTrafegoCamera);

  // Escuta novos logs do sistema emitidos pelo backend via WS
  const onNovoEvento = (e) => {
    const log = e.detail ?? {};
    eventosSistema.unshift(log);
    recalcularEstatisticasSistema();
    renderLogSys();
  };
  document.addEventListener('ws:evento.novo', onNovoEvento);

  // Sincronização do Sincronizador / Outbox State
  const atualizarSyncCard = (estado, outboxPendentes) => {
    const isOnline = estado === 'ONLINE';
    const isRecovery = estado === 'RECOVERY';

    let estadoHtml = '';
    if (isOnline) {
      estadoHtml = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span> Online`;
      statSyncEstado.className = 'text-lg font-black tracking-wide text-emerald-600 uppercase flex items-center gap-1.5';
    } else if (isRecovery) {
      estadoHtml = `<span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span> Recuperando`;
      statSyncEstado.className = 'text-lg font-black tracking-wide text-amber-600 uppercase flex items-center gap-1.5';
    } else {
      estadoHtml = `<span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span> Offline`;
      statSyncEstado.className = 'text-lg font-black tracking-wide text-red-600 uppercase flex items-center gap-1.5';
    }
    statSyncEstado.innerHTML = estadoHtml;

    if (outboxPendentes > 0) {
      statSyncOutbox.textContent = `${outboxPendentes} itens pendentes na fila`;
      statSyncOutbox.className = 'text-xs text-amber-600 font-semibold';
    } else {
      statSyncOutbox.textContent = 'Tudo sincronizado';
      statSyncOutbox.className = 'text-xs text-on-surface-variant';
    }
  };

  // Assina sincronizador
  const syncState = ctx.sync ? ctx.sync.atual() : { estado: 'ONLINE', outbox_pendentes: 0 };
  atualizarSyncCard(syncState.estado, syncState.outbox_pendentes);
  let unsubSync = () => {};
  if (ctx.sync) {
    unsubSync = ctx.sync.subscribe((novo) => {
      atualizarSyncCard(novo.estado, novo.outbox_pendentes);
    });
  }

  // Limpeza de Listeners quando sair da rota (através de mutação ou remoção do elemento)
  if (typeof MutationObserver !== 'undefined') {
    const mut = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        document.removeEventListener('ws:camera.trafego', onTrafegoCamera);
        document.removeEventListener('ws:evento.novo', onNovoEvento);
        unsubSync();
        mut.disconnect();
      }
    });
    mut.observe(document.body, { childList: true, subtree: true });
  }

  return el;
}
