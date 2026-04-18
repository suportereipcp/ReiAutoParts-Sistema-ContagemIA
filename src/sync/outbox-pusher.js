import { listarPendentes, marcarSincronizado, marcarFalha } from '../db/queries/outbox.js';

export function criarPusher({ db, enviarBatch, logger, batchSize = 100 }) {
  return {
    async drenar() {
      const deadIds = new Set();
      while (true) {
        const pend = listarPendentes(db, batchSize).filter(i => !deadIds.has(i.id));
        if (pend.length === 0) return;
        for (const item of pend) {
          try {
            await enviarBatch({ tabela: item.tabela, payload: JSON.parse(item.payload_json) });
            marcarSincronizado(db, item.id);
          } catch (e) {
            marcarFalha(db, item.id, e.message);
            if (e.status >= 400 && e.status < 500) {
              logger.error({ item, err: e }, 'erro 4xx — dead-letter');
              deadIds.add(item.id);
              continue;
            }
            logger.warn({ err: e }, 'falha transitória no push, abortando ciclo');
            throw e;
          }
        }
      }
    },
  };
}
