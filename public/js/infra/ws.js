export function criarWS({ url, WS = globalThis.WebSocket } = {}) {
  const sock = new WS(url);
  sock.addEventListener('message', (m) => {
    let parsed;
    try { parsed = JSON.parse(m.data); } catch { return; }
    if (!parsed?.evento) return;
    document.dispatchEvent(new CustomEvent(`ws:${parsed.evento}`, { detail: parsed.payload }));
  });
  function on(evento, fn) {
    const handler = (e) => fn(e.detail);
    document.addEventListener(`ws:${evento}`, handler);
    return () => document.removeEventListener(`ws:${evento}`, handler);
  }
  return { on, socket: sock };
}
