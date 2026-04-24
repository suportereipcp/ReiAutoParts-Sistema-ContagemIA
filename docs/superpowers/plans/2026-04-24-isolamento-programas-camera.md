# Isolamento de Programas por Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolar as cameras Keyence 1 e 2 no fluxo de sessao e acelerar a selecao de programas com cache local por camera.

**Architecture:** Add a small disk-backed `ProgramCache` owned by each `CameraManager`; routes list from cache and only refresh explicitly or during boot. Session creation remains the hard gate for "camera ocupada", and physical program scans are blocked while the selected camera has an active session.

**Tech Stack:** Node.js 20 ESM, native `node:test`, Fastify, local filesystem JSON cache, existing SQLite session queries.

---

## File Structure

- Create `src/camera/program-cache.js`: disk persistence for program lists, one file per camera.
- Create `src/camera/programas-boot.js`: boot/reconnect refresh coordinator; keeps DB active-session knowledge out of `CameraManager`.
- Modify `src/camera/camera-manager.js`: load/list/save cache, explicit refresh, block physical scan while active, emit `conectada`.
- Modify `src/http/routes/programas.js`: `GET` reads cache only; `POST /programas/atualizar` refreshes explicitly.
- Modify `src/domain/sessao-service.js`: adjust occupied-camera message for the form flow.
- Modify `src/server.js`: instantiate per-camera cache and trigger refresh after camera connection when no active session exists.
- Test `tests/program-cache.test.js`: cache persistence and isolation.
- Test `tests/camera-manager.test.js`: manager cache behavior and active-camera blocking.
- Test `tests/programas-routes.test.js`: cache-only listing and explicit refresh route.
- Test `tests/sessao-service.test.js` and `tests/sessoes-routes.test.js`: exact occupied-camera blocking message.
- Test `tests/programas-boot.test.js`: boot refresh skips active sessions and refreshes free cameras.
- Test `tests/frontend/pages/iniciar-sessao.test.js`: form remains on first step and shows camera-active toast.

---

### Task 1: Disk Cache Module

**Files:**
- Create: `src/camera/program-cache.js`
- Create: `tests/program-cache.test.js`

- [ ] **Step 1: Write failing tests for per-camera cache isolation**

Create `tests/program-cache.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProgramCache } from '../src/camera/program-cache.js';

async function tmpDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'program-cache-'));
}

test('ProgramCache salva e carrega programas por camera em pastas separadas', async () => {
  const baseDir = await tmpDir();
  const cache1 = new ProgramCache({ baseDir, cameraId: 1, now: () => new Date('2026-04-24T12:00:00.000Z') });
  const cache2 = new ProgramCache({ baseDir, cameraId: 2, now: () => new Date('2026-04-24T13:00:00.000Z') });

  await cache1.salvar([{ numero: 0, nome: 'PECA-A' }]);
  await cache2.salvar([{ numero: 7, nome: 'PECA-B' }]);

  assert.deepEqual(await cache1.carregar(), [{ numero: 0, nome: 'PECA-A' }]);
  assert.deepEqual(await cache2.carregar(), [{ numero: 7, nome: 'PECA-B' }]);

  const raw1 = JSON.parse(await fs.readFile(path.join(baseDir, 'camera-1', 'programas.json'), 'utf8'));
  const raw2 = JSON.parse(await fs.readFile(path.join(baseDir, 'camera-2', 'programas.json'), 'utf8'));
  assert.equal(raw1.cameraId, 1);
  assert.equal(raw1.atualizadoEm, '2026-04-24T12:00:00.000Z');
  assert.equal(raw2.cameraId, 2);
  assert.equal(raw2.atualizadoEm, '2026-04-24T13:00:00.000Z');
});

test('ProgramCache retorna lista vazia quando arquivo ainda nao existe', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: 1 });

  assert.deepEqual(await cache.carregar(), []);
  assert.deepEqual(cache.listar(), []);
});

test('ProgramCache normaliza e filtra programas carregados', async () => {
  const baseDir = await tmpDir();
  const cache = new ProgramCache({ baseDir, cameraId: 1 });

  await cache.salvar([
    { numero: '2', nome: ' PECA-X ' },
    { numero: 3, nome: '' },
    { numero: Number.NaN, nome: 'INVALIDA' },
  ]);

  assert.deepEqual(cache.listar('peca'), [{ numero: 2, nome: 'PECA-X' }]);
});
```

