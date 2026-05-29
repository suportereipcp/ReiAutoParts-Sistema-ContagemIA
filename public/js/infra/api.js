export function criarApi({ base = '', fetch = globalThis.fetch } = {}) {
  async function request(method, path, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(`${base}${path}`, opts);
    if (!r.ok) {
      let msg;
      try { const b = await r.json(); msg = b.error ?? b.erro ?? r.statusText; }
      catch (_) { msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  }
  const get = (path) => request('GET', path);
  const post = (path, body) => request('POST', path, body);
  const put = (path, body) => request('PUT', path, body);
  const patch = (path, body) => request('PATCH', path, body);
  const del = (path) => request('DELETE', path);
  return { get, post, put, patch, del, delete: del };
}

export const api = criarApi({ base: globalThis.location?.origin ?? '' });
