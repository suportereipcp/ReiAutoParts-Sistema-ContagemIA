import { listarRecentes } from '../../db/queries/eventos.js';

export function rotasEventos(fastify, { db }) {
  fastify.get('/eventos', async (req) => {
    const nivel = req.query.nivel;
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const todos = listarRecentes(db, limit);
    return nivel ? todos.filter(e => e.nivel === nivel) : todos;
  });
}
