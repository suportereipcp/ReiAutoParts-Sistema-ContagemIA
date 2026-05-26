import { buscarImagemCamera } from '../../camera/live-image.js';

export function rotasCameras(fastify, { cameras, buscarImagem = buscarImagemCamera }) {
  const porId = new Map(cameras.map((c) => [c.id, c]));

  fastify.get('/cameras/:id/live-image', async (req, reply) => {
    const id = Number(req.params.id);
    const cam = porId.get(id);
    if (!cam) return reply.code(404).send({ erro: `camera ${id} desconhecida` });
    try {
      const buf = await buscarImagem(cam);
      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Cache-Control', 'no-store')
        .send(buf);
    } catch (e) {
      return reply.code(503).send({ erro: `imagem indisponível para camera ${id}: ${e.message}` });
    }
  });
}
