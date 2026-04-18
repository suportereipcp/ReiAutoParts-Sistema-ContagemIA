import { listarEmbarquesAbertos, buscarEmbarque } from '../../db/queries/espelhos.js';

export function rotasEmbarques(fastify, { db }) {
  fastify.get('/embarques', async (req) => {
    const { status = 'aberto' } = req.query;
    if (status === 'aberto') return listarEmbarquesAbertos(db);
    return db.prepare('SELECT * FROM embarques ORDER BY data_criacao DESC LIMIT 200').all();
  });
  fastify.get('/embarques/:numero', async (req, reply) => {
    const e = buscarEmbarque(db, req.params.numero);
    if (!e) return reply.code(404).send({ erro: 'não encontrado' });
    return e;
  });
}
