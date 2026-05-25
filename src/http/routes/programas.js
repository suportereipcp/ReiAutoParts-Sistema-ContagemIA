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

  fastify.post('/programas/selecionar', async (req, reply) => {
    const camera = Number(req.body?.camera);
    const programa = Number(req.body?.programa);
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    if (!Number.isInteger(programa) || programa < 0) {
      return reply.code(400).send({ erro: 'programa inválido' });
    }
    try {
      await m.selecionarPrograma({ programaNumero: programa });
      return { camera, programa };
    } catch (e) {
      const msg = e.message ?? '';
      if (/sessão ativa/i.test(msg)) return reply.code(409).send({ erro: msg });
      if (/desconectada/i.test(msg)) return reply.code(503).send({ erro: msg });
      return reply.code(500).send({ erro: `falha ao selecionar programa na camera ${camera}: ${msg}` });
    }
  });

  fastify.post('/programas/revisar', async (req, reply) => {
    const camera = Number(req.body?.camera);
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    const opcoes = Number.isInteger(req.body?.probeExtra) ? { probeExtra: req.body.probeExtra } : {};
    try {
      return await m.revisarProgramas(opcoes);
    } catch (e) {
      return reply.code(500).send({ erro: `falha ao revisar programas da camera ${camera}: ${e.message}` });
    }
  });
}
