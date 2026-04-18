import net from 'node:net';
import { EventEmitter } from 'node:events';
import { parseLinha } from './keyence-parser.js';

const CR = 0x0D;
const COMANDO_TIMEOUT_MS = 3000;

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
  }

  conectar() {
    return new Promise((resolve, reject) => {
      const s = this.socketFactory();
      s.setNoDelay(true);
      s.setKeepAlive(true, 10000);
      s.on('data', b => this._onData(b));
      s.on('close', () => this._onClose());
      s.on('error', e => this.emit('erro', e));
      s.connect(this.porta, this.ip, () => {
        this.conectado = true;
        this.socket = s;
        this.emit('conectado');
        resolve();
      });
      setTimeout(() => { if (!this.conectado) reject(new Error('timeout conexão')); }, 5000);
    });
  }

  desconectar() {
    if (this.socket) { this.socket.end(); this.socket = null; }
    this.conectado = false;
  }

  enviaComando(cmd) {
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
    const parsed = parseLinha(linha);
    if (!parsed) { this.emit('raw', linha); return; }
    if (parsed.tipo === 'pulso') {
      this.emit('pulso', parsed);
      return;
    }
    if (!this.aguardando) { this.emit('resposta-sem-comando', parsed); return; }
    const { resolve, reject, timeout } = this.aguardando;
    clearTimeout(timeout);
    this.aguardando = null;
    if (parsed.tipo === 'erro') {
      reject(new Error(`ER:${parsed.comando}:${parsed.codigo}`));
    } else {
      resolve(parsed);
    }
    this._drenarFila();
  }

  _onClose() {
    this.conectado = false;
    if (this.aguardando) {
      clearTimeout(this.aguardando.timeout);
      this.aguardando.reject(new Error('conexão fechada'));
      this.aguardando = null;
    }
    this.emit('desconectado');
  }
}