- [ ] **Step 2: Run cache tests and confirm failure**

Run:

```bash
node --test tests/program-cache.test.js
```

Expected: FAIL with `Cannot find module '../src/camera/program-cache.js'`.

- [ ] **Step 3: Implement `ProgramCache`**

Create `src/camera/program-cache.js`:

```js
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
      this.programas = this._normalizarLista(raw.programas ?? []);
      return this.listar();
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.programas = [];
        return [];
      }
      throw error;
    }
  }

  async salvar(programas) {
    this.programas = this._normalizarLista(programas);
    await fs.mkdir(this.dir, { recursive: true });
    const payload = {
      cameraId: this.cameraId,
      atualizadoEm: this.now().toISOString(),
      programas: this.programas,
    };
    const tmp = `${this.arquivo}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await fs.rename(tmp, this.arquivo);
    return this.listar();
  }

  listar(filtro = '') {
    const q = String(filtro ?? '').trim().toLowerCase();
    if (!q) return this.programas.map((p) => ({ ...p }));
    return this.programas
      .filter((p) => p.nome.toLowerCase().includes(q))
      .map((p) => ({ ...p }));
  }

  _normalizarLista(programas) {
    return programas
      .map((p) => ({ numero: Number(p.numero), nome: String(p.nome ?? '').replace(/\0/g, '').trim() }))
      .filter((p) => Number.isInteger(p.numero) && p.numero >= 0 && p.nome)
      .sort((a, b) => a.numero - b.numero);
  }
}
```

- [ ] **Step 4: Run cache tests and confirm pass**

Run:

```bash
node --test tests/program-cache.test.js
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/camera/program-cache.js tests/program-cache.test.js
git commit -m "feat: add camera program cache"
```

---

### Task 2: CameraManager Cache Integration

**Files:**
- Modify: `src/camera/camera-manager.js`
- Modify: `tests/camera-manager.test.js`

- [ ] **Step 1: Add failing tests for cache listing, refresh, and active blocking**

Append to `tests/camera-manager.test.js`:

```js
test('listarProgramas carrega cache local sem consultar camera fisica', async () => {
  const client = new FakeClient();
  const cache = {
    carregou: 0,
    async carregar() { this.carregou++; return [{ numero: 5, nome: 'PECA-CACHE' }]; },
    listar(q = '') {
      const lista = [{ numero: 5, nome: 'PECA-CACHE' }];
      return q ? lista.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase())) : lista;
    },
    async salvar() { throw new Error('nao deveria salvar'); },
  };
  const m = new CameraManager({ cameraId: 1, client, programCache: cache });
  await m.conectar();

  const lista = await m.listarProgramas('cache');

  assert.deepEqual(lista, [{ numero: 5, nome: 'PECA-CACHE' }]);
  assert.equal(cache.carregou, 1);
  assert.deepEqual(client.comandos, []);
});

test('atualizarProgramas varre camera livre e salva cache local', async () => {
  const client = new FakeClient();
  const salvos = [];
  const cache = {
    async carregar() { return []; },
    listar() { return salvos.at(-1) ?? []; },
    async salvar(programas) { salvos.push(programas); return programas; },
  };
  const m = new CameraManager({ cameraId: 1, client, maxProgramas: 2, programCache: cache });
  await m.conectar();
  client.enviaComando = async (cmd) => {
    client.comandos.push(cmd);
    if (cmd === 'PR') return { tipo: 'resposta', comando: 'PR', valores: ['000'] };
    if (cmd === 'PNR') return { tipo: 'resposta', comando: 'PNR', valores: [`PECA-${client.comandos.filter((c) => c === 'PNR').length}`] };
    return { tipo: 'resposta', comando: cmd.split(',')[0], valores: [] };
  };

  const lista = await m.atualizarProgramas();

  assert.deepEqual(lista, [{ numero: 0, nome: 'PECA-0' }, { numero: 1, nome: 'PECA-1' }]);
  assert.deepEqual(salvos.at(-1), lista);
  assert.ok(client.comandos.includes('PW,000'));
  assert.ok(client.comandos.includes('PW,001'));
});

test('atualizarProgramas bloqueia quando a camera esta ativa', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  await m.conectar();
  await m.ativarSessao({ programaNumero: 2 });

  await assert.rejects(
    () => m.atualizarProgramas(),
    /Camera 1 esta com sessao ativa/i
  );
});

