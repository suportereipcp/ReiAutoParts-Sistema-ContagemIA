export function criarSessoesState() {
  const porCam = new Map();
  const subs = new Set();
  function notifica() { for (const fn of subs) try { fn([...porCam.values()]); } catch {} }
  return {
    carregarAtivas(list) {
      porCam.clear();
      for (const s of list) porCam.set(s.camera_id, s);
      notifica();
    },
    aplicaContagem({ camera_id, sessao_id, quantidade_total }) {
      const atual = porCam.get(camera_id);
      if (!atual || atual.id !== sessao_id) return;
      porCam.set(camera_id, { ...atual, quantidade_total });
      notifica();
    },
    aplicaAtualizacao(sessao) {
      porCam.set(sessao.camera_id, sessao);
      notifica();
    },
    porCamera(id) { return porCam.get(id); },
    todas() { return [...porCam.values()]; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
