import { listar, salvar } from '../../db/queries/cameras-config.js';

export function rotasCamerasConfig(fastify, { db, config }) {
  fastify.get('/cameras/config', async () => {
    return listar(db);
  });

  fastify.put('/cameras/config', async (request, reply) => {
    const body = request.body;

    if (!Array.isArray(body) || body.length === 0 || body.length > 4) {
      return reply.status(400).send({ error: 'Envie um array de 1 a 4 itens.' });
    }

    const cameraIdsValidos = new Set(config.cameras.map(c => c.id));
    const cameraIdsSeen = new Set();
    const slotsSeen = new Set();

    for (const item of body) {
      const slot = Number(item.slot);
      const cameraId = Number(item.camera_id);

      if (!slot || slot < 1 || slot > 4) {
        return reply.status(400).send({ error: `Slot invalido: ${item.slot}. Deve ser 1-4.` });
      }
      if (!cameraIdsValidos.has(cameraId)) {
        return reply.status(400).send({ error: `camera_id ${cameraId} nao existe no sistema.` });
      }
      if (cameraIdsSeen.has(cameraId)) {
        return reply.status(400).send({ error: `camera_id ${cameraId} duplicado.` });
      }
      if (slotsSeen.has(slot)) {
        return reply.status(400).send({ error: `Slot ${slot} duplicado.` });
      }
      cameraIdsSeen.add(cameraId);
      slotsSeen.add(slot);
    }

    const configs = body.map(item => ({
      slot: Number(item.slot),
      camera_id: Number(item.camera_id),
      label: String(item.label ?? '').trim(),
    }));

    const resultado = salvar(db, configs);
    return resultado;
  });
}
