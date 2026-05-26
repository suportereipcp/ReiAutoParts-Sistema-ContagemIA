import { listarPendentes, marcarSincronizado, marcarFalha } from '../db/queries/outbox.js';

// Erros PERMANENTES não adianta repetir com o mesmo payload — devem virar
// dead-letter (pulados) em vez de abortar o ciclo e prender o sync em OFFLINE:
//   - HTTP 4xx (quando o erro carrega .status);
//   - SQLSTATE do Postgres/Supabase: 22* (data exception), 23* (violação de
//     constraint, ex.: 23514 check_violation), 42* (sintaxe/coluna inexistente);
//   - excesso de tentativas (rede de segurança para erros não classificados).
// Erros TRANSITÓRIOS (5xx, rede) continuam abortando o ciclo para retry depois.
function erroPermanente(e, tentativasAtuais, maxTentativas) {
  if (Number.isInteger(e?.status) && e.status >= 400 && e.status < 500) return true;
  if (typeof e?.code === 'string' && /^(22|23|42)/.test(e.code)) return true;
  if (tentativasAtuais >= maxTentativas) return true;
  return false;
}

export function criarPusher({ db, enviarBatch, logger, batchSize = 100, maxTentativas = 25 }) {
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
            // tentativas já foi incrementado por marcarFalha → item.tentativas + 1
            if (erroPermanente(e, item.tentativas + 1, maxTentativas)) {
              logger.error({ item, err: e }, 'erro permanente — dead-letter (pulando item, não trava o ciclo)');
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
