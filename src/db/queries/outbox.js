export function enfileirar(db, tabela, payload) {
  const stmt = db.prepare(
    'INSERT INTO outbox (tabela, payload_json) VALUES (?, ?)'
  );
  const result = stmt.run(tabela, JSON.stringify(payload));
  return result.lastInsertRowid;
}

export function listarPendentes(db, limite = 100) {
  return db.prepare(
    `SELECT id, tabela, payload_json, tentativas FROM outbox
     WHERE sincronizado_em IS NULL
     ORDER BY id LIMIT ?`
  ).all(limite);
}

export function marcarSincronizado(db, id) {
  db.prepare(
    `UPDATE outbox SET sincronizado_em = datetime('now') WHERE id = ?`
  ).run(id);
}

export function marcarFalha(db, id, erro) {
  db.prepare(
    `UPDATE outbox
     SET tentativas = tentativas + 1,
         ultima_tentativa = datetime('now'),
         erro_detalhe = ?
     WHERE id = ?`
  ).run(String(erro).slice(0, 500), id);
}

export function contarPendentes(db) {
  return db.prepare(
    'SELECT COUNT(*) as c FROM outbox WHERE sincronizado_em IS NULL'
  ).get().c;
}
