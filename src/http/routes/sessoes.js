export function rotasSessoes(fastify, { sessaoService }) {
  fastify.get('/sessoes', async (req) => {
    const { embarque } = req.query;
    if (embarque) return sessaoService.listarPorEmbarque(embarque);
    return sessaoService.listarAtivas();
  });

  fastify.post('/sessoes', async (req, reply) => {
    try {
      const s = await sessaoService.abrir(req.body);
      return reply.code(201).send(s);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.post('/sessoes/:id/confirmar', async (req, reply) => {
    try {
      const s = await sessaoService.confirmar(req.params.id, req.body);
      return s;
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.post('/sessoes/:id/encerrar', async (req, reply) => {
    try {
      const s = await sessaoService.encerrar(req.params.id, req.body?.numero_caixa);
      return s;
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });
}