test('conectar emite evento conectada uma vez por conexao bem-sucedida', async () => {
  const client = new FakeClient();
  const m = new CameraManager({ cameraId: 1, client });
  const eventos = [];
  m.on('conectada', (payload) => eventos.push(payload));

  await m.conectar();

  assert.deepEqual(eventos, [{ cameraId: 1 }]);
});
```

- [ ] **Step 2: Run manager tests and confirm failure**

Run:

```bash
node --test tests/camera-manager.test.js
```

Expected: FAIL with `m.listarProgramas is not a function` or `m.atualizarProgramas is not a function`.

- [ ] **Step 3: Update `CameraManager` constructor and connect event**

In `src/camera/camera-manager.js`, add `programCache = null` to the constructor argument list and assign it:

```js
    programCache = null,
```

```js
    this.programCache = programCache;
```

At the end of successful `conectar()`, after `this.emit('estado', this.estado);`, add:

```js
      this.emit('conectada', { cameraId: this.cameraId });
```

- [ ] **Step 4: Add cache and refresh methods to `CameraManager`**

In `src/camera/camera-manager.js`, replace `descobrirProgramas()` and add these methods:

```js
  async carregarCacheProgramas() {
    if (!this.programCache) return this._listarProgramasMemoria();
    const lista = await this.programCache.carregar();
    this.programas = new Map(lista.map((p) => [p.numero, p.nome]));
    return this._listarProgramasMemoria();
  }

  async listarProgramas(filtro = '') {
    if (this.programas.size === 0) {
      await this.carregarCacheProgramas();
    }
    return filtro ? this.buscarProgramas(filtro) : this._listarProgramasMemoria();
  }

  async atualizarProgramas() {
    if (this.estado === 'ativa') {
      throw new Error(`Camera ${this.cameraId} esta com sessao ativa. Encerre a sessao antes de atualizar programas.`);
    }
    if (this.estado === 'desconectada' || !this.client?.conectado) {
      throw new Error(`Camera ${this.cameraId} desconectada.`);
    }
    const lista = await this.descobrirProgramas({ force: true });
    if (this.programCache) await this.programCache.salvar(lista);
    return lista;
  }

  async descobrirProgramas({ force = false } = {}) {
    if (this.estado === 'ativa') {
      throw new Error(`Camera ${this.cameraId} esta com sessao ativa. Encerre a sessao antes de atualizar programas.`);
    }
    if (!force && this.programas.size > 0) return this._listarProgramasMemoria();
    this.programas.clear();
    const original = await this._lerProgramaAtual();
    const falhas = [];
    for (let n = 0; n < this.maxProgramas; n++) {
      const prog = String(n).padStart(3, '0');
      try {
        await this.client.enviaComando(`PW,${prog}`);
        const r = await this.client.enviaComando('PNR');
        const nome = this._normalizarNomePrograma(r.valores?.[0]);
        if (nome && nome !== '-' && nome !== '(no name)') {
          this.programas.set(n, nome);
        }
      } catch (error) {
        falhas.push(error);
      }
      if (this.intervaloDescobertaMs > 0 && n < this.maxProgramas - 1) {
        await this.sleep(this.intervaloDescobertaMs);
      }
    }
    if (original != null) {
      try { await this.client.enviaComando(`PW,${String(original).padStart(3, '0')}`); } catch (_) {}
    }
    if (this.programas.size === 0 && falhas.length > 0) {
      throw falhas[0];
    }
    return this._listarProgramasMemoria();
  }

  _listarProgramasMemoria() {
    return [...this.programas.entries()].map(([numero, nome]) => ({ numero, nome }));
  }
```

Leave `buscarProgramas()` as the filter over `this.programas`.

- [ ] **Step 5: Run manager tests and confirm pass**

Run:

```bash
node --test tests/camera-manager.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/camera/camera-manager.js tests/camera-manager.test.js
git commit -m "feat: integrate program cache with camera manager"
```

---

### Task 3: Program Routes

**Files:**
- Modify: `src/http/routes/programas.js`
- Create: `tests/programas-routes.test.js`

- [ ] **Step 1: Write failing route tests**

Create `tests/programas-routes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasProgramas } from '../src/http/routes/programas.js';

async function app(cameraManagers) {
  const fastify = Fastify({ logger: false });
  rotasProgramas(fastify, { cameraManagers });
  await fastify.ready();
  return fastify;
}

