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
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'aberto', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP2', 'IT2', 'Item 2')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1), ('B', 'Bruno', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total, iniciada_em, encerrada_em, status)
    VALUES
      ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 10, '2026-04-25T08:00:00.000Z', '2026-04-25T09:00:00.000Z', 'encerrada'),
      ('s2', 'E1', 'OP1', 'B', 2, 'CX1', 5,  '2026-04-25T10:00:00.000Z', '2026-04-25T11:00:00.000Z', 'encerrada'),
      ('s3', 'E1', 'OP2', 'A', 1, 'CX1', 7,  '2026-04-25T11:30:00.000Z', '2026-04-25T12:00:00.000Z', 'encerrada')
  `).run();
  return db;
}

test('agrupa documento por produto, soma quantidades e concatena operadores', () => {
  const db = criarDb();
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
    now: () => '2026-04-25T12:00:00.000Z',
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });

  assert.deepEqual(doc.linhas.map((l) => l.item_codigo), ['IT1', 'IT2']);
  assert.deepEqual(doc.linhas.map((l) => l.quantidade_total), [15, 7]);
  assert.deepEqual(doc.linhas[0].operadores, ['A', 'B']);
  assert.deepEqual(doc.linhas[1].operadores, ['A']);
  assert.equal(doc.linhas[0].codigo_op, 'OP1');
  assert.equal(doc.numero_nota_fiscal, '12345');
});

test('cria emissao e partes para reimpressao', async () => {
  const db = criarDb();
  let n = 0;
  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => `id-${++n}`,
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
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
    labelsConfig: { widthDots: 1181, heightDots: 709 },
  });
  assert.throws(() => service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'INEXISTENTE', motivo: 'reimpressao', codigo_operador: 'A' }), /sem historico/);
});

test('montarDocumento reten NF quando caixa tem sessao pendente_aprovacao', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql', '005_faturamento.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'faturado', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', 'pendente_aprovacao')
  `).run();

  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });
  assert.equal(doc.numero_nota_fiscal, null);
});

test('montarDocumento inclui NF quando todas sessoes sao aprovada', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (const file of ['001_init.sql', '002_reabrir_caixas.sql', '003_etiquetas_caixa.sql', '005_faturamento.sql']) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  db.prepare(`INSERT INTO embarques (numero_embarque, status, numero_nota_fiscal) VALUES ('E1', 'faturado', '12345')`).run();
  db.prepare(`INSERT INTO ordens_producao (codigo_op, item_codigo, item_descricao) VALUES ('OP1', 'IT1', 'Item 1')`).run();
  db.prepare(`INSERT INTO operadores (codigo, nome, ativo) VALUES ('A', 'Ana', 1)`).run();
  db.prepare(`
    INSERT INTO sessoes_contagem
      (id, numero_embarque, codigo_op, codigo_operador, camera_id, numero_caixa, quantidade_total,
       iniciada_em, encerrada_em, status, faturamento_status)
    VALUES ('s1', 'E1', 'OP1', 'A', 1, 'CX1', 5,
      '2026-05-01T08:00:00.000Z', '2026-05-01T09:00:00.000Z', 'encerrada', 'aprovada')
  `).run();

  const service = criarCaixaLabelService({
    db,
    gerarUUID: () => 'id',
    renderizar: () => [{ parte_numero: 1, partes_total: 1, payload_zpl: '^XA^XZ' }],
    printQueue: { processarPendentes: async () => {} },
    labelsConfig: { widthDots: 1181, heightDots: 709 },
  });

  const doc = service.montarDocumento({ numero_embarque: 'E1', numero_caixa: 'CX1', motivo: 'reimpressao', codigo_operador: 'A' });
  assert.equal(doc.numero_nota_fiscal, '12345');
});
