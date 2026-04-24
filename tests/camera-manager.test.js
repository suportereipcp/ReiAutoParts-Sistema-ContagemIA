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

class FakeProgramCache {
  constructor(programas = []) {
    this.programas = programas;
    this.carregarChamadas = 0;
    this.salvarChamadas = [];
  }

  async carregar() {
    this.carregarChamadas += 1;
    return this.programas.map((programa) => ({ ...programa }));
  }

  async salvar(programas) {
    this.salvarChamadas.push(programas.map((programa) => ({ ...programa })));
    this.programas = programas.map((programa) => ({ ...programa }));
    return this.programas.map((programa) => ({ ...programa }));
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

test('descobrirProgramas respeita intervalo entre trocas de programa', async () => {
  const client = new FakeClient();
  const esperas = [];
  const m = new CameraManager({
    cameraId: 1,
    client,
    maxProgramas: 3,
    intervaloDescobertaMs: 200,
    sleep: async (ms) => { esperas.push(ms); },
  });
  await m.conectar();
  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['000'] };
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: ['PECA-A'] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };

  await m.descobrirProgramas();

  assert.deepEqual(esperas, [200, 200]);
});

test('listarProgramas carrega cache local e nao varre camera fisica', async () => {
  const client = new FakeClient();
  const cache = new FakeProgramCache([{ numero: 7, nome: 'PECA-CACHE' }]);
  const m = new CameraManager({ cameraId: 1, client, programCache: cache });

  const lista = await m.listarProgramas('cache');

  assert.deepEqual(lista, [{ numero: 7, nome: 'PECA-CACHE' }]);
  assert.equal(cache.carregarChamadas, 1);
  assert.deepEqual(client.comandos, []);
});

test('atualizarProgramas varre camera livre e salva cache local', async () => {
  const client = new FakeClient();
  const cache = new FakeProgramCache();
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 2, programCache: cache });
  await m.conectar();

  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['1'] };
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: [`PECA-${client.comandos.filter((comando) => comando === 'PNR').length}`] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };

  const lista = await m.atualizarProgramas();

  assert.deepEqual(lista, [
    { numero: 0, nome: 'PECA-1' },
    { numero: 1, nome: 'PECA-2' },
  ]);
  assert.deepEqual(cache.salvarChamadas, [lista]);
  assert.ok(client.comandos.includes('PW,000'));
  assert.ok(client.comandos.includes('PW,001'));
});

test('atualizarProgramas rejeita falha PNR e nao salva cache parcial', async () => {
  const client = new FakeClient();
  const cache = new FakeProgramCache();
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 2, programCache: cache });
  await m.conectar();

  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['1'] };
    if (cmd === 'PNR') throw new Error('timeout comando PNR');
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };

  await assert.rejects(
    () => m.atualizarProgramas(),
    /timeout comando PNR/,
  );
  assert.deepEqual(cache.salvarChamadas, []);
});

test('atualizarProgramas preserva memoria anterior quando refresh forcado falha parcial', async () => {
  const client = new FakeClient();
  const cache = new FakeProgramCache([{ numero: 9, nome: 'CACHE-VALIDO' }]);
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 2, programCache: cache });
  await m.listarProgramas();
  await m.conectar();

  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['9'] };
    if (cmd === 'PNR') {
      const chamadasPnr = client.comandos.filter((comando) => comando === 'PNR').length;
      if (chamadasPnr === 1) return { tipo: 'resposta', comando: 'PNR', valores: ['PARCIAL'] };
      throw new Error('timeout comando PNR');
    }
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };

  await assert.rejects(
    () => m.atualizarProgramas(),
    /timeout comando PNR/,
  );
  assert.deepEqual(await m.listarProgramas(), [{ numero: 9, nome: 'CACHE-VALIDO' }]);
});

test('atualizarProgramas bloqueia camera ativa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 2, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 1 });

  await assert.rejects(
    () => m.atualizarProgramas(),
    /Camera 2 esta com sessao ativa\. Encerre a sessao antes de atualizar programas\./,
  );
});

test('atualizarProgramas bloqueia camera desconectada', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 2, client });

  await assert.rejects(
    () => m.atualizarProgramas(),
    /Camera 2 desconectada\./,
  );
});

test('atualizarProgramas bloqueia client desconectado mesmo com estado suspensa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 2, client });
  m.estado = 'suspensa';
  client.conectado = false;

  await assert.rejects(
    () => m.atualizarProgramas(),
    /Camera 2 desconectada\./,
  );
  assert.deepEqual(client.comandos, []);
});

test('conectar emite conectada uma vez', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 3, client });
  const eventos = [];
  m.on('conectada', (payload) => eventos.push(payload));

  await m.conectar();

  assert.deepEqual(eventos, [{ cameraId: 3 }]);
});

test('conectar nao envia OE,0 automaticamente para nao bloquear descoberta de programas', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  assert.equal(client.comandos.includes('OE,0'), false);
  assert.equal(m.estado, 'suspensa');
});

test('descobrirProgramas remove bytes nulos do nome do programa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 1 });
  await m.conectar();
  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['000'] };
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: ['2265.3\u0000\u0000'] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };
  const lista = await m.descobrirProgramas();
  assert.deepEqual(lista, [{ numero: 0, nome: '2265.3' }]);
});

test('descobrirProgramas ignora programa inexistente informado pela camera', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 2 });
  await m.conectar();
  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['000'] };
    if (cmd === 'PW,000') throw new Error('ER:PW:3');
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: ['PECA-VALIDA'] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };
  const lista = await m.descobrirProgramas();
  assert.deepEqual(lista, [{ numero: 1, nome: 'PECA-VALIDA' }]);
});
