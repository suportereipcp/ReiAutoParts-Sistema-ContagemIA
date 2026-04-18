export function upsertEmbarque(db, e) {
  db.prepare(`
    INSERT INTO embarques (numero_embarque, motorista, placa, data_criacao, numero_nota_fiscal, status, capacidade_maxima, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(numero_embarque) DO UPDATE SET
      motorista = excluded.motorista,
      placa = excluded.placa,
      data_criacao = excluded.data_criacao,
      numero_nota_fiscal = excluded.numero_nota_fiscal,
      status = excluded.status,
      capacidade_maxima = excluded.capacidade_maxima,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(
    e.numero_embarque, e.motorista ?? null, e.placa ?? null,
    e.data_criacao ?? null, e.numero_nota_fiscal ?? null, e.status ?? 'aberto',
    e.capacidade_maxima ?? null, e.atualizado_em ?? null
  );
}

export function buscarEmbarque(db, numero) {
  return db.prepare(`SELECT * FROM embarques WHERE numero_embarque = ?`).get(numero);
}

export function listarEmbarquesAbertos(db) {
  return db.prepare(`SELECT * FROM embarques WHERE status = 'aberto' ORDER BY data_criacao DESC`).all();
}

export function upsertOP(db, op) {
  db.prepare(`
    INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao, quantidade_prevista, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(codigo_op) DO UPDATE SET
      item_codigo = excluded.item_codigo,
      item_descricao = excluded.item_descricao,
      quantidade_prevista = excluded.quantidade_prevista,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(op.codigo_op, op.item_codigo ?? null, op.item_descricao ?? null, op.quantidade_prevista ?? null, op.atualizado_em ?? null);
}

export function buscarOP(db, codigo) {
  return db.prepare(`SELECT * FROM ordens_producao WHERE codigo_op = ?`).get(codigo);
}

export function listarOPs(db, filtro = '') {
  return db.prepare(`
    SELECT * FROM ordens_producao
    WHERE codigo_op LIKE ? OR item_codigo LIKE ? OR item_descricao LIKE ?
    ORDER BY codigo_op LIMIT 100
  `).all(`%${filtro}%`, `%${filtro}%`, `%${filtro}%`);
}

export function upsertOperador(db, o) {
  db.prepare(`
    INSERT INTO operadores (codigo, nome, ativo, atualizado_em, sincronizado_local_em)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(codigo) DO UPDATE SET
      nome = excluded.nome,
      ativo = excluded.ativo,
      atualizado_em = excluded.atualizado_em,
      sincronizado_local_em = datetime('now')
  `).run(o.codigo, o.nome, o.ativo ? 1 : 0, o.atualizado_em ?? null);
}

export function listarOperadoresAtivos(db) {
  return db.prepare(`SELECT * FROM operadores WHERE ativo = 1 ORDER BY nome`).all();
}

export function buscarOperador(db, codigo) {
  return db.prepare(`SELECT * FROM operadores WHERE codigo = ?`).get(codigo);
}

export function lerCursor(db, tabela) {
  const row = db.prepare(`SELECT ultimo_atualizado_em FROM sync_cursor WHERE tabela = ?`).get(tabela);
  return row?.ultimo_atualizado_em ?? null;
}

export function salvarCursor(db, tabela, atualizadoEm) {
  db.prepare(`
    INSERT INTO sync_cursor (tabela, ultimo_atualizado_em, ultimo_poll_em)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(tabela) DO UPDATE SET
      ultimo_atualizado_em = excluded.ultimo_atualizado_em,
      ultimo_poll_em = datetime('now')
  `).run(tabela, atualizadoEm);
}

export function ultimoPoll(db, tabela) {
  const row = db.prepare(`SELECT ultimo_poll_em FROM sync_cursor WHERE tabela = ?`).get(tabela);
  return row?.ultimo_poll_em ?? null;
}
