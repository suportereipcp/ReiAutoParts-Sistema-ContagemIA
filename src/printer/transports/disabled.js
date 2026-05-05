export function criarDisabledTransport() {
  return {
    async enviar() {
      throw new Error('impressao desabilitada');
    },
  };
}
