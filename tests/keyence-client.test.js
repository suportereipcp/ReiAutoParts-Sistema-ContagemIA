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
