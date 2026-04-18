export function registrarEvento(db, { nivel, categoria, mensagem, codigo_operador = null, timestamp }) {
  const stmt = db.prepare(`
    INSERT INTO eventos_log (timestamp, nivel, categoria, mensagem, codigo_operador)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(timestamp ?? new Date().toISOString(), nivel, categoria, mensagem, codigo_operador);
  return result.lastInsertRowid;
}

export function listarRecentes(db, limite = 100) {
  return db.prepare(
    `SELECT * FROM eventos_log ORDER BY id_local DESC LIMIT ?`
  ).all(limite);
}

export function buscarPorIdLocal(db, idLocal) {
  return db.prepare(`SELECT * FROM eventos_log WHERE id_local = ?`).get(idLocal);
}
