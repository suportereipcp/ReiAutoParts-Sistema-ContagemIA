export function criarWSHub(fastify, logger) {
  const clientes = new Set();

  fastify.get('/ws', { websocket: true }, (connection) => {
    const ws = connection.socket ?? connection;
    clientes.add(ws);
    ws.on('close', () => clientes.delete(ws));
    try { ws.send(JSON.stringify({ evento: 'hello', ts: Date.now() })); } catch (_) {}
  });

  function broadcast(evento, payload) {
    const msg = JSON.stringify({ evento, payload, ts: Date.now() });
    for (const ws of clientes) {
      try { ws.send(msg); } catch (e) { logger.warn?.({ err: e }, 'falha ao enviar WS'); }
    }
  }

  return { broadcast, clientesCount: () => clientes.size };
}
