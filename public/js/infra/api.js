export function criarApi({ base = '', fetch = globalThis.fetch } = {}) {
  async function get(path) {
    const r = await fetch(`${base}${path}`);
    if (!r.ok) {
      let msg;
      try { const body = await r.json(); msg = body.erro ?? r.statusText; }
      catch (_) { msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  }
  async function post(path, body) {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let msg;
      try { const b = await r.json(); msg = b.erro ?? r.statusText; }
      catch (_) { msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  }
  return { get, post };
}

export const api = criarApi({ base: globalThis.location?.origin ?? '' });
