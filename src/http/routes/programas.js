export function rotasProgramas(fastify, { cameraManagers }) {
  fastify.get('/programas', async (req, reply) => {
    const camera = Number(req.query.camera);
    const q = String(req.query.q ?? '');
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `câmera ${camera} desconhecida` });
    if (m.estado === 'desconectada') return reply.code(503).send({ erro: 'câmera desconectada' });
    if (m.programas.size === 0) {
      try { await m.descobrirProgramas(); }
      catch (e) { return reply.code(500).send({ erro: `falha ao descobrir programas: ${e.message}` }); }
    }
    return q ? m.buscarProgramas(q) : [...m.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
  });
}
