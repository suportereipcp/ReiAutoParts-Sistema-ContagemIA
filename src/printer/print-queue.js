import {
  listarPartesPendentes,
  marcarParteImpressa,
  marcarParteErro,
  atualizarStatusEtiquetaPorPartes,
} from '../db/queries/etiquetas.js';

export function criarPrintQueue({ db, transport, now = () => new Date().toISOString(), logger } = {}) {
  async function processarPendentes({ limite = 50 } = {}) {
    const partes = listarPartesPendentes(db, limite);
    for (const parte of partes) {
      try {
        await transport.enviar(parte.payload_zpl, parte);
        const instante = now();
        marcarParteImpressa(db, parte.id, instante);
        atualizarStatusEtiquetaPorPartes(db, parte.etiqueta_id, instante);
      } catch (e) {
        marcarParteErro(db, parte.id, e.message);
        atualizarStatusEtiquetaPorPartes(db, parte.etiqueta_id, now());
        logger?.warn?.({ err: e, parteId: parte.id }, 'falha ao imprimir etiqueta');
      }
    }
  }

  return { processarPendentes };
}
