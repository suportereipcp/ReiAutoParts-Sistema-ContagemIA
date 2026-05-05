import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { criarCaixaLabelService } from '../src/labels/caixa-label-service.js';
import { buscarEtiquetaPorId, listarEtiquetasDaCaixa } from '../src/db/queries/etiquetas.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status) VALUES ('E1', 'aberto')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1), ('B', 'Bruno', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total, iniciada_em, encerrada_em, status)
    VALUES
      ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 10, '2026-04-25T08:00:00.000Z', '2026-04-25T09:00:00.000Z', 'encerrada'),
      ('s2', 'E1', 'OP1', 'B', 2, 'CX1', 5, '2026-04-25T10:00:00.000Z', '2026-04-25T11:00:00.000Z', 'encerrada')
  `).run();
  return db;
}

test('monta documento logico em ordem cronologica', () => {
  const db = criarDb();
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { linesPerPart: 10, widthDots: 812, heightDots: 609 },
    now: () => '2026-04-25T12:00:00.000Z',
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });

  assert.deepEqual(doc.linhas.map((l) => l.sessao_id), ['s1', 's2']);
  assert.deepEqual(doc.linhas.map((l) => l.ordem), [1, 2]);
});

test('cria emissao e partes para reimpressao', async () => {
  const db = criarDb();
  let n = 0;
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => `id-${++n}`,
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { linesPerPart: 10, widthDots: 812, heightDots: 609 },
    now: () => '2026-04-25T12:00:00.000Z',
  });

  const resumo = await service.reimprimir({ numero_embarque: 'E1', numero_caixa: 'CX1', codigo_operador: 'A' });

  assert.equal(resumo.status, 'pendente');
  assert.equal(resumo.partes_total, 1);
  assert.equal(buscarEtiquetaPorId(db, resumo.id).motivo, 'reimpressao');
  assert.equal(listarEtiquetasDaCaixa(db, 'E1', 'CX1').length, 1);
});

test('falha quando caixa nao tem sessoes encerradas', () => {
  const db = criarDb();
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { linesPerPart: 10, widthDots: 812, heightDots: 609 },
  });
  assert.throws(() => service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'INEXISTENTE', motivo: 'reimpressao', codigo_operador: 'A' }), /sem historico/);
});
