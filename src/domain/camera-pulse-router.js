export function criarRoteadorPulsoCamera({ calibracaoService, contagemService }) {
  return function rotearPulsoCamera(payload) {
    if (calibracaoService.temSessaoAtiva(payload.cameraId)) {
      return calibracaoService.processarPulso(payload);
    }

    return contagemService.processarPulso({
      cameraId: payload.cameraId,
      contagem: payload.contagem,
      total_dia: payload.total_dia,
      brilho: payload.brilho,
    });
  };
}
