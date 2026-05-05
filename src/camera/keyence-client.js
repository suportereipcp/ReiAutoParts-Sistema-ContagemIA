import net from 'node:net';
import { EventEmitter } from 'node:events';
import { parseLinha } from './keyence-parser.js';

const CR = 0x0D;
const COMANDO_TIMEOUT_MS = 3000;

function classificarLinha({ linha, parsed, aguardando }) {
  if (!parsed) return { status: 'nao_interpretada', parsed: null };
  if (parsed.tipo === 'pulso') return { status: 'contagem_lida', parsed };
  if (parsed.tipo === 'erro') return { status: 'erro_lido', parsed };
  if (parsed.tipo === 'resposta' && !aguardando && !linha.includes(',')) {
    return { status: 'nao_interpretada', parsed: null };
  }
  if (parsed.tipo === 'resposta') {
    return { status: aguardando ? 'resposta_comando_lida' : 'resposta_sem_comando', parsed };
  }
  return { status: 'nao_interpretada', parsed: null };
}

function comandoBase(cmd) {
  return String(cmd ?? '').split(',')[0].trim();
}

export class KeyenceClient extends EventEmitter {
  constructor({ ip, porta, socketFactory = () => new net.Socket() }) {
    super();
    this.ip = ip;
    this.porta = porta;
    this.socketFactory = socketFactory;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.fila = [];
    this.aguardando = null;
    this.conectado = false;
    this.conectando = null;
    this.ultimosPulsos = new Map();
  }

  conectar() {
    if (this.conectado && this.socket) return Promise.resolve();
    if (this.conectando) return this.conectando;

    this.conectando = new Promise((resolve, reject) => {
      const s = this.socketFactory();
      let resolvido = false;
      let timeout;
      const finalizar = () => {
        clearTimeout(timeout);
        this.conectando = null;
      };
      const falhar = (erro) => {
        if (resolvido) return;
        resolvido = true;
        finalizar();
        try { s.destroy?.(); } catch (_) {}
        reject(erro);
      };
      s.setNoDelay(true);
      s.setKeepAlive(true, 10000);
      s.on('data', b => this._onData(b));
      s.on('close', () => this._onClose(s));
      s.on('error', e => {
        this.emit('erro', e);
        if (!this.conectado) falhar(e);
      });
      s.connect(this.porta, this.ip, () => {
        if (resolvido) return;
        resolvido = true;
        finalizar();
        this.conectado = true;
        this.socket = s;
        this.emit('conectado');
        resolve();
      });
      timeout = setTimeout(() => { if (!this.conectado) falhar(new Error('timeout conexão')); }, 5000);
    });
    return this.conectando;
  }

  desconectar() {
    if (this.socket) { this.socket.end(); this.socket = null; }
    this.conectado = false;
  }

  enviaComando(cmd) {
    if (!this.conectado || !this.socket) {
      return Promise.reject(new Error('câmera desconectada'));
    }
    return new Promise((resolve, reject) => {
      this.fila.push({ cmd, resolve, reject });
      this._drenarFila();
    });
  }

  _drenarFila() {
    if (this.aguardando || this.fila.length === 0 || !this.conectado) return;
    this.aguardando = this.fila.shift();
    this.socket.write(this.aguardando.cmd + '\r');
    this.aguardando.timeout = setTimeout(() => {
      const a = this.aguardando; this.aguardando = null;
      a.reject(new Error(`timeout comando ${a.cmd}`));
      this._drenarFila();
    }, COMANDO_TIMEOUT_MS);
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let idx;
    while ((idx = this.buffer.indexOf(CR)) >= 0) {
      const linha = this.buffer.slice(0, idx).toString('ascii');
      this.buffer = this.buffer.slice(idx + 1);
      this._processarLinha(linha);
    }
  }

  _processarLinha(linha) {
    const resultado = classificarLinha({
      linha,
      parsed: parseLinha(linha),
      aguardando: Boolean(this.aguardando),
    });
    if (resultado.parsed?.tipo === 'pulso') {
      if (this._pulsoRepetido(resultado.parsed)) return;
      this._registrarPulso(resultado.parsed);
    }
    this.emit('linha-processada', {
      linha,
      status: resultado.status,
      parsed: resultado.parsed,
    });
    const { parsed } = resultado;
    if (!parsed) { this.emit('raw', linha); return; }
    if (parsed.tipo === 'pulso') {
      this.emit('pulso', parsed);
      return;
    }
    if (!this.aguardando) { this.emit('resposta-sem-comando', parsed); return; }
    if (parsed.comando !== comandoBase(this.aguardando.cmd)) {
      this.emit('resposta-sem-comando', parsed);
      return;
    }
    const { cmd, resolve, reject, timeout } = this.aguardando;
    clearTimeout(timeout);
    this.aguardando = null;
    if (parsed.tipo === 'erro') {
      reject(new Error(`ER:${parsed.comando}:${parsed.codigo}`));
    } else {
      if (String(cmd).split(',')[0] === 'CTR') this.ultimosPulsos.clear();
      resolve(parsed);
    }
    this._drenarFila();
  }

  _assinaturaPulso(parsed) {
    return `${parsed.contagem}|${parsed.total_dia}`;
  }

  _chavePulso(parsed) {
    return String(parsed.ferramenta ?? 0);
  }

  _pulsoRepetido(parsed) {
    const chave = this._chavePulso(parsed);
    return this.ultimosPulsos.get(chave) === this._assinaturaPulso(parsed);
  }

  _registrarPulso(parsed) {
    this.ultimosPulsos.set(this._chavePulso(parsed), this._assinaturaPulso(parsed));
  }

  _onClose(socket) {
    if (socket && socket !== this.socket) return;
    this.conectado = false;
    this.socket = null;
    this.ultimosPulsos.clear();
    if (this.aguardando) {
      clearTimeout(this.aguardando.timeout);
      this.aguardando.reject(new Error('conexão fechada'));
      this.aguardando = null;
    }
    while (this.fila.length > 0) {
      const pendente = this.fila.shift();
      pendente.reject(new Error('conexão fechada'));
    }
    this.emit('desconectado');
  }
}
