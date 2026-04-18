import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

function coletarSessoesDoEmbarque(db, numeroEmbarque) {
  return db.prepare(`
    SELECT s.*, op.item_descricao, op.item_codigo
      FROM sessoes_contagem s
      LEFT JOIN ordens_producao op ON op.codigo_op = s.codigo_op
     WHERE s.numero_embarque = ?
     ORDER BY s.iniciada_em
  `).all(numeroEmbarque);
}

function formatarCSV(sessoes) {
  const head = 'numero_caixa,codigo_op,item_codigo,item_descricao,quantidade_total,operador,iniciada_em,encerrada_em\n';
  const rows = sessoes.map(s => [
    s.numero_caixa ?? '', s.codigo_op, s.item_codigo ?? '', (s.item_descricao ?? '').replaceAll(',', ';'),
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
  sh.getRow(1).font = { bold: true };
  sessoes.forEach(s => sh.addRow(s));
  return wb.xlsx.writeBuffer();
}

function gerarPDF(sessoes, numeroEmbarque, res) {
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text(`Relatório — Embarque ${numeroEmbarque}`, { align: 'center' });
  doc.moveDown();
  const total = sessoes.reduce((acc, s) => acc + (s.quantidade_total || 0), 0);
  doc.fontSize(10).text(`Total de caixas: ${sessoes.length}    Total de peças: ${total}`);
  doc.moveDown();
  sessoes.forEach(s => {
    doc.fontSize(10).text(
      `Caixa ${s.numero_caixa ?? '-'} | OP ${s.codigo_op} | ${s.item_codigo ?? ''} ${s.item_descricao ?? ''} | Qtd: ${s.quantidade_total} | Op: ${s.codigo_operador}`
    );
  });
  doc.end();
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
    const { raw: res } = reply;
    gerarPDF(sessoes, req.params.numero, res);
    return reply.hijack();
  });
}
