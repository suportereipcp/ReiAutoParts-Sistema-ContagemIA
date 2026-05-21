import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarFaturamentoService } from '../src/domain/faturamento-service.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const f of [
    '001_init.sql', '002_reabrir_caixas.sql',
    '003_etiquetas_caixa.sql', '005_faturamento.sql',
  ]) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', f), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E2', 'aberto')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`INSERT INTO aprovadores (codigo, nome, ativo, criado_em) VALUES ('APROV1', 'Carlos', 1, datetime('now'))`).run();
  return db;
}

function inserirSessaoEncerrada(db, id, extra = {}) {
  const { caixa = 'CX1', faturamento_status = 'regular' } = extra;
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES (?, 'E1', 'OP1', 'A', 1, ?, 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', ?)
  `).run(id, caixa, faturamento_status);
}

test('ciclo completo: NF → finalizar → tardio → aprovar → massa; e reprovado → realocar', async () => {
  const db = criarDb();
  const emitidos = [];
  const svc = criarFaturamentoService({
    db,
    enfileirarSync: () => {},
    registrarEvento: () => {},
    broadcast: () => {},
    caixaLabelService: {
      emitir: async ({ numero_caixa }) => { emitidos.push(numero_caixa); return { partes_total: 1 }; },
    },
    now: () => '2026-05-01T10:00:00.000Z',
  });

  // Sessão regular encerrada antes da NF
  inserirSessaoEncerrada(db, 'sReg', { caixa: 'CX1' });

  // --- Fase 1: NF chega, embarque finaliza ---
  assert.equal(svc.embarqueFinalizado('E1'), false);
  svc.aoReceberNF('E1');
  assert.equal(svc.embarqueFinalizado('E1'), true);

  // --- Encerramento tardio ---
  inserirSessaoEncerrada(db, 'sTardio', { caixa: 'CX2', faturamento_status: 'regular' });
  svc.marcarEncerramentoTardio('sTardio');
  const tardio = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sTardio'`).get();
  assert.equal(tardio.faturamento_status, 'pendente_aprovacao');

  // Preview: CX1 elegível, CX2 não
  const preview = svc.previewMassa('E1');
  assert.equal(preview.caixas, 1);

  // --- Fase 2: Aprovar sTardio ---
  svc.aprovarSessao('sTardio', 'APROV1');
  const aprovada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sTardio'`).get();
  assert.equal(aprovada.faturamento_status, 'aprovada');
  const previewPos = svc.previewMassa('E1');
  assert.equal(previewPos.caixas, 2);

  // --- Massa após aprovação ---
  await svc.reimpressaoMassa('E1', 'A');
  assert.ok(emitidos.includes('CX1'));
  assert.ok(emitidos.includes('CX2'));

  // --- Fase 3: Reprovar e realocar ---
  inserirSessaoEncerrada(db, 'sReprov', { caixa: 'CX3', faturamento_status: 'regular' });
  svc.reprovarSessao('sReprov', 'APROV1');
  const reprovada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sReprov'`).get();
  assert.equal(reprovada.faturamento_status, 'reprovada');

  const sugestoes = svc.sugerirRealocacoes('E2');
  assert.ok(sugestoes.some(s => s.id === 'sReprov'));

  svc.confirmarRealocacao('sReprov', 'E2');
  const realocada = db.prepare(`SELECT * FROM sessoes_contagem WHERE id = 'sReprov'`).get();
  assert.equal(realocada.faturamento_status, 'realocada');
  assert.equal(realocada.embarque_destino, 'E2');

  // Massa do E2 deve incluir a sessão realocada
  const emitidosE2 = [];
  const svcE2 = criarFaturamentoService({
    db,
    enfileirarSync: () => {},
    registrarEvento: () => {},
    broadcast: () => {},
    caixaLabelService: { emitir: async ({ numero_caixa }) => { emitidosE2.push(numero_caixa); return { partes_total: 1 }; } },
    now: () => '2026-05-01T11:00:00.000Z',
  });
  db.prepare(`UPDATE embarques SET numero_nota_fiscal = '99999' WHERE numero_embarque = 'E2'`).run();
  svcE2.aoReceberNF('E2');
  await svcE2.reimpressaoMassa('E2', 'A');
  assert.ok(emitidosE2.includes('CX3'));
});
