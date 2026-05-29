import { Button } from '../ui/primitives/button.js';
import { Input } from '../ui/primitives/input.js';
import { Icon } from '../ui/primitives/icon.js';
import { Modal } from '../ui/primitives/modal.js';
import { toast } from '../ui/primitives/toast.js';

function abrirModalNomeGrupo({ titulo, subtitulo, valorInicial = '', onConfirmar }) {
  const modal = Modal({ title: titulo, subtitle: subtitulo });
  modal.abrir();
  const body = modal.corpo();

  const inputNome = Input({ label: 'Nome do Grupo', id: 'input-nome-grupo', placeholder: 'Ex.: Operadores, Supervisores...' });
  const input = inputNome.querySelector('input');
  input.value = valorInicial;
  body.appendChild(inputNome);

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';

  actions.appendChild(Button({
    texto: 'Confirmar',
    variante: 'primary',
    icone: 'check',
    onClick: async () => {
      const nome = input.value.trim();
      if (!nome) { toast.erro('Informe o nome do grupo.'); return; }
      await onConfirmar(nome);
      modal.fechar();
    },
  }));

  actions.appendChild(Button({
    texto: 'Cancelar',
    variante: 'secondary',
    onClick: () => modal.fechar(),
  }));

  body.appendChild(actions);
  setTimeout(() => input.focus(), 100);
}

function abrirModalConfirmacao({ titulo, subtitulo, textoConfirmar = 'Confirmar', onConfirmar }) {
  const modal = Modal({ title: titulo, subtitle: subtitulo });
  modal.abrir();
  const body = modal.corpo();

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-2';

  actions.appendChild(Button({
    texto: textoConfirmar,
    variante: 'danger',
    icone: 'delete',
    onClick: async () => {
      await onConfirmar();
      modal.fechar();
    },
  }));

  actions.appendChild(Button({
    texto: 'Cancelar',
    variante: 'secondary',
    onClick: () => modal.fechar(),
  }));

  body.appendChild(actions);
}

export async function renderConfiguradorGrupos(ctx, container) {
  let catalogo = [];
  let grupos = [];
  let grupoSelecionado = null;

  try {
    [catalogo, grupos] = await Promise.all([
      ctx.api.get('/acesso/catalogo'),
      ctx.api.get('/acesso/grupos'),
    ]);
  } catch (err) {
    toast.erro('Falha ao carregar dados: ' + err.message);
    return;
  }

  function render() {
    container.innerHTML = '';
    const layout = document.createElement('div');
    layout.className = 'flex gap-6';

    // --- Painel esquerdo: lista de grupos ---
    const painel = document.createElement('div');
    painel.className = 'w-72 shrink-0 space-y-4';

    const btnNovo = Button({
      texto: 'Novo Grupo',
      variante: 'primary',
      icone: 'add',
      onClick: () => {
        abrirModalNomeGrupo({
          titulo: 'Novo Grupo',
          subtitulo: 'Defina o nome do grupo de acesso.',
          onConfirmar: async (nome) => {
            try {
              await ctx.api.post('/acesso/grupos', { nome });
              grupos = await ctx.api.get('/acesso/grupos');
              grupoSelecionado = grupos[grupos.length - 1];
              render();
              toast.sucesso('Grupo criado.');
            } catch (err) { toast.erro(err.message); }
          },
        });
      },
    });
    painel.appendChild(btnNovo);

    const lista = document.createElement('div');
    lista.className = 'space-y-2';

    for (const g of grupos) {
      const item = document.createElement('button');
      const isAtivo = grupoSelecionado?.id === g.id;
      item.className = isAtivo
        ? 'w-full text-left px-4 py-3 rounded-xl bg-surface-container-lowest border border-primary/30 shadow-sm transition-all'
        : 'w-full text-left px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/20 transition-all';

      const nome = document.createElement('p');
      nome.className = 'text-sm font-semibold text-on-surface';
      nome.textContent = g.nome;

      const badge = document.createElement('p');
      badge.className = 'text-[10px] text-on-surface-variant mt-0.5';
      badge.textContent = `${(g.atividades ?? []).length} atividade(s)`;

      item.append(nome, badge);
      item.addEventListener('click', () => { grupoSelecionado = g; render(); });
      lista.appendChild(item);
    }

    if (grupos.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'text-sm text-on-surface-variant text-center py-8';
      vazio.textContent = 'Nenhum grupo criado.';
      lista.appendChild(vazio);
    }

    painel.appendChild(lista);
    layout.appendChild(painel);

    // --- Painel direito: editor do grupo ---
    const editor = document.createElement('div');
    editor.className = 'flex-1 bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient';

    if (!grupoSelecionado) {
      const placeholder = document.createElement('div');
      placeholder.className = 'flex flex-col items-center justify-center h-64 text-on-surface-variant';
      placeholder.appendChild(Icon('tune', { className: 'text-5xl mb-3 opacity-40' }));
      const msg = document.createElement('p');
      msg.className = 'text-sm';
      msg.textContent = 'Selecione um grupo para editar suas atividades.';
      placeholder.appendChild(msg);
      editor.appendChild(placeholder);
    } else {
      renderEditor(editor, grupoSelecionado, catalogo, ctx, async () => {
        grupos = await ctx.api.get('/acesso/grupos');
        grupoSelecionado = grupos.find(g => g.id === grupoSelecionado.id) ?? null;
        render();
      });
    }

    layout.appendChild(editor);
    container.appendChild(layout);
  }

  render();
}

