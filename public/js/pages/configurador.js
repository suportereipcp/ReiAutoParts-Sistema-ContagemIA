import { renderConfiguradorGrupos } from './configurador-grupos.js';
import { renderConfiguradorUsuarios } from './configurador-usuarios.js';
import { renderConfiguradorCameras } from './configurador-cameras.js';

export async function renderConfigurador(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'configurador';
  el.className = 'space-y-6';

  // Header
  const header = document.createElement('section');
  header.className = 'flex flex-col gap-1 border-b border-outline-variant pb-6';
  header.innerHTML = `
    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Administração</p>
    <h2 class="text-3xl font-headline font-light tracking-tight text-on-surface">Configurador de Acessos</h2>
    <p class="text-sm text-on-surface-variant font-light">Gerencie grupos de acesso, atividades e permissões de usuários.</p>
  `;
  el.appendChild(header);

  // Tabs
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'flex gap-1 bg-surface-container rounded-lg p-1';

  const abas = [
    { id: 'grupos', label: 'Grupos de Acesso', icone: 'folder_shared' },
    { id: 'usuarios', label: 'Usuários', icone: 'group' },
    { id: 'cameras', label: 'Cameras', icone: 'videocam' },
  ];

  const conteudo = document.createElement('div');
  conteudo.className = 'min-h-[400px]';

  let abaAtiva = 'grupos';

  function renderTab(id) {
    abaAtiva = id;
    // Atualiza visual das tabs
    for (const btn of tabsContainer.querySelectorAll('button')) {
      const isAtivo = btn.dataset.tab === id;
      btn.className = isAtivo
        ? 'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold bg-surface-container-lowest text-primary shadow-sm transition-all'
        : 'flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-high transition-all';
    }
    // Renderiza conteúdo
    conteudo.innerHTML = '';
    if (id === 'grupos') {
      renderConfiguradorGrupos(ctx, conteudo);
    } else if (id === 'usuarios') {
      renderConfiguradorUsuarios(ctx, conteudo);
    } else if (id === 'cameras') {
      renderConfiguradorCameras(ctx, conteudo);
    }
  }

  for (const aba of abas) {
    const btn = document.createElement('button');
    btn.dataset.tab = aba.id;
    btn.innerHTML = `<span class="material-symbols-outlined text-lg">${aba.icone}</span>${aba.label}`;
    btn.addEventListener('click', () => renderTab(aba.id));
    tabsContainer.appendChild(btn);
  }

  el.appendChild(tabsContainer);
  el.appendChild(conteudo);

  // Renderiza aba inicial
  renderTab(abaAtiva);

  return el;
}
