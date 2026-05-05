import net from 'node:net';

export function criarTcpTransport({ host, port = 9100, timeoutMs = 5000 } = {}) {
  return {
    enviar(payload) {
      if (!host) throw new Error('LABEL_PRINTER_HOST ausente');
      return new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.write(payload, 'utf8', () => socket.end());
        });
        socket.setTimeout(timeoutMs);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('timeout ao enviar ZPL'));
        });
        socket.on('error', reject);
        socket.on('close', (hadError) => {
          if (!hadError) resolve();
        });
      });
    },
  };
}
