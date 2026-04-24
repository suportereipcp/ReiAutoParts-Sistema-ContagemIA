export function rotasProgramas(fastify, { cameraManagers }) {
  fastify.get('/programas', async (req, reply) => {
    const camera = Number(req.query.camera);
    const q = String(req.query.q ?? '');
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    try {
      return await m.listarProgramas(q);
    } catch (e) {
      return reply.code(500).send({ erro: `falha ao carregar programas da camera ${camera}: ${e.message}` });
    }
  });

  fastify.post('/programas/atualizar', async (req, reply) => {
    const camera = Number(req.body?.camera);
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    try {
      return await m.atualizarProgramas();
    } catch (e) {
      const msg = e.message ?? '';
      if (/sessao ativa/i.test(msg)) return reply.code(409).send({ erro: msg });
      if (/desconectada/i.test(msg)) return reply.code(503).send({ erro: msg });
      return reply.code(500).send({ erro: `falha ao atualizar programas da camera ${camera}: ${msg}` });
    }
  });
}
