function statusErro(error) {
  const msg = error?.message ?? '';
  if (/nao encontrado|não encontrado/i.test(msg)) return 404;
  if (/sessao de contagem ativa|calibracao ativa|calibração ativa/i.test(msg)) return 409;
  if (/desconectada/i.test(msg)) return 503;
  return 400;
}

export function rotasCalibracao(fastify, { calibracaoService }) {
  fastify.get('/calibracao/programas', async (req, reply) => {
    try {
      const camera = Number(req.query.camera);
      return calibracaoService.listar(camera);
    } catch (error) {
      return reply.code(statusErro(error)).send({ erro: error.message });
    }
  });

  fastify.post('/calibracao/programas/treinar', async (req, reply) => {
    try {
      const camera = Number(req.body?.camera ?? req.body?.camera_id);
      const programas = req.body?.programas;
      const rows = calibracaoService.treinar({ camera_id: camera, programas });
      return reply.code(201).send(rows);
    } catch (error) {
      return reply.code(statusErro(error)).send({ erro: error.message });
    }
  });

  fastify.delete('/calibracao/programas/:id', async (req, reply) => {
    try {
      const ok = calibracaoService.excluir(req.params.id);
      if (!ok) return reply.code(404).send({ erro: `Programa de calibracao ${req.params.id} nao encontrado.` });
      return { ok: true };
    } catch (error) {
      return reply.code(statusErro(error)).send({ erro: error.message });
    }
  });

  fastify.post('/calibracao/programas/:id/executar', async (req, reply) => {
    try {
      return await calibracaoService.executar(req.params.id);
    } catch (error) {
      return reply.code(statusErro(error)).send({ erro: error.message });
    }
  });

  fastify.post('/calibracao/sessoes/encerrar', async (req, reply) => {
    try {
      const camera = Number(req.body?.camera ?? req.body?.camera_id);
      return await calibracaoService.encerrarPorCamera(camera);
    } catch (error) {
      return reply.code(statusErro(error)).send({ erro: error.message });
    }
  });
}
