const LIMITE_TEXTO = 240;

function limitarTexto(texto) {
  const valor = String(texto ?? '');
  return valor.length > LIMITE_TEXTO ? `${valor.slice(0, LIMITE_TEXTO)}...` : valor;
}

export function criarRegistradorDiagnosticoKeyence({
  limitePorCamera = 30,
  logger = console,
  registrarEvento,
} = {}) {
  const diagnosticosPorCamera = new Map();

  return (cameraId, mensagem) => {
    logger.warn?.({ cameraId, mensagem }, 'diagnostico keyence');

    const total = diagnosticosPorCamera.get(cameraId) ?? 0;
    if (total >= limitePorCamera) return;

    diagnosticosPorCamera.set(cameraId, total + 1);
    registrarEvento?.({
      nivel: 'WARN',
      categoria: 'CAMERA',
      mensagem,
    });
  };
}

export function formatarLinhaKeyenceNaoReconhecida({ cameraId, linha }) {
  return `Linha Keyence nao reconhecida na camera ${cameraId}: ${limitarTexto(JSON.stringify(String(linha ?? '')))}`;
}

export function formatarRespostaKeyenceSemComando({ cameraId, resposta }) {
  return `Resposta Keyence sem comando na camera ${cameraId}: ${limitarTexto(JSON.stringify(resposta ?? null))}`;
}
