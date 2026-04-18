import {
  upsertEmbarque, upsertOP, upsertOperador,
  lerCursor, salvarCursor,
} from '../db/queries/espelhos.js';

const TABELAS = [
  { nome: 'embarques', upsert: upsertEmbarque },
  { nome: 'ordens_producao', upsert: upsertOP },
  { nome: 'operadores', upsert: upsertOperador },
];

export function criarPoller({ db, buscarAlteracoes, logger }) {
  return {
    async tick() {
      for (const { nome, upsert } of TABELAS) {
        const cursor = lerCursor(db, nome);
        const registros = await buscarAlteracoes(nome, cursor);
        if (registros.length === 0) {
          salvarCursor(db, nome, cursor);
          continue;
        }
        const tx = db.transaction((rows) => {
          for (const r of rows) upsert(db, r);
        });
        tx(registros);
        const maior = registros.reduce((acc, r) => r.atualizado_em > acc ? r.atualizado_em : acc, cursor ?? '');
        salvarCursor(db, nome, maior);
        logger.info({ tabela: nome, total: registros.length }, 'poller sincronizou');
      }
    },
  };
}
