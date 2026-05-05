export function criarEtiquetaCaixa(db, dados) {
  db.prepare(`
    INSERT INTO etiquetas_caixa (
      id, numero_embarque, numero_caixa, sessao_origem_id,
      codigo_operador, motivo, status, partes_total, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)
  `).run(
    dados.id,
    dados.numero_embarque,
    dados.numero_caixa,
    dados.sessao_origem_id ?? null,
    dados.codigo_operador,
    dados.motivo,
    dados.partes_total,
    dados.criada_em
  );
}

export function inserirPartesEtiqueta(db, etiquetaId, partes, criadaEm) {
  const stmt = db.prepare(`
    INSERT INTO etiquetas_caixa_partes (
      id, etiqueta_id, parte_numero, partes_total, payload_zpl, criada_em
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    for (const parte of partes) {
      stmt.run(parte.id, etiquetaId, parte.parte_numero, parte.partes_total, parte.payload_zpl, criadaEm);
    }
  });
  tx();
}

export function buscarEtiquetaPorId(db, id) {
  return db.prepare(`SELECT * FROM etiquetas_caixa WHERE id = ?`).get(id);
}

export function listarEtiquetasDaCaixa(db, numeroEmbarque, numeroCaixa) {
  return db.prepare(`
    SELECT * FROM etiquetas_caixa
     WHERE numero_embarque = ?
       AND numero_caixa = ?
     ORDER BY criada_em DESC
  `).all(numeroEmbarque, numeroCaixa);
}

export function listarPartesPendentes(db, limite = 50) {
  return db.prepare(`
    SELECT p.*, e.numero_embarque, e.numero_caixa
      FROM etiquetas_caixa_partes p
      JOIN etiquetas_caixa e ON e.id = p.etiqueta_id
     WHERE p.status = 'pendente'
     ORDER BY p.criada_em, p.parte_numero
     LIMIT ?
  `).all(limite);
}

export function marcarParteImpressa(db, parteId, impressaEm) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'impressa',
           tentativas = tentativas + 1,
           erro_detalhe = NULL,
           impressa_em = ?
     WHERE id = ?
  `).run(impressaEm, parteId);
}

export function marcarParteErro(db, parteId, erroDetalhe) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'erro',
           tentativas = tentativas + 1,
           erro_detalhe = ?
     WHERE id = ?
  `).run(erroDetalhe, parteId);
}

export function recolocarPartesErroNaFila(db, etiquetaId) {
  db.prepare(`
    UPDATE etiquetas_caixa_partes
       SET status = 'pendente',
           erro_detalhe = NULL
     WHERE etiqueta_id = ?
       AND status = 'erro'
  `).run(etiquetaId);
  db.prepare(`
    UPDATE etiquetas_caixa
       SET status = 'pendente',
           erro_detalhe = NULL
     WHERE id = ?
  `).run(etiquetaId);
}

export function listarPartesDaEtiqueta(db, etiquetaId) {
  return db.prepare(`
    SELECT * FROM etiquetas_caixa_partes
     WHERE etiqueta_id = ?
     ORDER BY parte_numero
  `).all(etiquetaId);
}

export function atualizarStatusEtiquetaPorPartes(db, etiquetaId, impressaEm) {
  const resumo = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) AS erros,
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'impressa' THEN 1 ELSE 0 END) AS impressas,
      COUNT(*) AS total,
      MAX(erro_detalhe) AS erro_detalhe
    FROM etiquetas_caixa_partes
    WHERE etiqueta_id = ?
  `).get(etiquetaId);

  if (resumo.erros > 0) {
    db.prepare(`
      UPDATE etiquetas_caixa
         SET status = 'erro',
             erro_detalhe = ?
       WHERE id = ?
    `).run(resumo.erro_detalhe, etiquetaId);
    return;
  }

  if (resumo.total > 0 && resumo.impressas === resumo.total) {
    db.prepare(`
      UPDATE etiquetas_caixa
         SET status = 'impressa',
             erro_detalhe = NULL,
             impressa_em = ?
       WHERE id = ?
    `).run(impressaEm, etiquetaId);
  }
}
