import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { KeyenceClient } from '../src/camera/keyence-client.js';

class FakeSocket extends EventEmitter {
  constructor() { super(); this.written = []; this.connected = false; }
  connect(port, host, cb) { this.connected = true; setImmediate(() => { cb?.(); this.emit('connect'); }); return this; }
  write(buf) { this.written.push(buf.toString()); return true; }
  end() { this.connected = false; this.emit('close'); }
  setNoDelay() {}
  setKeepAlive() {}
  destroy() { this.connected = false; }
}

test('enviaComando escreve com CR e resolve com resposta', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p = c.enviaComando('PR');
  await new Promise(r => setImmediate(r));
  assert.equal(socket.written[0], 'PR\r');
  socket.emit('data', Buffer.from('PR,003\r'));
  const resp = await p;
  assert.equal(resp.comando, 'PR');
  assert.deepEqual(resp.valores, ['003']);
});

test('pulsos chegam via evento "pulso"', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const recebidos = [];
  c.on('pulso', p => recebidos.push(p));
  socket.emit('data', Buffer.from('02,0000050,0000100,000\r'));
  await new Promise(r => setImmediate(r));
  assert.equal(recebidos.length, 1);
  assert.equal(recebidos[0].contagem, 50);
});

test('emite linha-processada com texto bruto e json interpretado', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const linhas = [];
  c.on('linha-processada', (payload) => linhas.push(payload));

  socket.emit('data', Buffer.from('RT,01995,--,01,0000001,0000123\r'));
  await new Promise(r => setImmediate(r));

  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].linha, 'RT,01995,--,01,0000001,0000123');
  assert.equal(linhas[0].status, 'contagem_lida');
  assert.equal(linhas[0].parsed.tipo, 'pulso');
  assert.equal(linhas[0].parsed.contagem, 1);
  assert.equal(linhas[0].parsed.total_dia, 123);
});

test('ignora RT continuo quando contagem e total_dia nao mudam', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const linhas = [];
  const pulsos = [];
  c.on('linha-processada', (payload) => linhas.push(payload));
  c.on('pulso', (payload) => pulsos.push(payload));

  socket.emit('data', Buffer.from('RT,04123,--,01,0000001,0000005\r'));
  socket.emit('data', Buffer.from('RT,04124,--,01,0000001,0000005\r'));
  socket.emit('data', Buffer.from('RT,04125,--,01,0000001,0000005\r'));
  await new Promise(r => setImmediate(r));

  assert.equal(linhas.length, 1);
  assert.equal(pulsos.length, 1);
  assert.equal(linhas[0].parsed.numero_resultado, 4123);
});

test('emite novo RT quando total_dia muda', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const linhas = [];
  c.on('linha-processada', (payload) => linhas.push(payload));

  socket.emit('data', Buffer.from('RT,04123,--,01,0000001,0000005\r'));
  socket.emit('data', Buffer.from('RT,04124,--,01,0000001,0000006\r'));
  await new Promise(r => setImmediate(r));

  assert.equal(linhas.length, 2);
  assert.equal(linhas[1].parsed.total_dia, 6);
});

test('CTR recebido limpa filtro de RT repetido para nova sessao', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const linhas = [];
  c.on('linha-processada', (payload) => linhas.push(payload));

  socket.emit('data', Buffer.from('RT,04123,--,01,0000001,0000005\r'));
  const p = c.enviaComando('CTR');
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('CTR\r'));
  await p;
  socket.emit('data', Buffer.from('RT,04124,--,01,0000001,0000005\r'));
  await new Promise(r => setImmediate(r));

  assert.equal(linhas.length, 3);
  assert.equal(linhas[2].parsed.numero_resultado, 4124);
});

test('emite linha-processada como nao interpretada quando formato e desconhecido', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const linhas = [];
  c.on('linha-processada', (payload) => linhas.push(payload));

  socket.emit('data', Buffer.from('FORMATO-DESCONHECIDO\r'));
  await new Promise(r => setImmediate(r));

  assert.deepEqual(linhas, [{
    linha: 'FORMATO-DESCONHECIDO',
    status: 'nao_interpretada',
    parsed: null,
  }]);
});

test('resultado RT automatico nao resolve comando pendente', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const recebidos = [];
  c.on('pulso', p => recebidos.push(p));

  const p = c.enviaComando('PNR');
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('RT,01995,--,01,0000001,0000123\r'));
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('PNR,PROG_017\r'));

  const resp = await p;
  assert.equal(resp.comando, 'PNR');
  assert.deepEqual(resp.valores, ['PROG_017']);
  assert.equal(recebidos.length, 1);
  assert.equal(recebidos[0].contagem, 1);
});

test('resposta de outro comando nao resolve comando pendente', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const soltas = [];
  c.on('resposta-sem-comando', (payload) => soltas.push(payload));

  const p = c.enviaComando('PNR');
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('OE\r'));
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('PNR,PROG_017\r'));

  const resp = await p;
  assert.equal(resp.comando, 'PNR');
  assert.deepEqual(resp.valores, ['PROG_017']);
  assert.deepEqual(soltas, [{ tipo: 'resposta', comando: 'OE', valores: [] }]);
});

test('enviaComando rejeita se ER', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p = c.enviaComando('PW,999');
  await new Promise(r => setImmediate(r));
  socket.emit('data', Buffer.from('ER,PW,22\r'));
  await assert.rejects(p, /ER:PW:22/);
});

test('fila serializa comandos concorrentes', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await c.conectar();
  const p1 = c.enviaComando('PR');
  const p2 = c.enviaComando('PNR');
  await new Promise(r => setImmediate(r));
  assert.equal(socket.written.length, 1);
  socket.emit('data', Buffer.from('PR,002\r'));
  await new Promise(r => setImmediate(r));
  assert.equal(socket.written.length, 2);
  socket.emit('data', Buffer.from('PNR,ITEM\r'));
  await Promise.all([p1, p2]);
});

test('enviaComando rejeita imediatamente se cliente estiver desconectado', async () => {
  const socket = new FakeSocket();
  const c = new KeyenceClient({ ip: '1.1.1.1', porta: 8500, socketFactory: () => socket });
  await assert.rejects(() => c.enviaComando('PR'), /câmera desconectada/);
});

test('conectar reutiliza conexao ativa e nao abre sockets duplicados', async () => {
  let criados = 0;
  const socket = new FakeSocket();
  const c = new KeyenceClient({
    ip: '1.1.1.1',
    porta: 8500,
    socketFactory: () => {
      criados++;
      return socket;
    },
  });
  await c.conectar();
  await c.conectar();
  assert.equal(criados, 1);
});

test('conectar compartilha tentativa em andamento', async () => {
  let criados = 0;
  class SlowSocket extends FakeSocket {
    connect(port, host, cb) {
      this.connected = true;
      setTimeout(() => { cb?.(); this.emit('connect'); }, 10);
      return this;
    }
  }
  const socket = new SlowSocket();
  const c = new KeyenceClient({
    ip: '1.1.1.1',
    porta: 8500,
    socketFactory: () => {
      criados++;
      return socket;
    },
  });
  await Promise.all([c.conectar(), c.conectar()]);
  assert.equal(criados, 1);
});
