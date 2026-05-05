export function criarSpoolerTransport() {
  return {
    async enviar() {
      throw new Error('transporte spooler ainda nao configurado');
    },
  };
}
