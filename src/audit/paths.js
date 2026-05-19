import path from 'node:path';

export function pastaDataCamera(base, data, cameraId) {
  return path.join(base, data, `cam-${cameraId}`);
}

export function arquivoNdjson(base, data, cameraId, sessaoId) {
  return path.join(pastaDataCamera(base, data, cameraId), `sessao-${sessaoId}.ndjson`);
}

export function arquivoLive(base, data, cameraId, sessaoId) {
  return path.join(pastaDataCamera(base, data, cameraId), `sessao-${sessaoId}.live`);
}

export function dataDeInicio(timestampIso, timeZone = 'America/Sao_Paulo') {
  const d = new Date(timestampIso);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(d);
}