function renderEditor(editor, grupo, catalogo, ctx, onUpdate) {
  // Header com nome e ações
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-6 pb-4 border-b border-outline-variant';

  const tituloWrap = document.createElement('div');
  const titulo = document.createElement('h3');
  titulo.className = 'text-lg font-semibold text-on-surface';
  titulo.textContent = grupo.nome;
  const descGrupo = document.createElement('p');
  descGrupo.className = 'text-xs text-on-surface-variant mt-0.5';
  descGrupo.textContent = grupo.descricao || 'Sem descrição';
  tituloWrap.append(titulo, descGrupo);

  const acoes = document.createElement('div');
  acoes.className = 'flex gap-2';

  acoes.appendChild(Button({
    texto: 'Renomear',
    variante: 'secondary',
    size: 'sm',
    onClick: () => {
      abrirModalNomeGrupo({
        titulo: 'Renomear Grupo',
        subtitulo: `Altere o nome do grupo "${grupo.nome}".`,
        valorInicial: grupo.nome,
        onConfirmar: async (nome) => {
          try {
            await ctx.api.patch(`/acesso/grupos/${grupo.id}`, { nome });
            toast.sucesso('Grupo renomeado.');
            await onUpdate();
          } catch (err) { toast.erro(err.message); }
        },
      });
    },
  }));

  acoes.appendChild(Button({
    texto: 'Excluir',
    variante: 'outline-danger',
    size: 'sm',
    onClick: () => {
      abrirModalConfirmacao({
        titulo: 'Excluir Grupo',
        subtitulo: `Tem certeza que deseja excluir o grupo "${grupo.nome}"? Esta ação não pode ser desfeita.`,
        textoConfirmar: 'Excluir',
        onConfirmar: async () => {
          try {
            await ctx.api.delete(`/acesso/grupos/${grupo.id}`);
            toast.sucesso('Grupo excluído.');
            await onUpdate();
          } catch (err) { toast.erro(err.message); }
        },
      });
    },
  }));

  header.append(tituloWrap, acoes);
  editor.appendChild(header);

  // Árvore de atividades
  const atividadesAtuais = new Set(grupo.atividades ?? []);
  const arvore = document.createElement('div');
  arvore.className = 'space-y-5';

  const tituloArvore = document.createElement('p');
  tituloArvore.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2';
  tituloArvore.textContent = 'Atividades do Grupo';
  arvore.appendChild(tituloArvore);

  for (const pagina of catalogo) {
    const secao = document.createElement('div');
    secao.className = 'space-y-1';

    const paginaLabel = document.createElement('span');
    paginaLabel.className = 'text-xs font-bold text-on-surface-variant uppercase tracking-wider';
    paginaLabel.textContent = pagina.pagina;
    secao.appendChild(paginaLabel);

    for (const at of pagina.atividades) {
      const row = document.createElement('label');
      row.className = 'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container cursor-pointer transition-colors';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = atividadesAtuais.has(at.id);
      cb.className = 'w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/30 accent-primary';
      cb.addEventListener('change', () => {
        if (cb.checked) atividadesAtuais.add(at.id);
        else atividadesAtuais.delete(at.id);
      });

      const lbl = document.createElement('span');
      lbl.className = 'text-sm text-on-surface';
      lbl.textContent = at.rotulo;

      row.append(cb, lbl);
      secao.appendChild(row);
    }

    arvore.appendChild(secao);
  }

  editor.appendChild(arvore);

  // Botão salvar
  const footer = document.createElement('div');
  footer.className = 'mt-6 pt-4 border-t border-outline-variant flex justify-end';

  footer.appendChild(Button({
    texto: 'Salvar Atividades',
    variante: 'primary',
    icone: 'save',
    onClick: async () => {
      try {
        await ctx.api.put(`/acesso/grupos/${grupo.id}/atividades`, { atividades: [...atividadesAtuais] });
        toast.sucesso('Atividades salvas.');
        await onUpdate();
      } catch (err) { toast.erro(err.message); }
    },
  }));

  editor.appendChild(footer);
}
