// Indicadores de conectividade do topo:
//  - Internet: navigator.onLine + eventos online/offline (detecção no navegador)
//  - Supabase: estado do Sync Worker (ONLINE / RECOVERY / OFFLINE / DESCONHECIDO)
// As imagens icon_internet.png / icon_supabase.jpg serviram de referência; aqui os
// glifos são SVG inline para permitir recolorir por estado e animar com nitidez.

const ACCENT = {
  conectado: '#16a34a',
  alerta: '#d97706',
  desconectado: '#dc2626',
  neutro: '#94a3b8',
};

function svgNode(markup) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return doc.documentElement;
}

function glifoGlobo() {
  return svgNode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="width:17px;height:17px;">
      <circle cx="12" cy="12" r="8.3"/>
      <path d="M12 3.7c2.15 2.2 3.35 5.2 3.35 8.3S14.15 18.1 12 20.3c-2.15-2.2-3.35-5.2-3.35-8.3S9.85 5.9 12 3.7Z"/>
      <path d="M3.8 12h16.4"/>
      <path d="M5.1 7.4c4.3 1.9 9.5 1.9 13.8 0M5.1 16.6c4.3-1.9 9.5-1.9 13.8 0" opacity="0.65"/>
      <line data-slash="true" x1="4.3" y1="19.7" x2="19.7" y2="4.3" stroke-width="2.1" style="display:none;"/>
    </svg>`);
}

function glifoSupabase() {
  return svgNode(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 113" fill="none" style="width:16px;height:16px;">
      <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.726-2.97L53.974 40.063h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347Z" fill="url(#sb-grad)"/>
      <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.726-2.97L53.974 40.063h45.22c8.19 0 12.758 9.46 7.665 15.874l-43.151 54.347Z" fill="url(#sb-grad2)" fill-opacity="0.2"/>
      <path d="M45.317 2.071c2.86-3.601 8.658-1.628 8.726 2.97l.442 67.251H9.831C1.64 72.292-2.928 62.832 2.165 56.418L45.317 2.071Z" fill="#3ECF8E"/>
      <defs>
        <linearGradient id="sb-grad" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse">
          <stop stop-color="#249361"/><stop offset="1" stop-color="#3ECF8E"/>
        </linearGradient>
        <linearGradient id="sb-grad2" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse">
          <stop/><stop offset="1" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>`);
}

function criarPill({ nome, glifo, comOrbita = false }) {
  const pill = document.createElement('div');
  pill.className = 'flex items-center gap-2.5 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest/70 backdrop-blur-md px-3 py-1.5 transition-colors duration-300';

  const circulo = document.createElement('span');
  circulo.dataset.iconCircle = 'true';
  circulo.className = 'relative flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest';

  let orbita = null;
  if (comOrbita) {
    orbita = svgNode(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"
           class="absolute inset-0" style="width:32px;height:32px;">
        <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.4"
                stroke-dasharray="3 7" stroke-linecap="round" opacity="0.55"/>
      </svg>`);
    circulo.appendChild(orbita);
  }

  const glyphWrap = document.createElement('span');
  glyphWrap.dataset.glyph = 'true';
  glyphWrap.className = 'relative flex items-center justify-center transition-all duration-300';
  glyphWrap.appendChild(glifo);
  circulo.appendChild(glyphWrap);

  const texto = document.createElement('div');
  texto.className = 'flex flex-col leading-tight';
  const rotuloNome = document.createElement('span');
  rotuloNome.className = 'text-[9px] font-bold uppercase tracking-[0.18em] text-outline';
  rotuloNome.textContent = nome;
  const status = document.createElement('span');
  status.dataset.status = 'true';
  status.className = 'flex items-center gap-1 text-[11px] font-semibold tabular-nums';
  const dot = document.createElement('span');
  dot.dataset.dot = 'true';
  dot.className = 'h-1.5 w-1.5 rounded-full bg-current';
  const statusTxt = document.createElement('span');
  statusTxt.dataset.statusTxt = 'true';
  status.appendChild(dot);
  status.appendChild(statusTxt);
  texto.appendChild(rotuloNome);
  texto.appendChild(status);

  pill.appendChild(circulo);
  pill.appendChild(texto);

  return { pill, circulo, glyphWrap, orbita, status, dot, statusTxt };
}

export function criarIndicadoresConexao(syncState) {
  const el = document.createElement('div');
  el.dataset.indicadoresConexao = 'true';
  el.className = 'flex items-center gap-2.5';

  const internet = criarPill({ nome: 'Internet', glifo: glifoGlobo(), comOrbita: true });
  const supabase = criarPill({ nome: 'Supabase', glifo: glifoSupabase() });
  el.appendChild(internet.pill);
  el.appendChild(supabase.pill);

  function aplicar(ui, { accent, conectado, statusTexto, slash = false, sincronizando = false }) {
    ui.circulo.style.setProperty('--conn-accent', accent);
    ui.circulo.classList.remove('zen-conn-glow', 'zen-conn-alert');
    ui.circulo.classList.add(conectado ? 'zen-conn-glow' : 'zen-conn-alert');
    ui.circulo.style.border = `1.5px solid ${accent}`;

    ui.statusTxt.textContent = statusTexto;
    ui.status.style.color = accent;
    ui.dot.classList.toggle('zen-conn-dot-pulse', conectado);

    // órbita girando apenas quando conectado
    if (ui.orbita) {
      ui.orbita.style.color = accent;
      ui.orbita.classList.toggle('zen-conn-orbit', conectado);
      ui.orbita.style.display = conectado ? '' : 'none';
    }

    // glifo: globo recolore via currentColor; supabase mantém o verde e
    // desaturamos via filtro quando não está saudável.
    ui.glyphWrap.style.color = accent;
    const glyphSvg = ui.glyphWrap.firstElementChild;
    if (glyphSvg) {
      glyphSvg.classList.toggle('zen-conn-sync', sincronizando);
      const ehSupabase = glyphSvg.querySelector('#sb-grad');
      if (ehSupabase) {
        glyphSvg.style.filter = conectado
          ? 'none'
          : (sincronizando ? 'saturate(0.7)' : 'grayscale(1) brightness(0.85)');
      }
      const linhaSlash = glyphSvg.querySelector('[data-slash]');
      if (linhaSlash) linhaSlash.style.display = slash ? '' : 'none';
    }
  }

  function renderInternet() {
    const online = navigator.onLine;
    aplicar(internet, online
      ? { accent: ACCENT.conectado, conectado: true, statusTexto: 'Conectado' }
      : { accent: ACCENT.desconectado, conectado: false, statusTexto: 'Sem conexão', slash: true });
  }

  function renderSupabase() {
    const estado = syncState.atual().estado;
    const mapa = {
      ONLINE: { accent: ACCENT.conectado, conectado: true, statusTexto: 'Sincronizado' },
      RECOVERY: { accent: ACCENT.alerta, conectado: false, statusTexto: 'Recuperando', sincronizando: true },
      OFFLINE: { accent: ACCENT.desconectado, conectado: false, statusTexto: 'Offline' },
      DESCONHECIDO: { accent: ACCENT.neutro, conectado: false, statusTexto: 'Verificando' },
    };
    aplicar(supabase, mapa[estado] ?? mapa.DESCONHECIDO);
  }

  const onOnline = () => renderInternet();
  const onOffline = () => renderInternet();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  const unsub = syncState.subscribe(renderSupabase);

  renderInternet();
  renderSupabase();

  el.destruir = () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    unsub();
  };

  return el;
}