test('GET /programas retorna apenas cache da camera selecionada', async () => {
  const chamadas = [];
  const fastify = await app(new Map([
    [1, { cameraId: 1, async listarProgramas(q) { chamadas.push(['c1', q]); return [{ numero: 1, nome: 'CAM1-A' }]; } }],
    [2, { cameraId: 2, async listarProgramas(q) { chamadas.push(['c2', q]); return [{ numero: 2, nome: 'CAM2-A' }]; } }],
  ]));

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=2&q=cam2' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 2, nome: 'CAM2-A' }]);
  assert.deepEqual(chamadas, [['c2', 'cam2']]);
});

test('GET /programas nao exige camera conectada quando cache existe', async () => {
  const fastify = await app(new Map([
    [1, {
      cameraId: 1,
      estado: 'desconectada',
      client: { conectado: false },
      async listarProgramas() { return [{ numero: 4, nome: 'CACHE-OFFLINE' }]; },
    }],
  ]));

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=1' });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 4, nome: 'CACHE-OFFLINE' }]);
});

test('POST /programas/atualizar atualiza apenas camera selecionada', async () => {
  const chamadas = [];
  const fastify = await app(new Map([
    [1, { cameraId: 1, async atualizarProgramas() { chamadas.push('c1'); return [{ numero: 1, nome: 'A' }]; } }],
    [2, { cameraId: 2, async atualizarProgramas() { chamadas.push('c2'); return [{ numero: 2, nome: 'B' }]; } }],
  ]));

  const r = await fastify.inject({ method: 'POST', url: '/programas/atualizar', payload: { camera: 1 } });

  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), [{ numero: 1, nome: 'A' }]);
  assert.deepEqual(chamadas, ['c1']);
});

test('POST /programas/atualizar bloqueia camera ativa', async () => {
  const fastify = await app(new Map([
    [1, {
      cameraId: 1,
      async atualizarProgramas() {
        throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de atualizar programas.');
      },
    }],
  ]));

  const r = await fastify.inject({ method: 'POST', url: '/programas/atualizar', payload: { camera: 1 } });

  assert.equal(r.statusCode, 409);
  assert.match(r.json().erro, /Camera 1 esta com sessao ativa/);
});

