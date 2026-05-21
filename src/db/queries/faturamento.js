// src/db/queries/faturamento.js

export function buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT * FROM sessoes_contagem
    WHERE numero_embarque = ?
      AND faturamento_status IN ('pendente_aprovacao', 'reprovada')
    ORDER BY iniciada_em
  `).all(numeroEmbarque);
}

export function listarCaixasElegiveisParaMassa(db, numeroEmbarque) {
  return db.prepare(`
    SELECT DISTINCT numero_caixa
    FROM sessoes_contagem
    WHERE numero_embarque = ?
      AND status = 'encerrada'
      AND numero_caixa NOT IN (
        SELECT numero_caixa FROM sessoes_contagem
        WHERE numero_embarque = ?
          AND faturamento_status IN ('pendente_aprovacao', 'reprovada')
      )
  `).all(numeroEmbarque, numeroEmbarque);
}

export function buscarSessoesDaCaixaEfetiva(db, embarqueEfetivo, numeroCaixa) {
  return db.prepare(`
    SELECT * FROM sessoes_contagem
    WHERE numero_caixa = ?
      AND status = 'encerrada'
      AND (
        (embarque_destino = ?) OR
        (embarque_destino IS NULL AND numero_embarque = ?)
      )
  `).all(numeroCaixa, embarqueEfetivo, embarqueEfetivo);
}

export function buscarAprovador(db, codigo) {
  return db.prepare(`SELECT * FROM aprovadores WHERE codigo = ?`).get(codigo);
}

export function listarAprovadores(db) {
  return db.prepare(`SELECT * FROM aprovadores ORDER BY nome`).all();
}

export function inserirAprovador(db, { codigo, nome }) {
  db.prepare(`
    INSERT INTO aprovadores (codigo, nome, ativo, criado_em)
    VALUES (?, ?, 1, datetime('now'))
  `).run(codigo, nome);
}

export function desativarAprovador(db, codigo) {
  db.prepare(`UPDATE aprovadores SET ativo = 0 WHERE codigo = ?`).run(codigo);
}

export function buscarSessoesReprovadas(db) {
  return db.prepare(`
    SELECT sc.*, op.item_codigo, op.item_descricao
    FROM sessoes_contagem sc
    JOIN ordens_producao op ON sc.codigo_op = op.codigo_op
    WHERE sc.faturamento_status = 'reprovada'
      AND sc.embarque_destino IS NULL
  `).all();
}

export function atualizarFaturamentoStatus(db, sessaoId, { status, aprovada_por = null, aprovada_em = null, embarque_destino = null }) {
  db.prepare(`
    UPDATE sessoes_contagem
    SET faturamento_status = ?,
        aprovada_por = COALESCE(?, aprovada_por),
        aprovada_em  = COALESCE(?, aprovada_em),
        embarque_destino = COALESCE(?, embarque_destino)
    WHERE id = ?
  `).run(status, aprovada_por, aprovada_em, embarque_destino, sessaoId);
}

export function finalizarEmbarque(db, numeroEmbarque, finalizadaEm) {
  db.prepare(`
    UPDATE embarques
    SET finalizada_em = ?, status = 'faturado'
    WHERE numero_embarque = ? AND finalizada_em IS NULL
  `).run(finalizadaEm, numeroEmbarque);
}

export function buscarEmbarque(db, numeroEmbarque) {
  return db.prepare(`SELECT * FROM embarques WHERE numero_embarque = ?`).get(numeroEmbarque);
}

export function listarCaixasRealocadasParaEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT DISTINCT numero_caixa FROM sessoes_contagem
    WHERE embarque_destino = ? AND faturamento_status = 'realocada'
  `).all(numeroEmbarque);
}
