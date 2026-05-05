export function criarCatalogos({ api }) {
  let cacheOper = null;
  return {
    async embarques(status) {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return api.get(`/embarques${query}`);
    },
    async embarquesAbertos() {
      return api.get('/embarques?status=aberto');
    },
    invalidarEmbarques() {},
    async operadores() {
      if (!cacheOper) cacheOper = api.get('/operadores');
      return cacheOper;
    },
    invalidarOperadores() { cacheOper = null; },
    async ops(q = '') { return api.get(`/ops?q=${encodeURIComponent(q)}`); },
    async op(codigo) { return api.get(`/ops/${encodeURIComponent(codigo)}`); },
    async programas(cameraId, q = '') { return api.get(`/programas?camera=${cameraId}&q=${encodeURIComponent(q)}`); },
    async embarque(numero) { return api.get(`/embarques/${encodeURIComponent(numero)}`); },
  };
}
