import { criarApi } from './infra/api.js';
import { criarWS } from './infra/ws.js';
import { criarRouter } from './infra/router.js';
import { criarSyncState } from './domain/sync-state.js';
import { criarSessoesState } from './domain/sessoes-state.js';
import { criarCatalogos } from './domain/catalogos.js';
import { criarSessoesService } from './domain/sessoes-service.js';
import { criarEtiquetasService } from './domain/etiquetas-service.js';
import { criarFaturamentoClienteService } from './domain/faturamento-service.js';
import { SideNav } from './ui/primitives/sidenav.js';
import { TopNav } from './ui/primitives/topnav.js';
import { criarIndicadoresConexao } from './ui/composites/indicadores-conexao.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSelecaoCarga } from './pages/selecao-carga.js';
import { renderDetalhesCarga } from './pages/detalhes-carga.js';
import { renderEmitirRelatorios } from './pages/emitir-relatorios.js';
import { renderDetalhesCargaExpedida } from './pages/detalhes-carga-expedida.js';
import { renderRelatoriosCargasAbertas } from './pages/relatorios-cargas-abertas.js';
import { renderEventos } from './pages/eventos.js';
import { renderGestaoAprovadores } from './pages/gestao-aprovadores.js';
import { renderConfigurador } from './pages/configurador.js';

const api = criarApi({ base: location.origin });
const catalogos = criarCatalogos({ api });
const sessoesSvc = criarSessoesService({ api });
const etiquetasSvc = criarEtiquetasService({ api });
const sync = criarSyncState();
const sessoes = criarSessoesState();
criarWS({ url: `ws://${location.host}/ws` });

document.addEventListener('ws:sync.status', (e) => sync.aplicaEventoWS(e.detail));
document.addEventListener('ws:contagem.incrementada', (e) => sessoes.aplicaContagem(e.detail));
document.addEventListener('ws:sessao.atualizada', (e) => sessoes.aplicaAtualizacao(e.detail));

async function pollHealth() {
  try { const h = await api.get('/health'); sync.aplicaHealth(h); } catch {}
}
setInterval(pollHealth, 5000);
pollHealth();

let _indicadores = null;
function renderShell(ativo) {
  const shell = document.getElementById('shell');
  shell.innerHTML = '';
  if (_indicadores?.destruir) { _indicadores.destruir(); _indicadores = null; }
  const side = SideNav({
    titulo: 'Rei AutoParts',
    itens: [
      { id: 'inicial', label: 'Inicial', icone: 'dashboard', href: '#/' },
      { id: 'cargas', label: 'Cargas', icone: 'package_2', href: '#/cargas' },
      { id: 'relatorios', label: 'Relatórios', icone: 'print', href: '#/relatorios' },
      { id: 'eventos', label: 'Eventos', icone: 'history', href: '#/eventos' },
      { id: 'configurador', label: 'Configurador', icone: 'tune', href: '#/configurador' },
    ],
    ativo,
  });
  _indicadores = criarIndicadoresConexao(sync);
  const top = TopNav({ caminho: [caminhoPadrao(ativo)], badge: _indicadores });
  shell.appendChild(side);
  shell.appendChild(top);
}

function caminhoPadrao(id) {
  return { inicial: 'Inicial', cargas: 'Gerenciador de Cargas', relatorios: 'Relatórios', eventos: 'Eventos', configurador: 'Configurador' }[id] ?? 'Rei AutoParts';
}

const ctx = { api, catalogos, sessoesSvc, etiquetasSvc, sync, sessoes };
ctx.faturamentoSvc = criarFaturamentoClienteService({ api });

criarRouter({
  root: '#root',
  rotas: {
    '/': async () => { renderShell('inicial'); return renderDashboard(ctx); },
    '/cargas': async () => { renderShell('cargas'); return renderSelecaoCarga(ctx); },
    '/cargas/:numero': async (p) => { renderShell('cargas'); return renderDetalhesCarga(ctx, p.numero); },
    '/expedidas/:numero': async (p) => { renderShell('cargas'); return renderDetalhesCargaExpedida(ctx, p.numero); },
    '/relatorios': async () => { renderShell('relatorios'); return renderEmitirRelatorios(ctx); },
    '/relatorios/abertas': async () => { renderShell('relatorios'); return renderRelatoriosCargasAbertas(ctx); },
    '/eventos': async () => { renderShell('eventos'); return renderEventos(ctx); },
    '/aprovadores': async () => { renderShell('aprovadores'); return renderGestaoAprovadores(ctx); },
    '/configurador': async () => { renderShell('configurador'); return renderConfigurador(ctx); },
  },
  render: (html) => {
    const root = document.getElementById('root');
    root.innerHTML = '';
    if (typeof html === 'string') root.innerHTML = html;
    else if (html instanceof HTMLElement) root.appendChild(html);
  },
}).resolver();
