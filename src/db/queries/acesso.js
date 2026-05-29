// --- Grupos ---

export function listarGrupos(db) {
  return db.prepare('SELECT * FROM acesso_grupos ORDER BY nome').all();
}

export function buscarGrupo(db, id) {
  return db.prepare('SELECT * FROM acesso_grupos WHERE id = ?').get(id);
}

export function criarGrupo(db, { id, nome, descricao, criado_em, atualizado_em }) {
  db.prepare(`
    INSERT INTO acesso_grupos (id, nome, descricao, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nome, descricao ?? null, criado_em, atualizado_em);
}

export function atualizarGrupo(db, id, { nome, descricao, atualizado_em }) {
  const campos = [];
  const valores = [];
  if (nome !== undefined) { campos.push('nome = ?'); valores.push(nome); }
  if (descricao !== undefined) { campos.push('descricao = ?'); valores.push(descricao); }
  campos.push('atualizado_em = ?');
  valores.push(atualizado_em);
  valores.push(id);
  db.prepare(`UPDATE acesso_grupos SET ${campos.join(', ')} WHERE id = ?`).run(...valores);
}

export function excluirGrupo(db, id) {
  db.prepare('DELETE FROM acesso_grupos WHERE id = ?').run(id);
}

// --- Atividades de Grupo ---

export function listarAtividadesGrupo(db, grupoId) {
  return db.prepare('SELECT atividade_id FROM acesso_grupo_atividades WHERE grupo_id = ?').all(grupoId)
    .map(r => r.atividade_id);
}

export function definirAtividadesGrupo(db, grupoId, atividadeIds) {
  const del = db.prepare('DELETE FROM acesso_grupo_atividades WHERE grupo_id = ?');
  const ins = db.prepare('INSERT INTO acesso_grupo_atividades (grupo_id, atividade_id) VALUES (?, ?)');
  db.transaction(() => {
    del.run(grupoId);
    for (const aid of atividadeIds) ins.run(grupoId, aid);
  })();
}

// --- Usuários (cache read-only) ---

export function listarUsuarios(db) {
  return db.prepare('SELECT * FROM acesso_usuarios ORDER BY nome').all();
}

export function upsertUsuario(db, { id, email, nome, sincronizado_em }) {
  db.prepare(`
    INSERT INTO acesso_usuarios (id, email, nome, sincronizado_em)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, nome = excluded.nome, sincronizado_em = excluded.sincronizado_em
  `).run(id, email, nome, sincronizado_em);
}

export function upsertUsuariosBatch(db, usuarios) {
  const stmt = db.prepare(`
    INSERT INTO acesso_usuarios (id, email, nome, sincronizado_em)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, nome = excluded.nome, sincronizado_em = excluded.sincronizado_em
  `);
  db.transaction(() => {
    for (const u of usuarios) stmt.run(u.id, u.email, u.nome, u.sincronizado_em);
  })();
}

// --- Grupos do Usuário ---

export function listarGruposUsuario(db, usuarioId) {
  return db.prepare(`
    SELECT g.* FROM acesso_grupos g
    JOIN acesso_usuario_grupos ug ON ug.grupo_id = g.id
    WHERE ug.usuario_id = ?
    ORDER BY g.nome
  `).all(usuarioId);
}

export function definirGruposUsuario(db, usuarioId, grupoIds) {
  const del = db.prepare('DELETE FROM acesso_usuario_grupos WHERE usuario_id = ?');
  const ins = db.prepare('INSERT INTO acesso_usuario_grupos (usuario_id, grupo_id) VALUES (?, ?)');
  db.transaction(() => {
    del.run(usuarioId);
    for (const gid of grupoIds) ins.run(usuarioId, gid);
  })();
}

// --- Overrides ---

export function listarOverrides(db, usuarioId) {
  return db.prepare('SELECT atividade_id, efeito FROM acesso_usuario_overrides WHERE usuario_id = ?').all(usuarioId);
}

export function definirOverrides(db, usuarioId, overrides) {
  const del = db.prepare('DELETE FROM acesso_usuario_overrides WHERE usuario_id = ?');
  const ins = db.prepare('INSERT INTO acesso_usuario_overrides (usuario_id, atividade_id, efeito) VALUES (?, ?, ?)');
  db.transaction(() => {
    del.run(usuarioId);
    for (const ov of overrides) ins.run(usuarioId, ov.atividade_id, ov.efeito);
  })();
}

// --- Atividades efetivas (helper para a rota) ---

export function atividadesDoUsuarioViaGrupos(db, usuarioId) {
  return db.prepare(`
    SELECT DISTINCT ga.atividade_id
    FROM acesso_usuario_grupos ug
    JOIN acesso_grupo_atividades ga ON ga.grupo_id = ug.grupo_id
    WHERE ug.usuario_id = ?
  `).all(usuarioId).map(r => r.atividade_id);
}
