import net from 'node:net';

const PORTA = Number(process.env.FAKE_PORT ?? 8500);
const PROGRAMAS = new Map([[0, 'PECA-A'], [1, 'PECA-B'], [2, 'PECA-C']]);
let programaAtual = 0;
let oe = 0;
let contagem = 0;
let totalDia = 0;

const clientes = new Set();

const servidor = net.createServer((socket) => {
  console.log('cliente conectado', socket.remoteAddress);
  clientes.add(socket);
  socket.on('close', () => clientes.delete(socket));
  socket.on('error', (err) => {
    console.log('socket error, removendo cliente:', err.code);
    clientes.delete(socket);
  });

  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let idx;
    while ((idx = buf.indexOf(0x0D)) >= 0) {
      const cmd = buf.slice(0, idx).toString('ascii').trim();
      buf = buf.slice(idx + 1);
      responder(socket, cmd);
    }
  });
});

function escrever(socket, dados) {
  if (!socket.destroyed) socket.write(dados);
}

function responder(socket, cmd) {
  const partes = cmd.split(',');
  const c = partes[0];
  if (c === 'PR') return escrever(socket, `PR,${String(programaAtual).padStart(3, '0')}\r`);
  if (c === 'PNR') return escrever(socket, `PNR,${PROGRAMAS.get(programaAtual) ?? ''}\r`);
  if (c === 'PW') {
    const n = Number(partes[1] ?? 0);
    programaAtual = n;
    if (PROGRAMAS.has(n)) return escrever(socket, 'PW\r');
    return escrever(socket, 'ER,PW,22\r');
  }
  if (c === 'CTR') { contagem = 0; return escrever(socket, 'CTR\r'); }
  if (c === 'OE') { oe = Number(partes[1] ?? 0); return escrever(socket, 'OE\r'); }
  if (c === 'SR') return escrever(socket, 'SR,1,0,0,0,0,0,0\r');
  return escrever(socket, `ER,${c},02\r`);
}

setInterval(() => {
  if (oe === 0) return;
  contagem++;
  totalDia++;
  const payload = `02,${String(contagem).padStart(7, '0')},${String(totalDia).padStart(7, '0')},000\r`;
  for (const s of clientes) try { escrever(s, payload); } catch (_) {}
}, 800);

servidor.listen(PORTA, () => console.log(`fake-keyence ouvindo em ${PORTA}`));
