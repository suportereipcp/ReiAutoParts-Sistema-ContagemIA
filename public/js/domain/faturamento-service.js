export function criarFaturamentoClienteService({ api }) {
  return {
    previewMassa: (embarque) => api.get(`/faturamento/embarques/${embarque}/reimpressao-massa/preview`),
    reimpressaoMassa: (embarque, codigoOperador) => api.post(`/faturamento/embarques/${embarque}/reimpressao-massa`, { codigo_operador: codigoOperador }),
    listarSegregadas: (embarque) => api.get(`/faturamento/embarques/${embarque}/segregadas`),
    aprovarSessao: (sessaoId, codigoAprovador) => api.post(`/faturamento/sessoes/${sessaoId}/aprovar`, { codigo_aprovador: codigoAprovador }),
    reprovarSessao: (sessaoId, codigoAprovador) => api.post(`/faturamento/sessoes/${sessaoId}/reprovar`, { codigo_aprovador: codigoAprovador }),
    sugerirRealocacoes: (embarque) => api.get(`/faturamento/embarques/${embarque}/sugestoes-realocacao`),
    realocarSessao: (sessaoId, embarqueDestino) => api.post(`/faturamento/sessoes/${sessaoId}/realocar`, { embarque_destino: embarqueDestino }),
    listarAprovadores: () => api.get('/faturamento/aprovadores'),
    inserirAprovador: ({ codigo, nome }) => api.post('/faturamento/aprovadores', { codigo, nome }),
    desativarAprovador: (codigo) => api.del(`/faturamento/aprovadores/${codigo}`),
  };
}
