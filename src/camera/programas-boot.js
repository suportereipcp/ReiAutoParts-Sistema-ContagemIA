export async function atualizarCacheProgramasAoConectar({
  manager,
  existeSessaoAtiva,
  logger = console,
  tentativas = 3,
  delayMs = 1500,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  try {
    await manager.carregarCacheProgramas?.();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao carregar cache local de programas');
  }

  const indisponivel = () =>
    manager.estado === 'desconectada' ||
    manager.estado === 'ativa' ||
    existeSessaoAtiva(manager.cameraId);

  if (indisponivel()) return;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      await manager.atualizarProgramas();
      return;
    } catch (error) {
      logger.warn?.({ err: error, cameraId: manager.cameraId, tentativa }, 'falha ao atualizar cache de programas');
    }
    if (tentativa < tentativas && !indisponivel()) {
      await sleep(delayMs);
    }
  }
}
