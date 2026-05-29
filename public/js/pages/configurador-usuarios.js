import { Button } from '../ui/primitives/button.js';
import { Input } from '../ui/primitives/input.js';
import { Icon } from '../ui/primitives/icon.js';
import { toast } from '../ui/primitives/toast.js';

export async function renderConfiguradorUsuarios(ctx, container) {
  let usuarios = [];
  let grupos = [];
  let catalogo = [];
  let usuarioSelecionado = null;
  let filtro = '';

  try {
    [usuarios, grupos, catalogo] = await Promise.all([
      ctx.api.get('/acesso/usuarios'),
      ctx.api.get('/acesso/grupos'),
      ctx.api.get('/acesso/catalogo'),
    ]);
  } catch (err) {
    toast.erro('Falha ao carregar dados: ' + err.message);
    return;
  }

  function usuariosFiltrados() {
    if (!filtro) return usuarios;
    const termo = filtro.toLowerCase();
    return usuarios.filter(u =>
      (u.nome ?? '').toLowerCase().includes(termo) ||
      (u.email ?? '').toLowerCase().includes(termo)
    );
  }

  async function render() {
    container.innerHTML = '';
    const layout = document.createElement('div');
    layout.className = 'flex gap-6';

    // --- Painel esquerdo: lista de usuários ---
    const painel = document.createElement('div');
    painel.className = 'w-80 shrink-0 space-y-4';

    // Título
    const tituloLista = document.createElement('p');
    tituloLista.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline';
    tituloLista.textContent = 'Usuários Sincronizados';
    painel.appendChild(tituloLista);

    // Campo de busca
    const buscaWrap = document.createElement('div');
    buscaWrap.className = 'relative';
    const buscaIcon = Icon('search', { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none' });
    const buscaInput = document.createElement('input');
    buscaInput.type = 'text';
    buscaInput.placeholder = 'Buscar por nome ou email...';
    buscaInput.value = filtro;
    buscaInput.className = 'w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all';
    buscaInput.addEventListener('input', (e) => {
      filtro = e.target.value;
      renderLista();
    });
    buscaWrap.append(buscaIcon, buscaInput);
    painel.appendChild(buscaWrap);

    // Lista
    const lista = document.createElement('div');
    lista.className = 'space-y-2 max-h-[460px] overflow-y-auto pr-1';
    lista.dataset.listaUsuarios = '';
    painel.appendChild(lista);

    function renderLista() {
      lista.innerHTML = '';
      const visiveis = usuariosFiltrados();

      if (usuarios.length === 0) {
        const vazio = document.createElement('div');
        vazio.className = 'flex flex-col items-center py-10 text-on-surface-variant';
        vazio.appendChild(Icon('group_off', { className: 'text-4xl mb-2 opacity-40' }));
        const msg = document.createElement('p');
        msg.className = 'text-sm';
        msg.textContent = 'Nenhum usuário sincronizado do Supabase.';
        vazio.appendChild(msg);
        lista.appendChild(vazio);
        return;
      }

      if (visiveis.length === 0) {
        const vazio = document.createElement('p');
        vazio.className = 'text-sm text-on-surface-variant text-center py-6';
        vazio.textContent = 'Nenhum resultado para a busca.';
        lista.appendChild(vazio);
        return;
      }

      for (const u of visiveis) {
        const item = document.createElement('button');
        const isAtivo = usuarioSelecionado?.id === u.id;
        item.className = isAtivo
          ? 'w-full text-left px-4 py-3 rounded-xl bg-surface-container-lowest border border-primary/30 shadow-sm transition-all flex items-center gap-3'
          : 'w-full text-left px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/20 hover:shadow-sm transition-all flex items-center gap-3';

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold uppercase ' +
          (isAtivo ? 'bg-primary text-on-primary' : 'bg-primary-container text-on-primary-container');
        const iniciais = (u.nome ?? u.email ?? '?').slice(0, 2).toUpperCase();
        avatar.textContent = iniciais;

        const textos = document.createElement('div');
        textos.className = 'min-w-0 flex-1';
        const nome = document.createElement('p');
        nome.className = 'text-sm font-semibold text-on-surface truncate';
        nome.textContent = u.nome || u.email || u.id.slice(0, 8);
        const email = document.createElement('p');
        email.className = 'text-[11px] text-on-surface-variant truncate';
        email.textContent = u.email ?? '';
        textos.append(nome, email);

        item.append(avatar, textos);
        item.addEventListener('click', async () => {
          usuarioSelecionado = u;
          await render();
        });
        lista.appendChild(item);
      }
    }

    renderLista();
    layout.appendChild(painel);

    // --- Painel direito: editor do usuário ---
    const editor = document.createElement('div');
    editor.className = 'flex-1 bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient min-h-[400px]';

    if (!usuarioSelecionado) {
      const placeholder = document.createElement('div');
      placeholder.className = 'flex flex-col items-center justify-center h-64 text-on-surface-variant';
      placeholder.appendChild(Icon('person', { className: 'text-5xl mb-3 opacity-40' }));
      const msg = document.createElement('p');
      msg.className = 'text-sm';
      msg.textContent = 'Selecione um usuário para configurar seus acessos.';
      placeholder.appendChild(msg);
      editor.appendChild(placeholder);
    } else {
      await renderEditorUsuario(editor, usuarioSelecionado, grupos, catalogo, ctx);
    }

    layout.appendChild(editor);
    container.appendChild(layout);
  }

  await render();
}

async function renderEditorUsuario(editor, usuario, todosGrupos, catalogo, ctx) {
  let acesso;
  try {
    acesso = await ctx.api.get(`/acesso/usuarios/${usuario.id}/acesso`);
  } catch (err) {
    toast.erro('Falha ao carregar acesso: ' + err.message);
    return;
  }

  const gruposAtuais = new Set(acesso.grupos.map(g => g.id));
  const overridesMap = new Map(acesso.overrides.map(o => [o.atividade_id, o.efeito]));

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center gap-4 mb-6 pb-4 border-b border-outline-variant';

  const avatar = document.createElement('div');
  avatar.className = 'w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-primary text-on-primary text-lg font-bold uppercase';
  avatar.textContent = (usuario.nome ?? usuario.email ?? '?').slice(0, 2).toUpperCase();

  const headerTextos = document.createElement('div');
  const titulo = document.createElement('h3');
  titulo.className = 'text-lg font-semibold text-on-surface';
  titulo.textContent = usuario.nome || usuario.email || usuario.id.slice(0, 8);
  const sub = document.createElement('p');
  sub.className = 'text-xs text-on-surface-variant';
  sub.textContent = usuario.email ?? '';
  headerTextos.append(titulo, sub);

  header.append(avatar, headerTextos);
  editor.appendChild(header);

  // --- Seção: Grupos ---
  const secGrupos = document.createElement('div');
  secGrupos.className = 'mb-6';
  const tituloGrupos = document.createElement('p');
  tituloGrupos.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-3';
  tituloGrupos.textContent = 'Grupos Atribuídos';
  secGrupos.appendChild(tituloGrupos);

  const gruposGrid = document.createElement('div');
  gruposGrid.className = 'flex flex-wrap gap-2';

  for (const g of todosGrupos) {
    const chip = document.createElement('label');
    const checked = gruposAtuais.has(g.id);
    chip.className = checked
      ? 'flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer transition-all text-sm font-medium'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant cursor-pointer transition-all text-sm hover:border-primary/20 hover:bg-surface-container-high';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    cb.className = 'w-4 h-4 rounded accent-primary';
    cb.addEventListener('change', () => {
      if (cb.checked) gruposAtuais.add(g.id);
      else gruposAtuais.delete(g.id);
      // Atualiza visual do chip
      chip.className = cb.checked
        ? 'flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer transition-all text-sm font-medium'
        : 'flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant cursor-pointer transition-all text-sm hover:border-primary/20 hover:bg-surface-container-high';
    });

    const lbl = document.createElement('span');
    lbl.className = 'text-on-surface';
    lbl.textContent = g.nome;
    chip.append(cb, lbl);
    gruposGrid.appendChild(chip);
  }

  if (todosGrupos.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'text-xs text-on-surface-variant italic';
    msg.textContent = 'Nenhum grupo disponível. Crie grupos na aba "Grupos de Acesso".';
    gruposGrid.appendChild(msg);
  }

  secGrupos.appendChild(gruposGrid);
  editor.appendChild(secGrupos);

  // --- Seção: Overrides individuais ---
  const secOverrides = document.createElement('div');
  secOverrides.className = 'mb-6';
  const tituloOv = document.createElement('p');
  tituloOv.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2';
  tituloOv.textContent = 'Permissões Individuais (Overrides)';
  secOverrides.appendChild(tituloOv);

  const descOv = document.createElement('p');
  descOv.className = 'text-xs text-on-surface-variant mb-3';
  descOv.textContent = 'Conceda ou revogue atividades específicas independente dos grupos atribuídos.';
  secOverrides.appendChild(descOv);

  for (const pagina of catalogo) {
    const secPag = document.createElement('div');
    secPag.className = 'mb-4';
    const pagLabel = document.createElement('p');
    pagLabel.className = 'text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 pb-1 border-b border-outline-variant/50';
    pagLabel.textContent = pagina.pagina;
    secPag.appendChild(pagLabel);

    for (const at of pagina.atividades) {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container transition-colors';

      const lbl = document.createElement('span');
      lbl.className = 'text-sm text-on-surface';
      lbl.textContent = at.rotulo;

      // Botões segmentados: Herdar | Conceder | Revogar
      const segmented = document.createElement('div');
      segmented.className = 'flex rounded-lg overflow-hidden border border-outline-variant';

      const atual = overridesMap.get(at.id) ?? '';
      const opcoes = [
        { value: '', label: 'Herdar', icon: 'remove', activeClass: 'bg-surface-container-high text-on-surface font-semibold' },
        { value: 'conceder', label: 'Conceder', icon: 'check', activeClass: 'bg-emerald-50 text-emerald-700 font-semibold border-emerald-200' },
        { value: 'revogar', label: 'Revogar', icon: 'close', activeClass: 'bg-red-50 text-red-700 font-semibold border-red-200' },
      ];
      const inactiveClass = 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high';

      const botoes = [];
      for (const op of opcoes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-3 py-1.5 text-[11px] flex items-center gap-1 transition-all ${atual === op.value ? op.activeClass : inactiveClass}`;
        if (op !== opcoes[0]) btn.classList.add('border-l', 'border-outline-variant');

        const iconEl = document.createElement('span');
        iconEl.className = 'material-symbols-outlined text-sm';
        iconEl.textContent = op.icon;
        btn.append(iconEl, document.createTextNode(op.label));

        btn.addEventListener('click', () => {
          if (op.value) overridesMap.set(at.id, op.value);
          else overridesMap.delete(at.id);
          // Atualiza visual
          for (let i = 0; i < botoes.length; i++) {
            const b = botoes[i];
            const o = opcoes[i];
            const isActive = o.value === op.value;
            b.className = `px-3 py-1.5 text-[11px] flex items-center gap-1 transition-all ${isActive ? o.activeClass : inactiveClass}`;
            if (i > 0) b.classList.add('border-l', 'border-outline-variant');
          }
        });

        botoes.push(btn);
        segmented.appendChild(btn);
      }

      row.append(lbl, segmented);
      secPag.appendChild(row);
    }
    secOverrides.appendChild(secPag);
  }

  editor.appendChild(secOverrides);

  // --- Seção: Acesso Efetivo ---
  const secEfetivo = document.createElement('div');
  secEfetivo.className = 'mb-6 p-4 rounded-xl bg-surface-container border border-outline-variant';
  const tituloEf = document.createElement('p');
  tituloEf.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-3';
  tituloEf.textContent = 'Acesso Efetivo (calculado)';
  secEfetivo.appendChild(tituloEf);

  if (acesso.efetivo.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'text-xs text-on-surface-variant italic';
    msg.textContent = 'Nenhuma atividade concedida a este usuário.';
    secEfetivo.appendChild(msg);
  } else {
    const chips = document.createElement('div');
    chips.className = 'flex flex-wrap gap-1.5';
    for (const aid of acesso.efetivo) {
      const chip = document.createElement('span');
      chip.className = 'text-[10px] px-2.5 py-1 rounded-md font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
      chip.textContent = aid;
      chips.appendChild(chip);
    }
    secEfetivo.appendChild(chips);
  }
  editor.appendChild(secEfetivo);

  // --- Botão Salvar ---
  const footer = document.createElement('div');
  footer.className = 'pt-4 border-t border-outline-variant flex justify-end';

  footer.appendChild(Button({
    texto: 'Salvar Permissões',
    variante: 'primary',
    icone: 'save',
    onClick: async () => {
      try {
        await ctx.api.put(`/acesso/usuarios/${usuario.id}/grupos`, { grupos: [...gruposAtuais] });
        const overrides = [...overridesMap.entries()].map(([atividade_id, efeito]) => ({ atividade_id, efeito }));
        await ctx.api.put(`/acesso/usuarios/${usuario.id}/overrides`, { overrides });
        toast.sucesso('Permissões salvas.');
      } catch (err) { toast.erro(err.message); }
    },
  }));

  editor.appendChild(footer);
}
