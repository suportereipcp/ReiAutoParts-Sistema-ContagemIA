const ws = new WebSocket(`ws://${location.host}/ws`);

const estado = { cameras: new Map() };

function render() {
  const el = document.getElementById('painel');
  if (!el) return;
  el.innerHTML = [...estado.cameras.values()].map(c => `
    <div class="camera-card">
      <h2 class="camera-id">Câmera ${c.camera_id}</h2>
      <div class="contagem">${c.quantidade_total ?? 0}</div>
      <div class="meta">
        <span>Operador: ${c.codigo_operador ?? '-'}</span>
        <span>OP: ${c.codigo_op ?? '-'}</span>
      </div>
    </div>
  `).join('');
}

ws.addEventListener('message', (m) => {
  const { evento, payload } = JSON.parse(m.data);
  if (evento === 'contagem.incrementada') {
    const c = estado.cameras.get(payload.camera_id) ?? { camera_id: payload.camera_id };
    c.quantidade_total = payload.quantidade_total;
    estado.cameras.set(payload.camera_id, c);
    render();
  } else if (evento === 'sessao.atualizada') {
    estado.cameras.set(payload.camera_id, payload);
    render();
  } else if (evento === 'sync.status') {
    const badge = document.getElementById('sync-badge');
    if (badge) badge.textContent = payload.estado;
  }
});

async function carregarAtivas() {
  const r = await fetch('/sessoes?status=ativa');
  const ativas = await r.json();
  for (const s of ativas) estado.cameras.set(s.camera_id, s);
  render();
}
carregarAtivas();

async function pollHealth() {
  try {
    const r = await fetch('/health');
    const h = await r.json();
    const badge = document.getElementById('sync-badge');
    if (badge) badge.textContent = h.sync.estado;
  } catch (_) { /* ignore */ }
}
pollHealth();
setInterval(pollHealth, 5000);
