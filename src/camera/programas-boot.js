export async function atualizarCacheProgramasAoConectar({ manager, existeSessaoAtiva, logger = console }) {
  try {
    await manager.carregarCacheProgramas?.();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao carregar cache local de programas');
  }

  if (manager.estado === 'desconectada' || manager.estado === 'ativa') return;
  if (existeSessaoAtiva(manager.cameraId)) return;

  try {
    await manager.atualizarProgramas();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao atualizar cache de programas');
  }
}
