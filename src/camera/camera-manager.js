import { EventEmitter } from 'node:events';

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];

export class CameraManager extends EventEmitter {
  constructor({ cameraId, client, maxProgramas = 128, logger = console }) {
    super();
    this.cameraId = cameraId;
    this.client = client;
    this.maxProgramas = maxProgramas;
    this.logger = logger;
    this.estado = 'desconectada';
    this.programas = new Map();
    this.tentativas = 0;

    client.on('pulso', p => this.emit('pulso', { cameraId, ...p }));
    client.on('desconectado', () => this._onDesconectado());
    client.on('erro', e => this.logger.error?.({ err: e, cameraId }, 'erro no client'));
  }

  async conectar() {
    try {
      await this.client.conectar();
      this.estado = 'suspensa';
      this.tentativas = 0;
      this.emit('estado', this.estado);
      try { await this.client.enviaComando('OE,0'); } catch (_) { /* idempotente */ }
    } catch (e) {
      this._agendarReconnect();
    }
  }

  _onDesconectado() {
    this.estado = 'desconectada';
    this.emit('estado', this.estado);
    this._agendarReconnect();
  }

  _agendarReconnect() {
    const delay = BACKOFF[Math.min(this.tentativas, BACKOFF.length - 1)];
    this.tentativas++;
    setTimeout(() => this.conectar(), delay);
  }

  async ativarSessao({ programaNumero, formatoOE = 1 }) {
    if (this.estado === 'desconectada') throw new Error('câmera desconectada');
    const prog = String(programaNumero).padStart(3, '0');
    await this.client.enviaComando(`PW,${prog}`);
    await this.client.enviaComando('CTR');
    await this.client.enviaComando(`OE,${formatoOE}`);
    this.estado = 'ativa';
    this.emit('estado', this.estado);
  }

  async encerrarSessao() {
    if (this.estado !== 'ativa') return;
    await this.client.enviaComando('OE,0');
    this.estado = 'suspensa';
    this.emit('estado', this.estado);
  }

  async descobrirProgramas() {
    if (this.programas.size > 0) return [...this.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
    const original = await this._lerProgramaAtual();
    for (let n = 0; n < this.maxProgramas; n++) {
      const prog = String(n).padStart(3, '0');
      try {
        await this.client.enviaComando(`PW,${prog}`);
        const r = await this.client.enviaComando('PNR');
        const nome = (r.valores?.[0] ?? '').trim();
        if (nome && nome !== '-' && nome !== '(no name)') {
          this.programas.set(n, nome);
        }
      } catch (_) { /* programa não existe, pula */ }
    }
    if (original != null) {
      try { await this.client.enviaComando(`PW,${String(original).padStart(3, '0')}`); } catch (_) {}
    }
    return [...this.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
  }

  async _lerProgramaAtual() {
    try {
      const r = await this.client.enviaComando('PR');
      return Number(r.valores?.[0] ?? 0);
    } catch (_) { return null; }
  }

  buscarProgramas(filtro) {
    const f = filtro.toLowerCase();
    return [...this.programas.entries()]
      .filter(([_, nome]) => nome.toLowerCase().includes(f))
      .map(([numero, nome]) => ({ numero, nome }));
  }
}
