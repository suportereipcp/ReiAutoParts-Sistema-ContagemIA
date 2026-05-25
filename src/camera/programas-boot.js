export async function carregarCacheProgramasAoConectar({ manager, logger = console }) {
  try {
    await manager.carregarCacheProgramas?.();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao carregar cache local de programas');
  }
}
