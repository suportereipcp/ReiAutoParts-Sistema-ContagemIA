export function criarEtiquetasService({ api }) {
  return {
    reimprimirCaixa(payload) {
      return api.post('/etiquetas/caixas', payload);
    },
    listarCaixa(numeroEmbarque, numeroCaixa) {
      return api.get(`/etiquetas/caixas?embarque=${encodeURIComponent(numeroEmbarque)}&caixa=${encodeURIComponent(numeroCaixa)}`);
    },
    retry(id) {
      return api.post(`/etiquetas/${encodeURIComponent(id)}/retry`, {});
    },
  };
}
