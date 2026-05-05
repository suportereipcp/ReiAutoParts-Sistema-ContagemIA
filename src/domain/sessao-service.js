import {
  criarSessao,
  buscarAtivaPorCamera,
  buscarPorId,
  cancelarSessao,
  encerrarSessao,
  listarAtivas,
  listarPorCaixaNoEmbarque,
  listarPorEmbarque,
  zerarContagem,
} from '../db/queries/sessoes.js';
import { buscarEmbarque, buscarOP, buscarOperador } from '../db/queries/espelhos.js';

const PREFIXO_CAIXA_SEM_NUMERO = '__SEM_NUMERO__';

export function criarSessaoService({ db, cameraManagers, registrarEvento, enfileirarSync, gerarUUID, broadcast, caixaLabelService }) {
  function _ehCaixaSemNumero(numeroCaixa) {
    return String(numeroCaixa ?? '').startsWith(PREFIXO_CAIXA_SEM_NUMERO);
  }

  function _rotuloCaixa(numeroCaixa) {
    if (!numeroCaixa) return '-';
    if (!_ehCaixaSemNumero(numeroCaixa)) return numeroCaixa;
    const ordem = Number(String(numeroCaixa).slice(PREFIXO_CAIXA_SEM_NUMERO.length));
    return Number.isFinite(ordem) && ordem > 0 ? `Sem número #${ordem}` : 'Sem número';
  }

  function _normalizarPayloadEncerramento(payload) {
    if (typeof payload === 'string') return { numero_caixa: payload };
    return payload ?? {};
  }

  function _criarNovaCaixaSemNumero(numeroEmbarque) {
    const existentes = db.prepare(`
      SELECT DISTINCT numero_caixa
        FROM sessoes_contagem
       WHERE numero_embarque = ?
         AND numero_caixa LIKE ?
    `).all(numeroEmbarque, `${PREFIXO_CAIXA_SEM_NUMERO}%`);
    const proximo = existentes.reduce((maior, row) => {
      const atual = Number(String(row.numero_caixa).slice(PREFIXO_CAIXA_SEM_NUMERO.length));
      return Number.isFinite(atual) ? Math.max(maior, atual) : maior;
    }, 0) + 1;
    return `${PREFIXO_CAIXA_SEM_NUMERO}${String(proximo).padStart(3, '0')}`;
  }

  function _resolverCaixaId(sessao, payload) {
    if (payload.caixa_id && String(payload.caixa_id).trim()) return String(payload.caixa_id).trim();
    if (payload.criar_caixa_sem_numero) return _criarNovaCaixaSemNumero(sessao.numero_embarque);
    if (payload.numero_caixa && String(payload.numero_caixa).trim()) return String(payload.numero_caixa).trim();
    throw new Error('Caixa obrigatória.');
  }

  function _validarCompatibilidadeCaixa(sessao, caixaId) {
    const existentes = listarPorCaixaNoEmbarque(db, sessao.numero_embarque, caixaId).filter((row) => row.id !== sessao.id);
    if (existentes.length === 0) return;
    const conflito = existentes.find((row) => row.codigo_op !== sessao.codigo_op);
    if (conflito) throw new Error(`Caixa ${_rotuloCaixa(caixaId)} já vinculada a outra OP neste embarque.`);
  }

  function _validarPreRequisitos({ numero_embarque, codigo_op, codigo_operador }) {
    const e = buscarEmbarque(db, numero_embarque);
    if (!e) throw new Error(`Embarque ${numero_embarque} não encontrado. Aguarde sincronização com ERP.`);
    if (e.status === 'fechado') throw new Error(`Embarque ${numero_embarque} está fechado.`);
    const op = buscarOP(db, codigo_op);
    if (!op) throw new Error(`OP ${codigo_op} não encontrada.`);
    const op2 = buscarOperador(db, codigo_operador);
    if (!op2 || !op2.ativo) throw new Error(`Operador ${codigo_operador} inválido.`);
  }

  async function abrir({ numero_embarque, codigo_op, codigo_operador, camera_id }) {
    _validarPreRequisitos({ numero_embarque, codigo_op, codigo_operador });
    const cam = cameraManagers.get(camera_id);
    if (!cam) throw new Error(`Câmera ${camera_id} desconhecida.`);
    if (cam.estado === 'desconectada') throw new Error(`Câmera ${camera_id} desconectada.`);
    const atual = buscarAtivaPorCamera(db, camera_id);
    if (atual) throw new Error(`Camera ${camera_id} esta com sessao ativa. Encerre a sessao antes de continuar.`);

    const id = gerarUUID();
    const iniciadaEm = new Date().toISOString();
    criarSessao(db, { id, numero_embarque, codigo_op, codigo_operador, camera_id, iniciada_em: iniciadaEm });
    registrarEvento({ nivel: 'INFO', categoria: 'SESSAO', mensagem: `Sessão ${id} aberta na câmera ${camera_id}`, codigo_operador });
    broadcast('sessao.atualizada', { id, camera_id, status: 'ativa-sem-programa' });
    return buscarPorId(db, id);
  }

  async function confirmar(sessaoId, { programaNumero, programaNome }) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} não está ativa.`);
    const cam = cameraManagers.get(s.camera_id);
    if (!cam) throw new Error(`Câmera ${s.camera_id} indisponível.`);
    await cam.ativarSessao({ programaNumero });
    db.prepare(`UPDATE sessoes_contagem SET programa_numero = ?, programa_nome = ? WHERE id = ?`)
      .run(programaNumero, programaNome, sessaoId);
    const atualizada = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', atualizada);
    registrarEvento({ nivel: 'INFO', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} confirmada com programa ${programaNumero} (${programaNome})`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', atualizada);
    return atualizada;
  }

  async function encerrar(sessaoId, payloadInput) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} já encerrada.`);
    const payload = _normalizarPayloadEncerramento(payloadInput);
    const caixaId = _resolverCaixaId(s, payload);
    _validarCompatibilidadeCaixa(s, caixaId);

    const cam = cameraManagers.get(s.camera_id);
    if (cam) await cam.encerrarSessao();
    const encerradaEm = new Date().toISOString();
    encerrarSessao(db, sessaoId, caixaId, encerradaEm);
    const final = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', final);
    registrarEvento({ nivel: 'SUCCESS', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} encerrada (caixa ${_rotuloCaixa(caixaId)}, total ${final.quantidade_total})`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', final);

    let etiqueta = null;
    if (caixaLabelService?.emitirPorEncerramento) {
      try {
        etiqueta = await caixaLabelService.emitirPorEncerramento(final);
      } catch (e) {
        etiqueta = { status: 'erro', erro: e.message, partes_total: 0 };
        registrarEvento({
          nivel: 'WARN',
          categoria: 'SISTEMA',
          mensagem: `Etiqueta da caixa ${_rotuloCaixa(caixaId)} não impressa: ${e.message}`,
          codigo_operador: s.codigo_operador,
        });
      }
    }
    return { sessao: final, etiqueta };
  }

  async function reiniciarContagem(sessaoId) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} não está ativa.`);
    const cam = cameraManagers.get(s.camera_id);
    if (!cam?.reiniciarContagem) throw new Error(`Câmera ${s.camera_id} indisponível.`);
    await cam.reiniciarContagem();
    zerarContagem(db, sessaoId);
    const atualizada = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', atualizada);
    registrarEvento({ nivel: 'INFO', categoria: 'SESSAO', mensagem: `Contagem da sessão ${sessaoId} reiniciada`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', atualizada);
    return atualizada;
  }

  async function reiniciarSessao(sessaoId) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} não está ativa.`);
    const cam = cameraManagers.get(s.camera_id);
    if (cam) await cam.encerrarSessao();
    const encerradaEm = new Date().toISOString();
    cancelarSessao(db, sessaoId, encerradaEm);
    const final = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', final);
    registrarEvento({ nivel: 'WARN', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} reiniciada e marcada como cancelada`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', final);
    return final;
  }

  function listarAtivasSnapshot() { return listarAtivas(db); }
  function listarPorEmbarqueSnapshot(numero) { return listarPorEmbarque(db, numero); }

  return {
    abrir,
    confirmar,
    encerrar,
    reiniciarContagem,
    reiniciarSessao,
    listarAtivas: listarAtivasSnapshot,
    listarPorEmbarque: listarPorEmbarqueSnapshot,
  };
}
