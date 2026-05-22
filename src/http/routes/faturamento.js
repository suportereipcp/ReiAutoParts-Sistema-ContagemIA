export function rotasFaturamento(fastify, { faturamentoService }) {
  fastify.get('/faturamento/embarques/:n/reimpressao-massa/preview', async (req) => {
    return faturamentoService.previewMassa(req.params.n);
  });

  fastify.post('/faturamento/embarques/:n/reimpressao-massa', async (req, reply) => {
    const { codigo_operador } = req.body ?? {};
    if (!codigo_operador) return reply.code(400).send({ error: 'codigo_operador obrigatório' });
    return faturamentoService.reimpressaoMassa(req.params.n, codigo_operador);
  });

  fastify.get('/faturamento/embarques/:n/segregadas', async (req) => {
    return faturamentoService.listarSegregadas(req.params.n);
  });

  fastify.post('/faturamento/sessoes/:id/aprovar', async (req, reply) => {
    const { codigo_aprovador } = req.body ?? {};
    if (!codigo_aprovador) return reply.code(400).send({ error: 'codigo_aprovador obrigatório' });
    faturamentoService.aprovarSessao(req.params.id, codigo_aprovador);
    return { ok: true };
  });

  fastify.post('/faturamento/sessoes/:id/reprovar', async (req, reply) => {
    const { codigo_aprovador } = req.body ?? {};
    if (!codigo_aprovador) return reply.code(400).send({ error: 'codigo_aprovador obrigatório' });
    faturamentoService.reprovarSessao(req.params.id, codigo_aprovador);
    return { ok: true };
  });

  fastify.get('/faturamento/embarques/:n/sugestoes-realocacao', async (req) => {
    return faturamentoService.sugerirRealocacoes(req.params.n);
  });

  fastify.post('/faturamento/sessoes/:id/realocar', async (req, reply) => {
    const { embarque_destino } = req.body ?? {};
    if (!embarque_destino) return reply.code(400).send({ error: 'embarque_destino obrigatório' });
    faturamentoService.confirmarRealocacao(req.params.id, embarque_destino);
    return { ok: true };
  });

  fastify.get('/faturamento/aprovadores', async () => faturamentoService.listarAprovadores());

  fastify.post('/faturamento/aprovadores', async (req, reply) => {
    const { codigo, nome } = req.body ?? {};
    if (!codigo || !nome) return reply.code(400).send({ error: 'codigo e nome obrigatórios' });
    faturamentoService.inserirAprovador({ codigo, nome });
    return reply.code(201).send({ ok: true });
  });

  fastify.delete('/faturamento/aprovadores/:codigo', async (req) => {
    faturamentoService.desativarAprovador(req.params.codigo);
    return { ok: true };
  });
}
