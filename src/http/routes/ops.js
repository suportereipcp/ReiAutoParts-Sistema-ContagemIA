import { listarOPs, buscarOP } from '../../db/queries/espelhos.js';

export function rotasOPs(fastify, { db }) {
  fastify.get('/ops', async (req) => {
    const q = String(req.query.q ?? '');
    return listarOPs(db, q);
  });
  fastify.get('/ops/:codigo', async (req, reply) => {
    const op = buscarOP(db, req.params.codigo);
    if (!op) return reply.code(404).send({ erro: 'não encontrada' });
    return op;
  });
}
