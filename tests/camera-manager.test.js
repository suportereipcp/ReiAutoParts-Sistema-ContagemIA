import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { CameraManager } from '../src/camera/camera-manager.js';

class FakeClient extends EventEmitter {
  constructor() { super(); this.conectado = false; this.comandos = []; this.respostas = new Map(); }
  async conectar() { this.conectado = true; this.emit('conectado'); }
  desconectar() { this.conectado = false; this.emit('desconectado'); }
  async enviaComando(cmd) {
    this.comandos.push(cmd);
    const r = this.respostas.get(cmd);
    if (r instanceof Error) throw r;
    return r ?? { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  }
}

test('ativarSessao envia PW, CTR, OE em ordem', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 2 });
  assert.ok(client.comandos.includes('PW,002'));
  assert.ok(client.comandos.includes('CTR'));
  assert.ok(client.comandos.includes('OE,1'));
  assert.equal(m.estado, 'ativa');
});

test('encerrarSessao envia OE,0 e volta para suspensa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 3 });
  await m.encerrarSessao();
  assert.equal(client.comandos.at(-1), 'OE,0');
  assert.equal(m.estado, 'suspensa');
});

test('descobrirProgramas itera e cacheia nomes', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 3 });
  await m.conectar();
  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: ['PECA-A'] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };
  const lista = await m.descobrirProgramas();
  assert.ok(lista.length >= 1);
  assert.equal(lista[0].nome, 'PECA-A');
});
