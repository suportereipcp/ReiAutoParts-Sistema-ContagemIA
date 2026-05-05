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
  const ordem = Number(String(numeroCaixa).slice(PREFIXO_CAIXA_SEM_NUMERO.length));
  return Number.isFinite(ordem) && ordem > 0 ? `Sem número #${ordem}` : 'Sem número';
}

function formatarCSV(sessoes) {
  const head = 'numero_caixa,codigo_op,item_codigo,item_descricao,quantidade_total,operador,iniciada_em,encerrada_em\n';
  const rows = sessoes.map(s => [
    rotuloCaixa(s.numero_caixa), s.codigo_op, s.item_codigo ?? '', (s.item_descricao ?? '').replaceAll(',', ';'),
    s.quantidade_total, s.codigo_operador, s.iniciada_em, s.encerrada_em ?? '',
  ].join(',')).join('\n');
  return head + rows;
}

async function gerarXLSX(sessoes, numeroEmbarque) {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet(`Embarque ${numeroEmbarque}`);
  sh.columns = [
    { header: 'Caixa', key: 'numero_caixa', width: 12 },
    { header: 'OP', key: 'codigo_op', width: 12 },
    { header: 'Item', key: 'item_codigo', width: 15 },
    { header: 'Descrição', key: 'item_descricao', width: 40 },
    { header: 'Quantidade', key: 'quantidade_total', width: 12 },
    { header: 'Operador', key: 'codigo_operador', width: 12 },
    { header: 'Início', key: 'iniciada_em', width: 22 },
    { header: 'Fim', key: 'encerrada_em', width: 22 },
  ];
  const header = sh.getRow(1);
  header.height = 22;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_CABECALHO_ARGB } };
  header.border = {
    top: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
    left: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
    bottom: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
    right: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
  };
  sessoes.forEach(s => sh.addRow({ ...s, numero_caixa: rotuloCaixa(s.numero_caixa) }));
  sh.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: 'middle' };
    row.border = {
      bottom: { style: 'thin', color: { argb: `FF${COR_BORDA}` } },
    };
    if (rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COR_LINHA_CLARA}` } };
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

function gerarPDFBuffer(sessoes, numeroEmbarque) {
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
    doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text(`Relatório - Embarque ${numeroEmbarque}`, doc.page.margins.left + 18, doc.page.margins.top + 16);
    doc.font('Helvetica').fontSize(9).text('Rei AutoParts - Inspeção Silenciosa', doc.page.margins.left + 18, doc.page.margins.top + 44);

    doc.fillColor('#253238');
    let y = doc.page.margins.top + 96;
    const total = sessoes.reduce((acc, s) => acc + (s.quantidade_total || 0), 0);
    doc.font('Helvetica-Bold').fontSize(10).text(`Total de caixas: ${sessoes.length}`, doc.page.margins.left, y);
    doc.text(`Total de peças: ${total}`, doc.page.margins.left + 150, y);
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

    if (fmt === 'csv') {
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.csv`);
      return formatarCSV(sessoes);
    }
    if (fmt === 'xlsx') {
      const buf = await gerarXLSX(sessoes, req.params.numero);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.xlsx`);
      return reply.send(buf);
    }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename=embarque-${req.params.numero}.pdf`);
    const buf = await gerarPDFBuffer(sessoes, req.params.numero);
    return reply.send(buf);
  });
}
