import {
  buscarProgramaCalibracao,
  excluirProgramaCalibracao,
  listarProgramasCalibracao,
  proximaVersaoCalibracao,
  salvarCicloCalibracao,
} from '../db/queries/calibracao.js';

const TAMANHOS = ['nano', 'small', 'medium'];
const PROGRAMA_BASE_CALIBRACAO = 120;

function numeroProgramaPadrao(tamanho) {
  return PROGRAMA_BASE_CALIBRACAO + TAMANHOS.indexOf(tamanho);
}

function valorFinito(...valores) {
  for (const valor of valores) {
    const numero = Number(valor);
    if (Number.isFinite(numero)) return numero;
  }
  return null;
}

export function criarCalibracaoService({
  db,
  cameraManagers,
  gerarUUID,
  broadcast,
  now = () => new Date(),
  nowMs = () => Date.now(),
  existeSessaoContagemAtiva = () => false,
}) {
  const sessoesAtivas = new Map();

  function _camera(cameraId) {
    const id = Number(cameraId);
    const cam = cameraManagers.get(id);
    if (!cam) throw new Error(`Camera ${id} desconhecida.`);
    return cam;
  }

  function _normalizarProgramasEntrada(programasEntrada, versao) {
    const entrada = Array.isArray(programasEntrada) ? programasEntrada : [];
    return TAMANHOS.map((tamanho) => {
      const informado = entrada.find((programa) => programa?.tamanho === tamanho) ?? {};
      const numero = valorFinito(informado.programa_numero, informado.programaNumero, numeroProgramaPadrao(tamanho));
      return {
        id: informado.id ?? gerarUUID(),
        tamanho,
        programa_numero: numero,
        programa_nome: informado.programa_nome ?? informado.programaNome ?? `CALIBRACAO-${tamanho.toUpperCase()}-V${versao}`,
        modelo_path: informado.modelo_path ?? informado.modeloPath ?? `data/modelos/calibracao-${tamanho}-v${versao}.pt`,
      };
    });
  }

  function listar(cameraId) {
    return listarProgramasCalibracao(db, Number(cameraId));
  }

  function treinar({ camera_id, programas } = {}) {
    const cameraId = Number(camera_id);
    _camera(cameraId);
    const versao = proximaVersaoCalibracao(db, cameraId);
    const treinadoEm = now().toISOString();
    return salvarCicloCalibracao(db, {
      camera_id: cameraId,
      versao,
      treinado_em: treinadoEm,
      programas: _normalizarProgramasEntrada(programas, versao),
    });
  }

  function excluir(id) {
    return excluirProgramaCalibracao(db, id);
  }

  function temSessaoAtiva(cameraId) {
    return sessoesAtivas.has(Number(cameraId));
  }

  async function executar(programaId) {
    const programa = buscarProgramaCalibracao(db, programaId);
    if (!programa) throw new Error(`Programa de calibracao ${programaId} nao encontrado.`);

    const cam = _camera(programa.camera_id);
    if (cam.estado === 'desconectada') throw new Error(`Camera ${programa.camera_id} desconectada.`);
    if (existeSessaoContagemAtiva(programa.camera_id)) {
      throw new Error(`Camera ${programa.camera_id} possui sessao de contagem ativa.`);
    }
    if (temSessaoAtiva(programa.camera_id)) {
      throw new Error(`Camera ${programa.camera_id} possui calibracao ativa.`);
    }

    await cam.ativarSessao({ programaNumero: programa.programa_numero });

    const sessao = {
      id: gerarUUID(),
      programa_id: programa.id,
      camera_id: programa.camera_id,
      tamanho: programa.tamanho,
      programa_numero: programa.programa_numero,
      programa_nome: programa.programa_nome,
      versao: programa.versao,
      status: 'ativa',
      iniciada_em: now().toISOString(),
      fps: 0,
      frames_detectados: 0,
      pixels_objeto: 0,
      timestamps: [],
    };
    sessoesAtivas.set(programa.camera_id, sessao);
    broadcast('calibracao.iniciada', _snapshot(sessao));
    broadcast('calibracao.metricas', _metricas(sessao));
    return _snapshot(sessao);
  }

  async function encerrarPorCamera(cameraId) {
    const id = Number(cameraId);
    const sessao = sessoesAtivas.get(id);
    if (!sessao) return { camera_id: id, status: 'sem-sessao' };

    const cam = cameraManagers.get(id);
    if (cam) await cam.encerrarSessao();
    sessoesAtivas.delete(id);
    const encerrada = { ..._snapshot(sessao), status: 'encerrada', encerrada_em: now().toISOString() };
    broadcast('calibracao.encerrada', encerrada);
    return encerrada;
  }

  function processarPulso(payload) {
    const cameraId = Number(payload?.cameraId);
    const sessao = sessoesAtivas.get(cameraId);
    if (!sessao) return false;

    const agora = nowMs();
    sessao.timestamps = [...sessao.timestamps, agora].filter((ts) => agora - ts <= 1000);
    sessao.fps = sessao.timestamps.length;
    sessao.frames_detectados = valorFinito(
      payload.frames_detectados,
      payload.framesDetectados,
      payload.contagem,
      sessao.frames_detectados + 1,
    );
    sessao.pixels_objeto = valorFinito(
      payload.pixels_objeto,
      payload.pixelsObjeto,
      payload.brilho,
      0,
    );

    const metricas = _metricas(sessao);
    broadcast('calibracao.metricas', metricas);
    return metricas;
  }

  function _snapshot(sessao) {
    const { timestamps, ...resto } = sessao;
    return { ...resto };
  }

  function _metricas(sessao) {
    return {
      sessao_id: sessao.id,
      programa_id: sessao.programa_id,
      camera_id: sessao.camera_id,
      tamanho: sessao.tamanho,
      programa_numero: sessao.programa_numero,
      programa_nome: sessao.programa_nome,
      versao: sessao.versao,
      fps: sessao.fps,
      frames_detectados: sessao.frames_detectados,
      pixels_objeto: sessao.pixels_objeto,
    };
  }

  return {
    listar,
    treinar,
    excluir,
    executar,
    encerrarPorCamera,
    processarPulso,
    temSessaoAtiva,
  };
}
