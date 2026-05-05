import { EventEmitter } from 'node:events';

const BACKOFF = [1000, 2000, 4000, 8000, 16000, 30000];

export class CameraManager extends EventEmitter {
  constructor({
    cameraId,
    client,
    maxProgramas = 128,
    intervaloDescobertaMs = 0,
    programCache = null,
    sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    logger = console,
  }) {
    super();
    this.cameraId = cameraId;
    this.client = client;
    this.maxProgramas = maxProgramas;
    this.intervaloDescobertaMs = intervaloDescobertaMs;
    this.programCache = programCache;
    this.sleep = sleep;
    this.logger = logger;
    this.estado = 'desconectada';
    this.programas = new Map();
    this.tentativas = 0;

    client.on('pulso', p => this.emit('pulso', { cameraId, ...p }));
    client.on('linha-processada', linha => this.emit('linha-processada', { cameraId, ...linha }));
    client.on('raw', linha => this.emit('raw', { cameraId, linha }));
    client.on('resposta-sem-comando', resposta => this.emit('resposta-sem-comando', { cameraId, resposta }));
    client.on('desconectado', () => this._onDesconectado());
    client.on('erro', e => this.logger.error?.({ err: e, cameraId }, 'erro no client'));
  }

  async conectar() {
    try {
      await this.client.conectar();
      this.estado = 'suspensa';
      this.tentativas = 0;
      this.emit('estado', this.estado);
      this.emit('conectada', { cameraId: this.cameraId });
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
    try {
      await this.client.enviaComando(`PW,${prog}`);
    } catch (error) {
      const atual = await this._lerProgramaAtual();
      if (!this._erroProgramaJaSelecionado(error) || atual !== Number(programaNumero)) {
        throw error;
      }
    }
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

  async reiniciarContagem() {
    if (this.estado === 'desconectada') throw new Error('câmera desconectada');
    await this.client.enviaComando('CTR');
  }

  async descobrirProgramas({ force = false } = {}) {
    if (!force && this.programas.size > 0) return this._listarProgramasMemoria();

    const original = await this._lerProgramaAtual();
    const programasEncontrados = new Map();
    let erroScan = null;

    for (let n = 0; n < this.maxProgramas; n++) {
      const prog = String(n).padStart(3, '0');
      try {
        await this.client.enviaComando(`PW,${prog}`);
        const r = await this.client.enviaComando('PNR');
        const nome = this._normalizarNomePrograma(r.valores?.[0]);
        if (nome && nome !== '-' && nome !== '(no name)') {
          programasEncontrados.set(n, nome);
        }
      } catch (error) {
        if (this._erroProgramaInexistente(error)) continue;
        erroScan = error;
        break;
      }
      if (this.intervaloDescobertaMs > 0 && n < this.maxProgramas - 1) {
        await this.sleep(this.intervaloDescobertaMs);
      }
    }
    if (original != null) {
      try { await this.client.enviaComando(`PW,${String(original).padStart(3, '0')}`); } catch (_) {}
    }

    if (erroScan) {
      throw erroScan;
    }

    this.programas = programasEncontrados;
    return this._listarProgramasMemoria();
  }

  async carregarCacheProgramas() {
    if (!this.programCache) return this._listarProgramasMemoria();

    const programas = await this.programCache.carregar();
    this.programas.clear();
    for (const programa of programas) {
      this.programas.set(programa.numero, programa.nome);
    }

    return this._listarProgramasMemoria();
  }

  async listarProgramas(filtro = '') {
    if (this.programas.size === 0) {
      await this.carregarCacheProgramas();
    }

    return this._listarProgramasMemoria(filtro);
  }

  async atualizarProgramas() {
    if (this.estado === 'ativa') {
      throw new Error(`Camera ${this.cameraId} esta com sessao ativa. Encerre a sessao antes de atualizar programas.`);
    }

    if (this.estado === 'desconectada' || !this.client?.conectado) {
      throw new Error(`Camera ${this.cameraId} desconectada.`);
    }

    const programas = await this.descobrirProgramas({ force: true });
    if (this.programCache) {
      await this.programCache.salvar(programas);
    }

    return programas;
  }

  async _lerProgramaAtual() {
    try {
      const r = await this.client.enviaComando('PR');
      return Number(r.valores?.[0] ?? 0);
    } catch (_) { return null; }
  }

  buscarProgramas(filtro) {
    return this._listarProgramasMemoria(filtro);
  }

  _listarProgramasMemoria(filtro = '') {
    const f = String(filtro).toLowerCase();
    return [...this.programas.entries()]
      .filter(([_, nome]) => nome.toLowerCase().includes(f))
      .map(([numero, nome]) => ({ numero, nome }));
  }

  _normalizarNomePrograma(nome) {
    return String(nome ?? '').replace(/\0/g, '').trim();
  }

  _erroProgramaInexistente(error) {
    return /^ER:PW:/i.test(error?.message ?? '');
  }

  _erroProgramaJaSelecionado(error) {
    return /^ER:PW:0?3$/i.test(error?.message ?? '');
  }
}
