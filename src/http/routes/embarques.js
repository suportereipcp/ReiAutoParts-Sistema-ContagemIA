import { listarEmbarquesAbertos, buscarEmbarque } from '../../db/queries/espelhos.js';

export function rotasEmbarques(fastify, { db }) {
  fastify.get('/embarques', async (req) => {
    const { status } = req.query;
    if (status === 'aberto') return listarEmbarquesAbertos(db);
    if (status === 'fechado') {
      return db.prepare('SELECT * FROM embarques WHERE status = ? ORDER BY data_criacao DESC LIMIT 200').all('fechado');
    }
    return db.prepare('SELECT * FROM embarques ORDER BY data_criacao DESC LIMIT 200').all();
  });
  fastify.get('/embarques/:numero', async (req, reply) => {
    const e = buscarEmbarque(db, req.params.numero);
    if (!e) return reply.code(404).send({ erro: 'não encontrado' });
    return e;
  });
}
