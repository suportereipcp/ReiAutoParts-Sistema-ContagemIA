import { Input } from '../ui/primitives/input.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';
import { Icon } from '../ui/primitives/icon.js';

async function carregarLista(ctx, listaContainer, vazioContainer) {
  listaContainer.innerHTML = '';
  let aprovadores = [];
  try {
    aprovadores = await ctx.faturamentoSvc.listarAprovadores();
  } catch (err) {
    toast.erro('Falha ao carregar aprovadores: ' + err.message);
    return;
  }

  if (!Array.isArray(aprovadores) || aprovadores.length === 0) {
    vazioContainer.hidden = false;
    return;
  }

  vazioContainer.hidden = true;

  for (const aprov of aprovadores) {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant';
    row.dataset.aprovador = aprov.codigo;

    const info = document.createElement('div');
    info.className = 'flex items-center gap-4';

    const iconBox = document.createElement('div');
    iconBox.className = 'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-container text-on-primary-container';
    iconBox.appendChild(Icon('shield_person', { className: 'text-xl' }));

    const textos = document.createElement('div');
    textos.className = 'space-y-0.5';

    const codigo = document.createElement('p');
    codigo.className = 'text-sm font-bold text-on-surface';
    codigo.textContent = aprov.codigo;

    const nome = document.createElement('p');
    nome.className = 'text-xs text-on-surface-variant';
    nome.textContent = aprov.nome;

    textos.append(codigo, nome);
    info.append(iconBox, textos);

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-3';

    const ativo = aprov.ativo !== false;
    const badge = document.createElement('span');
    badge.dataset.statusBadge = '';
    if (ativo) {
      badge.className = 'text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200';
      badge.textContent = 'Ativo';
    } else {
      badge.className = 'text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200';
      badge.textContent = 'Inativo';
    }
    actions.appendChild(badge);

    if (ativo) {
      const btnDesativar = Button({
        texto: 'Desativar',
        variante: 'outline-danger',
        size: 'sm',
        onClick: async () => {
          try {
            await ctx.faturamentoSvc.desativarAprovador(aprov.codigo);
            toast.sucesso('Aprovador desativado com sucesso.');
            await carregarLista(ctx, listaContainer, vazioContainer);
          } catch (err) {
            toast.erro(err.message);
          }
        },
      });
      btnDesativar.dataset.desativar = aprov.codigo;
      actions.appendChild(btnDesativar);
    }

    row.append(info, actions);
    listaContainer.appendChild(row);
  }
}

export async function renderGestaoAprovadores(ctx) {
  const el = document.createElement('div');
  el.dataset.page = 'gestao-aprovadores';
  el.className = 'space-y-8';

  // Header
  const header = document.createElement('section');
  header.className = 'flex flex-col gap-1 border-b border-outline-variant pb-6';
  header.innerHTML = `
    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-1">Administração</p>
    <h2 class="text-3xl font-headline font-light tracking-tight text-on-surface">Gestão de Aprovadores</h2>
    <p class="text-sm text-on-surface-variant font-light">Cadastre e gerencie os aprovadores autorizados para aprovar sessões de faturamento.</p>
  `;
  el.appendChild(header);

  // Add Approver Card
  const card = document.createElement('div');
  card.className = 'bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient';

  const cardTitle = document.createElement('h3');
  cardTitle.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-4';
  cardTitle.textContent = 'Adicionar Aprovador';
  card.appendChild(cardTitle);

  const form = document.createElement('div');
  form.className = 'flex flex-col sm:flex-row gap-4 items-end';

  const inputCodigo = Input({ label: 'Código', id: 'novoCodigo', placeholder: 'Ex.: APROV1', required: true });
  const inputNome = Input({ label: 'Nome', id: 'novoNome', placeholder: 'Ex.: Carlos Silva', required: true });

  const inputsRow = document.createElement('div');
  inputsRow.className = 'flex gap-4 flex-1 w-full';
  inputsRow.append(inputCodigo, inputNome);

  // Lista & vazio - declarados antecipadamente para o onClick
  const listaContainer = document.createElement('div');
  listaContainer.className = 'space-y-3';
  listaContainer.dataset.listaAprovadores = '';

  const vazio = document.createElement('div');
  vazio.className = 'rounded-2xl bg-surface-container-lowest p-8 text-center border border-outline-variant text-sm text-on-surface-variant';
  vazio.textContent = 'Nenhum aprovador cadastrado.';
  vazio.dataset.aprovadoresVazio = '';

  const btnAdicionar = Button({
    texto: 'Adicionar Aprovador',
    variante: 'primary',
    icone: 'person_add',
    onClick: async () => {
      const codigoInput = inputCodigo.querySelector('input');
      const nomeInput = inputNome.querySelector('input');
      const codigo = codigoInput.value.trim();
      const nome = nomeInput.value.trim();

      if (!codigo || !nome) {
        toast.erro('Preencha o código e o nome do aprovador.');
        return;
      }

      try {
        await ctx.faturamentoSvc.inserirAprovador({ codigo, nome });
        toast.sucesso('Aprovador adicionado com sucesso.');
        codigoInput.value = '';
        nomeInput.value = '';
        await carregarLista(ctx, listaContainer, vazio);
      } catch (err) {
        toast.erro(err.message);
      }
    },
  });
  btnAdicionar.dataset.adicionarAprovador = '';

  form.append(inputsRow, btnAdicionar);
  card.appendChild(form);
  el.appendChild(card);

  // Approvers List Section
  const secaoLista = document.createElement('section');
  secaoLista.className = 'space-y-4';

  const tituloLista = document.createElement('h3');
  tituloLista.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline';
  tituloLista.textContent = 'Aprovadores Cadastrados';

  secaoLista.append(tituloLista, vazio, listaContainer);
  el.appendChild(secaoLista);

  // Load initial list
  await carregarLista(ctx, listaContainer, vazio);

  return el;
}