test('GET /programas retorna 404 para camera desconhecida', async () => {
  const fastify = await app(new Map());

  const r = await fastify.inject({ method: 'GET', url: '/programas?camera=99' });

  assert.equal(r.statusCode, 404);
  assert.match(r.json().erro, /camera 99 desconhecida/i);
});
```

- [ ] **Step 2: Run route tests and confirm failure**

Run:

```bash
node --test tests/programas-routes.test.js
```

Expected: FAIL because current route calls `descobrirProgramas()` on empty cache and has no `POST /programas/atualizar`.

- [ ] **Step 3: Replace program routes**

Replace `src/http/routes/programas.js` with:

```js
export function rotasProgramas(fastify, { cameraManagers }) {
  fastify.get('/programas', async (req, reply) => {
    const camera = Number(req.query.camera);
    const q = String(req.query.q ?? '');
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    try {
      return await m.listarProgramas(q);
    } catch (e) {
      return reply.code(500).send({ erro: `falha ao carregar programas da camera ${camera}: ${e.message}` });
    }
  });

  fastify.post('/programas/atualizar', async (req, reply) => {
    const camera = Number(req.body?.camera);
    const m = cameraManagers.get(camera);
    if (!m) return reply.code(404).send({ erro: `camera ${camera} desconhecida` });
    try {
      return await m.atualizarProgramas();
    } catch (e) {
      const msg = e.message ?? '';
      if (/sessao ativa/i.test(msg)) return reply.code(409).send({ erro: msg });
      if (/desconectada/i.test(msg)) return reply.code(503).send({ erro: msg });
      return reply.code(500).send({ erro: `falha ao atualizar programas da camera ${camera}: ${msg}` });
    }
  });
}
```

- [ ] **Step 4: Run route tests and confirm pass**

Run:

```bash
node --test tests/programas-routes.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/http/routes/programas.js tests/programas-routes.test.js
git commit -m "feat: serve camera programs from isolated cache"
```

---

### Task 4: Occupied Camera Session Gate

**Files:**
- Modify: `src/domain/sessao-service.js`
- Modify: `tests/sessao-service.test.js`
- Modify: `tests/sessoes-routes.test.js`
- Modify: `tests/frontend/pages/iniciar-sessao.test.js`

- [ ] **Step 1: Add failing service test for exact camera-active message**

Append to `tests/sessao-service.test.js`:

```js
test('abrir bloqueia camera com sessao ativa e retorna mensagem para o formulario', async () => {
  const { svc } = setup();
  const s1 = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 });

  await assert.rejects(
    () => svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP2', codigo_operador: '001', camera_id: 1 }),
    {
      message: `Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.`,
    }
  );
  assert.equal(s1.camera_id, 1);
});
```

- [ ] **Step 2: Add failing route test for form gate**

Append to `tests/sessoes-routes.test.js`:

```js
test('POST /sessoes bloqueia quando camera informada ja possui sessao ativa', async () => {
  const { fastify } = await bootstrap();
  await fastify.inject({
    method: 'POST',
    url: '/sessoes',
    payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 },
  });

  const r = await fastify.inject({
    method: 'POST',
    url: '/sessoes',
    payload: { numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1 },
  });

  assert.equal(r.statusCode, 400);
  assert.equal(r.json().erro, 'Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
});
```

- [ ] **Step 3: Add frontend test for remaining on the first form**

Append to `tests/frontend/pages/iniciar-sessao.test.js`:

```js
test('renderIniciarSessao nao avanca quando camera informada esta em sessao ativa', async () => {
  const { ctx } = criarCtx();
  ctx.sessoesSvc.abrir = async () => {
    throw new Error('Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.');
  };
  const el = await renderIniciarSessao(ctx, { numeroEmbarque: '01' });
  document.body.appendChild(el);

  el.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  el.querySelector('[data-input="codigo_operador"]').value = '1807';
  el.querySelector('[data-input="camera_id"]').value = '1';
  el.querySelector('[data-submit-abrir-sessao]').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(el.querySelector('[data-stage="programa"]'), null);
  assert.match(document.body.textContent, /Camera 1 esta com sessao ativa/);
});
```

- [ ] **Step 4: Run targeted tests and confirm failure**

Run:

```bash
node --test tests/sessao-service.test.js tests/sessoes-routes.test.js tests/frontend/pages/iniciar-sessao.test.js
```

Expected: service/route tests fail on message mismatch; frontend may already pass once message propagates.

- [ ] **Step 5: Update occupied-camera message**

In `src/domain/sessao-service.js`, replace:

```js
    if (atual) throw new Error(`Câmera ${camera_id} já tem sessão ativa (${atual.id}).`);
```

with:

```js
    if (atual) throw new Error(`Camera ${camera_id} esta com sessao ativa. Encerre a sessao antes de continuar.`);
```

- [ ] **Step 6: Run targeted tests and confirm pass**

Run:

```bash
node --test tests/sessao-service.test.js tests/sessoes-routes.test.js tests/frontend/pages/iniciar-sessao.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/domain/sessao-service.js tests/sessao-service.test.js tests/sessoes-routes.test.js tests/frontend/pages/iniciar-sessao.test.js
git commit -m "fix: block session start on occupied camera"
```

---

### Task 5: Boot and Reconnect Refresh

**Files:**
- Create: `src/camera/programas-boot.js`
- Create: `tests/programas-boot.test.js`
- Modify: `src/server.js`

- [ ] **Step 1: Write failing boot-refresh tests**

Create `tests/programas-boot.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizarCacheProgramasAoConectar } from '../src/camera/programas-boot.js';

test('atualizarCacheProgramasAoConectar carrega cache e atualiza camera livre', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'suspensa',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); return [{ numero: 1, nome: 'A' }]; },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache', 'atualizar-programas']);
});

test('atualizarCacheProgramasAoConectar nao varre camera com sessao ativa no banco', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'suspensa',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => true,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache']);
});

test('atualizarCacheProgramasAoConectar mantem cache em disco quando refresh falha', async () => {
  const avisos = [];
  const manager = {
    cameraId: 2,
    estado: 'suspensa',
    async carregarCacheProgramas() {},
    async atualizarProgramas() { throw new Error('timeout comando PNR'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn: (payload, msg) => avisos.push({ payload, msg }) },
  });

  assert.equal(avisos.length, 1);
  assert.match(avisos[0].msg, /falha ao atualizar cache de programas/i);
});

