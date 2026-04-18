export function criarHealthchecker({ ping, limite = 3 }) {
  let falhas = 0;
  let estado = 'up';
  return {
    get estado() { return estado; },
    async tick() {
      try {
        await ping();
        falhas = 0;
        estado = 'up';
      } catch (e) {
        falhas++;
        if (falhas >= limite) estado = 'down';
      }
      return estado;
    },
    reset() { falhas = 0; estado = 'up'; },
  };
}
