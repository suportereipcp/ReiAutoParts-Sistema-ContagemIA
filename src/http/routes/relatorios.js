import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';

const PREFIXO_CAIXA_SEM_NUMERO = '__SEM_NUMERO__';
const COR_CABECALHO = '4A5F66';
const COR_CABECALHO_ARGB = `FF${COR_CABECALHO}`;
const COR_LINHA_CLARA = 'F3F6F7';
const COR_BORDA = 'D9E1E4';

function coletarSessoesDoEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT s.*, op.item_descricao, op.item_codigo
      FROM sessoes_contagem s
      LEFT JOIN ordens_producao op ON op.codigo_op = s.codigo_op
     WHERE s.numero_embarque = ?
     ORDER BY s.iniciada_em
  `).all(numeroEmbarque);
}

function rotuloCaixa(numeroCaixa) {
  if (!numeroCaixa) return '';
  if (!String(numeroCaixa).startsWith(PREFIXO_CAIXA_SEM_NUMERO)) return numeroCaixa;
  return '';
}

function formatarData(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const seg = String(d.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
  } catch {
    return isoString;
  }
}

function formatarCSV(sessoes, embarque) {
  const mostrarNF = embarque?.status === 'fechado' && embarque?.numero_nota_fiscal;
  const head = 'numero_caixa,codigo_op,item_codigo,item_descricao,quantidade_total,operador,iniciada_em,encerrada_em' + (mostrarNF ? ',numero_nota_fiscal\n' : '\n');
  const rows = sessoes.map(s => {
    const base = [
      rotuloCaixa(s.numero_caixa), s.codigo_op, s.item_codigo ?? '', (s.item_descricao ?? '').replaceAll(',', ';'),
      s.quantidade_total, s.codigo_operador, formatarData(s.iniciada_em), formatarData(s.encerrada_em),
    ];
    if (mostrarNF) {
      base.push(embarque.numero_nota_fiscal);
    }
    return base.join(',');
  }).join('\n');
  return head + rows;
}

async function gerarXLSX(sessoes, numeroEmbarque, embarque) {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet(`Embarque ${numeroEmbarque}`);
  
  const columns = [
    { header: 'Caixa', key: 'numero_caixa', width: 12 },
    { header: 'OP', key: 'codigo_op', width: 12 },
    { header: 'Item', key: 'item_codigo', width: 15 },
    { header: 'Descrição', key: 'item_descricao', width: 40 },
    { header: 'Quantidade', key: 'quantidade_total', width: 12 },
    { header: 'Operador', key: 'codigo_operador', width: 12 },
    { header: 'Início', key: 'iniciada_em', width: 22 },
    { header: 'Fim', key: 'encerrada_em', width: 22 },
  ];

  const mostrarNF = embarque?.status === 'fechado' && embarque?.numero_nota_fiscal;
  if (mostrarNF) {
    columns.push({ header: 'Nota Fiscal', key: 'numero_nota_fiscal', width: 15 });
  }

  sh.columns = columns;

  const header = sh.getRow(1);
  header.height = 22;
  
  // Style header cells individually to prevent leaking infinitely to the right
  for (let i = 1; i <= columns.length; i++) {
    const cell = header.getCell(i);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_CABECALHO_ARGB } };
    cell.border = {
      top: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
      left: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
      bottom: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
      right: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
    };
  }

  sessoes.forEach(s => {
    const rowData = {
      ...s,
      numero_caixa: rotuloCaixa(s.numero_caixa),
      iniciada_em: formatarData(s.iniciada_em),
      encerrada_em: formatarData(s.encerrada_em),
    };
    if (mostrarNF) {
      rowData.numero_nota_fiscal = embarque.numero_nota_fiscal;
    }
    sh.addRow(rowData);
  });

  sh.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    // Style row cells individually to prevent styling leaking infinitely to the right
    for (let i = 1; i <= columns.length; i++) {
      const cell = row.getCell(i);
      cell.alignment = { vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
      };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COR_LINHA_CLARA}` } };
      }
    }
  });
  sh.getColumn('quantidade_total').numFmt = '#,##0';
  sh.views = [{ state: 'frozen', ySplit: 1 }];
  sh.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sh.columns.length },
  };
  return wb.xlsx.writeBuffer();
}

