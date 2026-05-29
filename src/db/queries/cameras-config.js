export function listar(db) {
  return db.prepare('SELECT slot, camera_id, label FROM cameras_config ORDER BY slot').all();
}

export function salvar(db, configs) {
  const apagar = db.prepare('DELETE FROM cameras_config');
  const inserir = db.prepare('INSERT INTO cameras_config (slot, camera_id, label) VALUES (?, ?, ?)');
  const transacao = db.transaction((items) => {
    apagar.run();
    for (const item of items) {
      inserir.run(item.slot, item.camera_id, item.label ?? '');
    }
  });
  transacao(configs);
  return listar(db);
}
