// src/domain/faturamento-service.js
import {
  buscarSessoesSegregadasPorEmbarque,
  listarCaixasElegiveisParaMassa,
  buscarSessoesDaCaixaEfetiva,
  buscarAprovador,
  listarAprovadores,
  inserirAprovador,
  desativarAprovador,
  buscarSessoesReprovadas,
  atualizarFaturamentoStatus,
  finalizarEmbarque,
  buscarEmbarque,
  listarCaixasRealocadasParaEmbarque,
} from '../db/queries/faturamento.js';

export function criarFaturamentoService({ db, enfileirarSync, registrarEvento, broadcast, caixaLabelService, now = () => new Date().toISOString() }) {

  function embarqueFinalizado(numeroEmbarque) {
    const e = buscarEmbarque(db, numeroEmbarque);
    return Boolean(e?.finalizada_em);
  }

  function aoReceberNF(numeroEmbarque) {
    const e = buscarEmbarque(db, numeroEmbarque);
    if (!e || e.finalizada_em) return;
    finalizarEmbarque(db, numeroEmbarque, now());
    enfileirarSync('embarques_status', { numero_embarque: numeroEmbarque, status: 'faturado' });
    registrarEvento({ tipo: 'SISTEMA', nivel: 'SUCCESS', mensagem: `Embarque ${numeroEmbarque} faturado.` });
    broadcast('embarque.finalizado', { numero_embarque: numeroEmbarque });
  }

  function marcarEncerramentoTardio(sessaoId) {
    atualizarFaturamentoStatus(db, sessaoId, { status: 'pendente_aprovacao' });
    broadcast('sessao.segregada', { sessao_id: sessaoId });
  }

  function caixaElegivel(numeroEmbarque, numeroCaixa) {
    const segregadas = buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque)
      .filter(s => s.numero_caixa === numeroCaixa);
    return segregadas.length === 0;
  }

  function previewMassa(numeroEmbarque) {
    const caixas = listarCaixasElegiveisParaMassa(db, numeroEmbarque);
    const realocadas = listarCaixasRealocadasParaEmbarque(db, numeroEmbarque);
    const todasCaixas = [...new Set([
      ...caixas.map(c => c.numero_caixa),
      ...realocadas.map(c => c.numero_caixa),
    ])];
    let totalEtiquetas = 0;
    for (const caixa of todasCaixas) {
      const sessoes = buscarSessoesDaCaixaEfetiva(db, numeroEmbarque, caixa);
      const itens = new Set(sessoes.map(s => s.codigo_op));
      totalEtiquetas += itens.size;
    }
    return { caixas: todasCaixas.length, etiquetas: totalEtiquetas };
  }

  async function reimpressaoMassa(numeroEmbarque, codigoOperador) {
    const caixas = listarCaixasElegiveisParaMassa(db, numeroEmbarque);
    const realocadas = listarCaixasRealocadasParaEmbarque(db, numeroEmbarque);
    const todasCaixas = [...new Set([
      ...caixas.map(c => c.numero_caixa),
      ...realocadas.map(c => c.numero_caixa),
    ])];

    let totalEtiquetas = 0;
    const caixasPuladas = [];
    for (const caixa of todasCaixas) {
      try {
        const resultado = await caixaLabelService.emitir({
          numero_embarque: numeroEmbarque,
          numero_caixa: caixa,
          motivo: 'reimpressao_massa',
          codigo_operador: codigoOperador,
        });
        totalEtiquetas += resultado.partes_total ?? 1;
      } catch (err) {
        caixasPuladas.push({ caixa, erro: err.message });
      }
    }
    return { etiquetas: totalEtiquetas, caixas: todasCaixas.length, caixas_puladas: caixasPuladas };
  }

  function aprovarSessao(sessaoId, codigoAprovador) {
    const aprov = buscarAprovador(db, codigoAprovador);
    if (!aprov || !aprov.ativo) throw Object.assign(new Error('Aprovador inválido ou inativo.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, {
      status: 'aprovada',
      aprovada_por: codigoAprovador,
      aprovada_em: now(),
    });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.aprovada', { sessao_id: sessaoId });
  }

  function reprovarSessao(sessaoId, codigoAprovador) {
    const aprov = buscarAprovador(db, codigoAprovador);
    if (!aprov || !aprov.ativo) throw Object.assign(new Error('Aprovador inválido ou inativo.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, {
      status: 'reprovada',
      aprovada_por: codigoAprovador,
      aprovada_em: now(),
    });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.reprovada', { sessao_id: sessaoId });
  }

  function sugerirRealocacoes() {
    return buscarSessoesReprovadas(db);
  }

  function confirmarRealocacao(sessaoId, embarqueDestino) {
    const destino = buscarEmbarque(db, embarqueDestino);
    if (!destino) throw Object.assign(new Error('Embarque destino não encontrado.'), { statusCode: 400 });
    if (destino.finalizada_em) throw Object.assign(new Error('Embarque destino já está faturado.'), { statusCode: 400 });
    atualizarFaturamentoStatus(db, sessaoId, { status: 'realocada', embarque_destino: embarqueDestino });
    enfileirarSync('sessoes_contagem', { id: sessaoId });
    broadcast('sessao.realocada', { sessao_id: sessaoId, embarque_destino: embarqueDestino });
  }

  function listarSegregadas(numeroEmbarque) {
    return buscarSessoesSegregadasPorEmbarque(db, numeroEmbarque);
  }

  function listarAprovadoresAll() {
    return listarAprovadores(db);
  }

  function inserirAprovadorNew({ codigo, nome }) {
    return inserirAprovador(db, { codigo, nome });
  }

  function desativarAprovadorFn(codigo) {
    return desativarAprovador(db, codigo);
  }

  function notificarEmbarqueNovo(numeroEmbarqueNovo) {
    const pendentes = buscarSessoesReprovadas(db);
    if (pendentes.length > 0) {
      broadcast('realocacao.sugerida', { embarque_novo: numeroEmbarqueNovo, total: pendentes.length });
    }
  }

  return {
    embarqueFinalizado,
    aoReceberNF,
    marcarEncerramentoTardio,
    caixaElegivel,
    previewMassa,
    reimpressaoMassa,
    aprovarSessao,
    reprovarSessao,
    sugerirRealocacoes,
    confirmarRealocacao,
    listarSegregadas,
    listarAprovadores: listarAprovadoresAll,
    inserirAprovador: inserirAprovadorNew,
    desativarAprovador: desativarAprovadorFn,
    notificarEmbarqueNovo,
  };
}
