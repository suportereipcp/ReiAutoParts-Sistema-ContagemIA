const API = location.origin;
const ws = new WebSocket(`ws://${location.host}/ws`);

ws.addEventListener('message', (m) => {
  const { evento, payload } = JSON.parse(m.data);
  document.dispatchEvent(new CustomEvent(`ws:${evento}`, { detail: payload }));
});

export async function apiGet(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}
export async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ erro: r.statusText }));
    throw new Error(err.erro || r.statusText);
  }
  return r.json();
}

export async function carregarEmbarquesAbertos() { return apiGet('/embarques?status=aberto'); }
export async function buscarOPs(q) { return apiGet(`/ops?q=${encodeURIComponent(q)}`); }
export async function carregarOperadores() { return apiGet('/operadores'); }
export async function buscarProgramas(cameraId, q) { return apiGet(`/programas?camera=${cameraId}&q=${encodeURIComponent(q)}`); }

export async function abrirSessao(form) { return apiPost('/sessoes', form); }
export async function confirmarSessao(id, programa) { return apiPost(`/sessoes/${id}/confirmar`, programa); }
export async function encerrarSessao(id, numeroCaixa) { return apiPost(`/sessoes/${id}/encerrar`, { numero_caixa: numeroCaixa }); }

async function atualizarHealth() {
  try {
    const h = await apiGet('/health');
    document.dispatchEvent(new CustomEvent('health', { detail: h }));
  } catch (_) { /* ignore */ }
}
setInterval(atualizarHealth, 5000);
atualizarHealth();
