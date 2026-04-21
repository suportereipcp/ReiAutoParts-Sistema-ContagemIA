export function criarCatalogos({ api }) {
  let cacheEmb = null, cacheOper = null;
  return {
    async embarquesAbertos() {
      if (!cacheEmb) cacheEmb = api.get('/embarques?status=aberto');
      return cacheEmb;
    },
    invalidarEmbarques() { cacheEmb = null; },
    async operadores() {
      if (!cacheOper) cacheOper = api.get('/operadores');
      return cacheOper;
    },
    invalidarOperadores() { cacheOper = null; },
    async ops(q = '') { return api.get(`/ops?q=${encodeURIComponent(q)}`); },
    async programas(cameraId, q = '') { return api.get(`/programas?camera=${cameraId}&q=${encodeURIComponent(q)}`); },
    async embarque(numero) { return api.get(`/embarques/${encodeURIComponent(numero)}`); },
  };
}
