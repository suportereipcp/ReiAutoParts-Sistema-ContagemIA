import { listarOperadoresAtivos, buscarOperador } from '../../db/queries/espelhos.js';

export function rotasOperadores(fastify, { db }) {
  fastify.get('/operadores', async () => listarOperadoresAtivos(db));
  fastify.get('/operadores/:codigo', async (req, reply) => {
    const op = buscarOperador(db, req.params.codigo);
    if (!op) return reply.code(404).send({ erro: 'não encontrado' });
    return op;
  });
}
