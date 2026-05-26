// Caminho fixo do firmware do IV4 (Monitor da Web → Imagem da Web).
const CAMINHO_IMAGEM = 'iliveimage.jpg';

/**
 * Busca o JPEG ao vivo de uma câmera IV4 via Monitor da Web (HTTP).
 * @param {{ ip: string, portaImagem?: number }} cam
 * @param {{ fetchFn?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function buscarImagemCamera(cam, { fetchFn = fetch, timeoutMs = 2000 } = {}) {
  const porta = cam.portaImagem ?? 80;
  const url = `http://${cam.ip}:${porta}/${CAMINHO_IMAGEM}?${Date.now()}`;
  const resp = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
