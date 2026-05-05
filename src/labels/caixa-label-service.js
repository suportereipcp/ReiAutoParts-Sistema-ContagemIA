import { criarEtiquetaCaixa, inserirPartesEtiqueta, buscarEtiquetaPorId } from '../db/queries/etiquetas.js';
import { rotuloCaixa } from '../../public/js/domain/caixas.js';

function resumir(etiqueta) {
  if (!etiqueta) return null;
  return {
    id: etiqueta.id,
    status: etiqueta.status,
    partes_total: etiqueta.partes_total,
    erro_detalhe: etiqueta.erro_detalhe ?? null,
  };
}

export function criarCaixaLabelService({
  db,
  gerarUUID,
  renderizar,
  printQueue,
  labelsConfig,
  now = () => new Date().toISOString(),
  enfileirarSync,
} = {}) {
  function montarDocumento({ numero_embarque, numero_caixa, motivo, codigo_operador }) {
    const sessoes = db.prepare(`
      SELECT s.*, op.item_codigo, op.item_descricao
        FROM sessoes_contagem s
        LEFT JOIN ordens_producao op ON op.codigo_op = s.codigo_op
       WHERE s.numero_embarque = ?
         AND s.numero_caixa = ?
         AND s.status = 'encerrada'
       ORDER BY s.encerrada_em ASC, s.iniciada_em ASC
    `).all(numero_embarque, numero_caixa);

    if (sessoes.length === 0) throw new Error('Caixa sem historico encerrado para etiqueta.');

    return {
      numero_embarque,
      numero_caixa,
      numero_caixa_exibicao: rotuloCaixa(numero_caixa),
      gerada_em: now(),
      motivo,
      operador_emissao: codigo_operador,
      linhas: sessoes.map((sessao, index) => ({
        ordem: index + 1,
        sessao_id: sessao.id,
        codigo_op: sessao.codigo_op,
        item_codigo: sessao.item_codigo,
        item_descricao: sessao.item_descricao,
        quantidade_total: sessao.quantidade_total,
        codigo_operador: sessao.codigo_operador,
        iniciada_em: sessao.iniciada_em,
        encerrada_em: sessao.encerrada_em,
      })),
    };
  }

  async function emitir({ numero_embarque, numero_caixa, sessao_origem_id = null, codigo_operador, motivo }) {
    const documento = montarDocumento({ numero_embarque, numero_caixa, motivo, codigo_operador });
    const partes = renderizar(documento, {
      linhasPorParte: labelsConfig.linesPerPart,
      larguraDots: labelsConfig.widthDots,
      alturaDots: labelsConfig.heightDots,
    });
    const etiquetaId = gerarUUID();
    const criadaEm = documento.gerada_em;
    const partesComId = partes.map((parte) => ({ ...parte, id: gerarUUID() }));

    criarEtiquetaCaixa(db, {
      id: etiquetaId,
      numero_embarque,
      numero_caixa,
      sessao_origem_id,
      codigo_operador,
      motivo,
      partes_total: partes.length,
      criada_em: criadaEm,
    });
    inserirPartesEtiqueta(db, etiquetaId, partesComId, criadaEm);

    if (enfileirarSync) {
      enfileirarSync('etiquetas_caixa', buscarEtiquetaPorId(db, etiquetaId));
      for (const parte of partesComId) {
        enfileirarSync('etiquetas_caixa_partes', {
          id: parte.id,
          etiqueta_id: etiquetaId,
          parte_numero: parte.parte_numero,
          partes_total: parte.partes_total,
          payload_zpl: parte.payload_zpl,
          status: 'pendente',
          tentativas: 0,
          erro_detalhe: null,
          criada_em: criadaEm,
          impressa_em: null,
        });
      }
    }

    await printQueue.processarPendentes();
    return resumir(buscarEtiquetaPorId(db, etiquetaId));
  }

  function emitirPorEncerramento(sessao) {
    return emitir({
      numero_embarque: sessao.numero_embarque,
      numero_caixa: sessao.numero_caixa,
      sessao_origem_id: sessao.id,
      codigo_operador: sessao.codigo_operador,
      motivo: 'encerramento',
    });
  }

  function reimprimir({ numero_embarque, numero_caixa, codigo_operador }) {
    return emitir({ numero_embarque, numero_caixa, codigo_operador, motivo: 'reimpressao' });
  }

  return { montarDocumento, emitir, emitirPorEncerramento, reimprimir };
}
