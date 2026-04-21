export function criarSyncState() {
  let state = { estado: 'DESCONHECIDO', outbox_pendentes: 0 };
  const subs = new Set();

  function notifica() { for (const fn of subs) try { fn(state); } catch {} }

  return {
    atual() { return { ...state }; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    aplicaHealth(h) {
      state = { estado: h.sync.estado, outbox_pendentes: h.sync.outbox_pendentes ?? 0 };
      notifica();
    },
    aplicaEventoWS(payload) {
      state = { ...state, estado: payload.estado };
      notifica();
    },
  };
}