function desenharLinhaTabela(doc, y, colunas, valores, { cabecalho = false, alternada = false } = {}) {
  const altura = cabecalho ? 24 : 30;
  const xInicial = doc.page.margins.left;
  if (cabecalho) {
    doc.rect(xInicial, y, colunas.reduce((acc, c) => acc + c.w, 0), altura).fill(`#${COR_CABECALHO}`);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(8);
  } else {
    if (alternada) {
      doc.rect(xInicial, y, colunas.reduce((acc, c) => acc + c.w, 0), altura).fill(`#${COR_LINHA_CLARA}`);
    }
    doc.fillColor('#253238').font('Helvetica').fontSize(8);
  }

  let x = xInicial;
  colunas.forEach((coluna, index) => {
    doc.text(String(valores[index] ?? ''), x + 6, y + 8, {
      width: coluna.w - 12,
      ellipsis: true,
      align: coluna.align ?? 'left',
    });
    x += coluna.w;
  });
  doc.strokeColor(`#${COR_BORDA}`).lineWidth(0.5).moveTo(xInicial, y + altura).lineTo(xInicial + colunas.reduce((acc, c) => acc + c.w, 0), y + altura).stroke();
  return y + altura;
}

function gerarPDFBuffer(sessoes, numeroEmbarque, embarque) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    const largura = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.rect(doc.page.margins.left, doc.page.margins.top, largura, 74).fill(`#${COR_CABECALHO}`);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text(`Relatório - Embarque ${numeroEmbarque}`, doc.page.margins.left + 18, doc.page.margins.top + 28);

    doc.fillColor('#253238');
    let y = doc.page.margins.top + 96;
    const total = sessoes.reduce((acc, s) => acc + (s.quantidade_total || 0), 0);
    doc.font('Helvetica-Bold').fontSize(10).text(`Total de caixas: ${sessoes.length}`, doc.page.margins.left, y);
    doc.text(`Total de peças: ${total}`, doc.page.margins.left + 150, y);
    if (embarque?.status === 'fechado' && embarque?.numero_nota_fiscal) {
      doc.text(`NF: ${embarque.numero_nota_fiscal}`, doc.page.margins.left, y, {
        width: largura,
        align: 'right',
      });
    }
    y += 30;

    const colunas = [
      { w: 80 },
      { w: 62 },
      { w: 70 },
      { w: 166 },
      { w: 64, align: 'right' },
      { w: 70 },
    ];
    y = desenharLinhaTabela(doc, y, colunas, ['Caixa', 'OP', 'Item', 'Descrição', 'Qtd.', 'Operador'], { cabecalho: true });

    sessoes.forEach((s, index) => {
      if (y > doc.page.height - doc.page.margins.bottom - 34) {
        doc.addPage();
        y = doc.page.margins.top;
        y = desenharLinhaTabela(doc, y, colunas, ['Caixa', 'OP', 'Item', 'Descrição', 'Qtd.', 'Operador'], { cabecalho: true });
      }
      y = desenharLinhaTabela(doc, y, colunas, [
        rotuloCaixa(s.numero_caixa) || '-',
        s.codigo_op,
        s.item_codigo ?? '',
        s.item_descricao ?? '',
        s.quantidade_total,
        s.codigo_operador,
      ], { alternada: index % 2 === 1 });
    });

    doc.end();
  });
}

export function rotasRelatorios(fastify, { db }) {
  fastify.get('/relatorios/embarque/:numero', async (req, reply) => {
    const fmt = String(req.query.fmt ?? 'pdf').toLowerCase();
    const sessoes = coletarSessoesDoEmbarque(db, req.params.numero);
    const embarque = db.prepare('SELECT * FROM embarques WHERE numero_embarque = ?').get(req.params.numero);

    if (fmt === 'csv') {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.csv`);
      return formatarCSV(sessoes, embarque);
    }
    if (fmt === 'xlsx') {
      const buf = await gerarXLSX(sessoes, req.params.numero, embarque);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.xlsx`);
      return reply.send(buf);
    }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.pdf`);
    const buf = await gerarPDFBuffer(sessoes, req.params.numero, embarque);
    return reply.send(buf);
  });
}
