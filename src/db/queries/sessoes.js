export function criarSessao(db, dados) {
  const stmt = db.prepare(`
    INSERT INTO sessoes_contagem (
      id, numero_embarque, codigo_op, codigo_operador,
      camera_id, programa_numero, programa_nome,
      iniciada_em, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ativa')
  `);
  stmt.run(
    dados.id, dados.numero_embarque, dados.codigo_op, dados.codigo_operador,
    dados.camera_id, dados.programa_numero ?? null, dados.programa_nome ?? null,
    dados.iniciada_em
  );
  return dados.id;
}

export function buscarAtivaPorCamera(db, cameraId) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem WHERE camera_id = ? AND status = 'ativa'`
  ).get(cameraId);
}

export function incrementarContagem(db, id, delta) {
  db.prepare(
    `UPDATE sessoes_contagem SET quantidade_total = quantidade_total + ? WHERE id = ?`
  ).run(delta, id);
}

export function encerrarSessao(db, id, numeroCaixa, encerradaEm) {
  db.prepare(`
    UPDATE sessoes_contagem
       SET status = 'encerrada',
           numero_caixa = ?,
           encerrada_em = ?
     WHERE id = ?
  `).run(numeroCaixa, encerradaEm, id);
}

export function cancelarSessao(db, id, encerradaEm) {
  db.prepare(`
    UPDATE sessoes_contagem
       SET status = 'cancelada',
           encerrada_em = ?
     WHERE id = ?
  `).run(encerradaEm, id);
}

export function zerarContagem(db, id) {
  db.prepare(`
    UPDATE sessoes_contagem
       SET quantidade_total = 0
     WHERE id = ?
  `).run(id);
}

export function listarAtivas(db) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem WHERE status = 'ativa' ORDER BY camera_id`
  ).all();
}

export function buscarPorId(db, id) {
  return db.prepare(`SELECT * FROM sessoes_contagem WHERE id = ?`).get(id);
}

export function listarPorEmbarque(db, numero_embarque) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem
     WHERE numero_embarque = ?
     ORDER BY iniciada_em DESC`
  ).all(numero_embarque);
}
