import { criarApi } from './infra/api.js';
import { criarWS } from './infra/ws.js';
import { criarSessoesState } from './domain/sessoes-state.js';
import { criarSyncState } from './domain/sync-state.js';
import { SyncBadge } from './ui/primitives/badge.js';
import { renderTV } from './tv-render.js';

const api = criarApi({ base: location.origin });
const sync = criarSyncState();
const sessoes = criarSessoesState();
criarWS({ url: `ws://${location.host}/ws` });

document.addEventListener('ws:sync.status', (e) => sync.aplicaEventoWS(e.detail));
document.addEventListener('ws:contagem.incrementada', (e) => sessoes.aplicaContagem(e.detail));
document.addEventListener('ws:sessao.atualizada', (e) => sessoes.aplicaAtualizacao(e.detail));

async function rerender() {
  const el = renderTV({ sessoes });
  const painel = document.getElementById('painel');
  painel.innerHTML = '';
  painel.appendChild(el);
}
sessoes.subscribe(rerender);
sync.subscribe(() => {
  const slot = document.getElementById('sync-slot');
  slot.innerHTML = '';
  slot.appendChild(SyncBadge(sync.atual().estado));
});

async function bootstrap() {
  try {
    const ativas = await api.get('/sessoes?status=ativa');
    sessoes.carregarAtivas(ativas);
  } catch {}
  try {
    const h = await api.get('/health');
    sync.aplicaHealth(h);
  } catch {}
  rerender();
}
bootstrap();
setInterval(async () => { try { sync.aplicaHealth(await api.get('/health')); } catch {} }, 5000);
