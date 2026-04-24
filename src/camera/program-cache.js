import fs from 'node:fs/promises';
import path from 'node:path';

export class ProgramCache {
  constructor({ baseDir = path.join(process.cwd(), 'data', 'programas'), cameraId, now = () => new Date() }) {
    this.baseDir = baseDir;
    this.cameraId = Number(cameraId);
    this.now = now;
    this.programas = [];
  }

  get dir() {
    return path.join(this.baseDir, `camera-${this.cameraId}`);
  }

  get arquivo() {
    return path.join(this.dir, 'programas.json');
  }

  async carregar() {
    try {
      const raw = JSON.parse(await fs.readFile(this.arquivo, 'utf8'));
      this.programas = this._normalizarLista(raw.programas);
      return this.listar();
    } catch (error) {
      if (error?.code === 'ENOENT') {
        this.programas = [];
        return [];
      }

      throw error;
    }
  }

  async salvar(programas) {
    const lista = this._normalizarLista(programas);
    await fs.mkdir(this.dir, { recursive: true });

    const tmp = path.join(this.dir, `programas.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`);
    const payload = {
      cameraId: this.cameraId,
      atualizadoEm: this.now().toISOString(),
      programas: this._copiarLista(lista),
    };

    await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.rename(tmp, this.arquivo);

    this.programas = lista;
    return this._copiarLista(lista);
  }

  listar(filtro = '') {
    const termo = String(filtro).toLowerCase();
    return this._copiarLista(this.programas.filter((programa) => programa.nome.toLowerCase().includes(termo)));
  }

  _normalizarLista(programas) {
    if (!Array.isArray(programas)) {
      return [];
    }

    return programas
      .map((programa) => ({
        numero: Number(programa?.numero),
        nome: String(programa?.nome ?? '').replaceAll('\0', '').trim(),
      }))
      .filter((programa) => Number.isInteger(programa.numero) && programa.numero >= 0 && programa.nome)
      .sort((a, b) => a.numero - b.numero);
  }

  _copiarLista(programas) {
    return programas.map((programa) => ({ ...programa }));
  }
}
