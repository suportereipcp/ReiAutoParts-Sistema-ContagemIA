import { criarSessao, buscarAtivaPorCamera, buscarPorId, cancelarSessao, encerrarSessao, listarAtivas, listarPorEmbarque, zerarContagem } from '../db/queries/sessoes.js';
import { buscarEmbarque, buscarOP, buscarOperador } from '../db/queries/espelhos.js';

export function criarSessaoService({ db, cameraManagers, registrarEvento, enfileirarSync, gerarUUID, broadcast }) {
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

  async function encerrar(sessaoId, numeroCaixa) {
    const s = buscarPorId(db, sessaoId);
    if (!s) throw new Error(`Sessão ${sessaoId} não existe.`);
    if (s.status !== 'ativa') throw new Error(`Sessão ${sessaoId} já encerrada.`);
    if (!numeroCaixa || !String(numeroCaixa).trim()) throw new Error('Número da caixa obrigatório.');
    const existe = db.prepare(
      `SELECT id FROM sessoes_contagem WHERE numero_embarque = ? AND numero_caixa = ? AND id != ?`
    ).get(s.numero_embarque, numeroCaixa, sessaoId);
    if (existe) throw new Error(`Caixa duplicada: já existe sessão com caixa ${numeroCaixa} no embarque ${s.numero_embarque}.`);

    const cam = cameraManagers.get(s.camera_id);
    if (cam) await cam.encerrarSessao();
    const encerradaEm = new Date().toISOString();
    encerrarSessao(db, sessaoId, numeroCaixa, encerradaEm);
    const final = buscarPorId(db, sessaoId);
    enfileirarSync('sessoes_contagem', final);
    registrarEvento({ nivel: 'SUCCESS', categoria: 'SESSAO', mensagem: `Sessão ${sessaoId} encerrada (caixa ${numeroCaixa}, total ${final.quantidade_total})`, codigo_operador: s.codigo_operador });
    broadcast('sessao.atualizada', final);
    return final;
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

  return { abrir, confirmar, encerrar, reiniciarContagem, reiniciarSessao, listarAtivas: listarAtivasSnapshot, listarPorEmbarque: listarPorEmbarqueSnapshot };
}
