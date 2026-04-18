import { contarPendentes } from '../../db/queries/outbox.js';
import { ultimoPoll } from '../../db/queries/espelhos.js';

export function rotaHealth(fastify, { db, syncWorker, cameraManagers }) {
  fastify.get('/health', async () => {
    const cameras = [];
    for (const [id, m] of cameraManagers) {
      cameras.push({ id, estado: m.estado });
    }
    return {
      status: 'ok',
      sync: {
        estado: syncWorker.estado,
        outbox_pendentes: contarPendentes(db),
        ultimo_poll_embarques: ultimoPoll(db, 'embarques'),
      },
      cameras,
      uptime_s: Math.round(process.uptime()),
    };
  });
}
