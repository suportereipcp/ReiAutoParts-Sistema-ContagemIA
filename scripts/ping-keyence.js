import readline from 'node:readline';
import { KeyenceClient } from '../src/camera/keyence-client.js';

const IP = process.argv[2];
const PORTA = Number(process.argv[3] ?? 8500);
if (!IP) { console.error('uso: node scripts/ping-keyence.js <IP> [porta]'); process.exit(1); }

const client = new KeyenceClient({ ip: IP, porta: PORTA });
client.on('pulso', p => console.log('PULSO:', p));
client.on('raw', r => console.log('RAW:', r));

await client.conectar();
console.log(`conectado a ${IP}:${PORTA}. Digite comandos (PR, PNR, SR, PW,003, OE,1, OE,0, CTR) ou sair.`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', async (linha) => {
  const l = linha.trim();
  if (l === 'sair' || l === 'quit') { client.desconectar(); process.exit(0); }
  try {
    const r = await client.enviaComando(l);
    console.log('RESP:', r);
  } catch (e) {
    console.error('ERRO:', e.message);
  }
});
