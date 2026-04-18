import { openDatabase } from '../src/db/sqlite.js';
import { config } from '../src/config.js';

const db = openDatabase(config.db.path);
const res = db.prepare(`DELETE FROM outbox WHERE sincronizado_em IS NULL`).run();
console.log(`removidos ${res.changes} itens pendentes da outbox`);
db.close();
