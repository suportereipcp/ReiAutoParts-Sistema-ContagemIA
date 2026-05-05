const ORDEM_TAMANHOS = `
  CASE tamanho
    WHEN 'nano' THEN 1
    WHEN 'small' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END
`;

export function listarProgramasCalibracao(db, cameraId) {
  return db.prepare(`
    SELECT *
      FROM programas_calibracao
     WHERE camera_id = ?
     ORDER BY ${ORDEM_TAMANHOS}
  `).all(Number(cameraId));
}

export function buscarProgramaCalibracao(db, id) {
  return db.prepare(`
    SELECT *
      FROM programas_calibracao
     WHERE id = ?
  `).get(id) ?? null;
}

export function excluirProgramaCalibracao(db, id) {
  const result = db.prepare(`
    DELETE FROM programas_calibracao
     WHERE id = ?
  `).run(id);
  return result.changes > 0;
}

export function proximaVersaoCalibracao(db, cameraId) {
  const row = db.prepare(`
    SELECT COALESCE(MAX(versao), 0) + 1 AS versao
      FROM programas_calibracao
     WHERE camera_id = ?
  `).get(Number(cameraId));
  return Number(row?.versao ?? 1);
}

export function salvarCicloCalibracao(db, { camera_id, versao, treinado_em, programas }) {
  const tx = db.transaction((dados) => {
    db.prepare(`
      DELETE FROM programas_calibracao
       WHERE camera_id = ?
    `).run(Number(dados.camera_id));

    const insert = db.prepare(`
      INSERT INTO programas_calibracao (
        id, camera_id, tamanho, programa_numero, programa_nome,
        modelo_path, versao, treinado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const programa of dados.programas) {
      insert.run(
        programa.id,
        Number(dados.camera_id),
        programa.tamanho,
        Number(programa.programa_numero),
        programa.programa_nome,
        programa.modelo_path ?? null,
        Number(dados.versao),
        dados.treinado_em,
        dados.treinado_em,
      );
    }
  });

  tx({ camera_id, versao, treinado_em, programas });
  return listarProgramasCalibracao(db, camera_id);
}
