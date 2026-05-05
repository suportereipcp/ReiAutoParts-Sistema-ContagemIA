import { listarEtiquetasDaCaixa, recolocarPartesErroNaFila, buscarEtiquetaPorId } from '../../db/queries/etiquetas.js';

export function rotasEtiquetas(fastify, { db, caixaLabelService, printQueue, etiquetasQueries } = {}) {
  const queries = etiquetasQueries ?? {
    listarEtiquetasDaCaixa: (numeroEmbarque, numeroCaixa) => listarEtiquetasDaCaixa(db, numeroEmbarque, numeroCaixa),
    retryEtiqueta: async (id) => {
      recolocarPartesErroNaFila(db, id);
      await printQueue?.processarPendentes();
      return buscarEtiquetaPorId(db, id);
    },
  };

  fastify.post('/etiquetas/caixas', async (req, reply) => {
    try {
      const { numero_embarque, numero_caixa, codigo_operador } = req.body ?? {};
      if (!numero_embarque || !numero_caixa || !codigo_operador) {
        return reply.code(400).send({ erro: 'numero_embarque, numero_caixa e codigo_operador são obrigatórios.' });
      }
      const etiqueta = await caixaLabelService.reimprimir({ numero_embarque, numero_caixa, codigo_operador });
      return reply.code(201).send(etiqueta);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });

  fastify.get('/etiquetas/caixas', async (req, reply) => {
    const { embarque, caixa } = req.query;
    if (!embarque || !caixa) return reply.code(400).send({ erro: 'embarque e caixa são obrigatórios.' });
    return queries.listarEtiquetasDaCaixa(embarque, caixa);
  });

  fastify.post('/etiquetas/:id/retry', async (req, reply) => {
    try {
      return await queries.retryEtiqueta(req.params.id);
    } catch (e) {
      return reply.code(400).send({ erro: e.message });
    }
  });
}