test('atualizarCacheProgramasAoConectar nao varre camera desconectada', async () => {
  const chamadas = [];
  const manager = {
    cameraId: 1,
    estado: 'desconectada',
    async carregarCacheProgramas() { chamadas.push('carregar-cache'); },
    async atualizarProgramas() { chamadas.push('atualizar-programas'); },
  };

  await atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: () => false,
    logger: { warn() {} },
  });

  assert.deepEqual(chamadas, ['carregar-cache']);
});
```

- [ ] **Step 2: Run boot tests and confirm failure**

Run:

```bash
node --test tests/programas-boot.test.js
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement boot refresh helper**

Create `src/camera/programas-boot.js`:

```js
export async function atualizarCacheProgramasAoConectar({ manager, existeSessaoAtiva, logger = console }) {
  try {
    await manager.carregarCacheProgramas?.();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao carregar cache local de programas');
  }

  if (manager.estado === 'desconectada' || manager.estado === 'ativa') return;
  if (existeSessaoAtiva(manager.cameraId)) return;

  try {
    await manager.atualizarProgramas();
  } catch (error) {
    logger.warn?.({ err: error, cameraId: manager.cameraId }, 'falha ao atualizar cache de programas');
  }
}
```

- [ ] **Step 4: Wire cache and boot refresh in `server.js`**

In `src/server.js`, add imports:

```js
import { buscarAtivaPorCamera } from './db/queries/sessoes.js';
import { ProgramCache } from './camera/program-cache.js';
import { atualizarCacheProgramasAoConectar } from './camera/programas-boot.js';
```

When constructing each `CameraManager`, pass `programCache`:

```js
    const manager = new CameraManager({
      cameraId: cfg.id,
      client,
      logger,
      maxProgramas: config.camera.programScanMax,
      intervaloDescobertaMs: config.camera.programScanDelayMs,
      programCache: new ProgramCache({ cameraId: cfg.id }),
    });
```

After camera event listeners are registered and before the final connect loop, add:

```js
  const atualizarProgramasDaCamera = (manager) => atualizarCacheProgramasAoConectar({
    manager,
    existeSessaoAtiva: (cameraId) => Boolean(buscarAtivaPorCamera(db, cameraId)),
    logger,
  });
```

Inside the existing `for (const manager of cameraManagers.values())` listener block, add:

```js
    manager.on('conectada', () => {
      atualizarProgramasDaCamera(manager).catch((e) => logger.warn({ err: e, cameraId: manager.cameraId }, 'refresh de programas falhou'));
    });
```

Keep the existing final connect loop:

```js
  for (const m of cameraManagers.values()) m.conectar().catch(e => logger.warn({ err: e, cameraId: m.cameraId }, 'falha inicial na câmera'));
```

The `conectada` event from Task 2 triggers the boot refresh on startup and on reconnect.

- [ ] **Step 5: Run boot tests and camera manager tests**

Run:

```bash
node --test tests/programas-boot.test.js tests/camera-manager.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/camera/programas-boot.js tests/programas-boot.test.js src/server.js
git commit -m "feat: refresh program cache on camera connect"
```

---

### Task 6: Full Verification

**Files:**
- No new files.
- Run whole test suite.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Verify git diff contains only intended feature files**

Run:

```bash
git status --short
```

Expected: only pre-existing unrelated workspace changes remain, or clean if those were not present in the implementation worktree.

- [ ] **Step 3: Manual smoke with fake Keyence**

Terminal 1:

```bash
npm run fake-keyence
```

Terminal 2:

```bash
npm run dev
```

Browser/API checks:

```bash
curl http://localhost:3000/programas?camera=1
curl -X POST http://localhost:3000/programas/atualizar -H "Content-Type: application/json" -d "{\"camera\":1}"
```

Expected:

- `GET /programas?camera=1` returns only camera 1 cached programs.
- `POST /programas/atualizar` returns refreshed programs when no session is active.
- Starting a second session with the same camera returns `Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.`

- [ ] **Step 4: Final commit if any verification-only fixes were needed**

If verification required fixes, commit them:

```bash
git add <files changed by verification fixes>
git commit -m "fix: stabilize camera program isolation"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage: covered per-camera disk cache, boot/restart refresh, cache-only listing, explicit refresh, active-camera blocking on form continue, and no database/Supabase schema changes.
- Placeholder scan: plan uses concrete files, commands, expected results, and code snippets for each implementation task.
- Type consistency: `ProgramCache.carregar/salvar/listar`, `CameraManager.carregarCacheProgramas/listarProgramas/atualizarProgramas`, and `atualizarCacheProgramasAoConectar` signatures are consistent across tasks.
