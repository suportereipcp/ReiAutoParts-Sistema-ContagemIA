import { EventEmitter } from 'node:events';

export function criarSyncWorker({ healthchecker, pusher, poller, logger }) {
  const bus = new EventEmitter();
  let estado = 'ONLINE';

  function setEstado(novo) {
    if (novo === estado) return;
    const anterior = estado;
    estado = novo;
    logger.info({ anterior, novo }, 'sync estado mudou');
    bus.emit('estado', { anterior, novo });
  }

  async function tick() {
    const h = await healthchecker.tick();
    if (h === 'down') { setEstado('OFFLINE'); return; }
    if (estado === 'OFFLINE') { setEstado('RECOVERY'); }
    try {
      await pusher.drenar();
      await poller.tick();
      if (estado === 'RECOVERY') setEstado('ONLINE');
    } catch (e) {
      logger.warn({ err: e }, 'falha no ciclo sync');
      setEstado('OFFLINE');
    }
  }

  return {
    get estado() { return estado; },
    tick,
    on: (ev, fn) => bus.on(ev, fn),
  };
}
