export function criarSessoesService({ api }) {
  return {
    async abrir(form) { return api.post('/sessoes', form); },
    async confirmar(id, programa) { return api.post(`/sessoes/${id}/confirmar`, programa); },
    async encerrar(id, numero_caixa) { return api.post(`/sessoes/${id}/encerrar`, { numero_caixa }); },
    async reiniciarContagem(id) { return api.post(`/sessoes/${id}/reiniciar-contagem`, {}); },
    async reiniciarSessao(id) { return api.post(`/sessoes/${id}/reiniciar-sessao`, {}); },
  };
}
