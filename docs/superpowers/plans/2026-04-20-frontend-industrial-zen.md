# Frontend Industrial Zen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o MVP atual do frontend (`public/operador/index.html` + `public/tv/index.html`) por uma SPA que aplica o design system Industrial Zen (12 telas do diretório `stitch_sistema_contagem_rei_autoparts/`) mantendo o back-end Fastify/WebSocket intacto.

**Architecture:** Zero-build (Tailwind via CDN continua), SPA vanilla com roteador hash + módulos ESM. Organização DDD no frontend: **infra** (api/ws/router/formatters), **domain** (state managers puros por agregado: sync, câmeras, sessões, embarques, programas, relatórios, eventos), **ui/primitives** (Button, Input, Badge, Modal, Card, Icon, SideNav, TopNav, Toast — peças reutilizáveis), **ui/composites** (formulários, painéis, modais específicos), **pages** (orquestração). Tudo TDD: cada módulo/componente tem arquivo de teste antes da implementação.

**Tech Stack:** HTML5 + Tailwind via CDN (já carregado), Material Symbols (já no design), Inter + Manrope (Google Fonts), JS ESM vanilla. Testes: `node:test` nativo + `happy-dom` como dev dependency (render DOM headless sem jsdom pesado). Reaproveita `src/server.js` sem alterações — só adiciona novas rotas estáticas do Fastify `@fastify/static` (já registrado).

**Referências de design:**
- DESIGN.md: `stitch_sistema_contagem_rei_autoparts/industrial_zen/DESIGN.md` — paleta, tipografia, regras no-line, glassmorphism
- Telas: `stitch_sistema_contagem_rei_autoparts/<screen>/code.html` (11 telas)

**Back-end disponível (NÃO mexer):**
- `GET /health`, `GET /embarques?status=aberto`, `GET /embarques/:n`
- `GET /ops?q=`, `GET /operadores`
- `GET /programas?camera=&q=`
- `POST /sessoes`, `POST /sessoes/:id/confirmar`, `POST /sessoes/:id/encerrar`, `GET /sessoes`
- `GET /relatorios/embarque/:numero?fmt=csv|xlsx|pdf`
- WebSocket `/ws` — eventos: `sync.status`, `contagem.incrementada`, `sessao.atualizada`, `camera.estado`

---

## Fase 0 — Scaffolding

### Task 1: Instalar happy-dom + criar estrutura de diretórios

**Files:**
- Modify: `package.json`
- Create: `public/css/`, `public/js/infra/`, `public/js/domain/`, `public/js/ui/primitives/`, `public/js/ui/composites/`, `public/js/pages/`
- Create: `tests/frontend/_helpers/`, `tests/frontend/infra/`, `tests/frontend/domain/`, `tests/frontend/ui/`, `tests/frontend/pages/`

- [ ] **Step 1: Adicionar happy-dom como devDependency**

Editar `package.json`:
```json
"devDependencies": {
  "happy-dom": "^15.0.0"
}
```

- [ ] **Step 2: Instalar**

Run: `npm install`
Expected: `added 1 package` ou similar.

- [ ] **Step 3: Criar diretórios (comandos separados — o glob não cria pastas vazias)**

```bash
mkdir -p public/css public/js/infra public/js/domain public/js/ui/primitives public/js/ui/composites public/js/pages
mkdir -p tests/frontend/_helpers tests/frontend/infra tests/frontend/domain tests/frontend/ui tests/frontend/pages
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(frontend): add happy-dom devDependency + scaffold directories"
```

---

### Task 2: Helper de testes DOM

**Files:**
- Create: `tests/frontend/_helpers/dom.js`
- Create: `tests/frontend/_helpers/dom.test.js`

- [ ] **Step 1: Escrever teste do helper**

`tests/frontend/_helpers/dom.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from './dom.js';

test('criarDOM injeta document/window globais', () => {
  criarDOM();
  assert.ok(globalThis.document);
  assert.ok(globalThis.window);
  assert.equal(globalThis.document.body.innerHTML, '');
  limparDOM();
});

test('limparDOM remove globais', () => {
  criarDOM();
  limparDOM();
  assert.equal(globalThis.document, undefined);
});

test('criarDOM permite query seletor', () => {
  criarDOM('<div id="x">oi</div>');
  assert.equal(document.getElementById('x').textContent, 'oi');
  limparDOM();
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `node --test tests/frontend/_helpers/dom.test.js`
Expected: FAIL (`Cannot find module './dom.js'`)

- [ ] **Step 3: Implementar helper**

`tests/frontend/_helpers/dom.js`:
```js
import { Window } from 'happy-dom';

let _window = null;

export function criarDOM(html = '') {
  _window = new Window();
  _window.document.body.innerHTML = html;
  globalThis.window = _window;
  globalThis.document = _window.document;
  globalThis.HTMLElement = _window.HTMLElement;
  globalThis.CustomEvent = _window.CustomEvent;
  globalThis.Event = _window.Event;
}

export function limparDOM() {
  if (_window) { _window.close(); _window = null; }
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.HTMLElement;
  delete globalThis.CustomEvent;
  delete globalThis.Event;
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `node --test tests/frontend/_helpers/dom.test.js`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add tests/frontend/_helpers/dom.js tests/frontend/_helpers/dom.test.js
git commit -m "test(frontend): add happy-dom test helper"
```

---

### Task 3: Design tokens — `public/css/tokens.css`

**Files:**
- Create: `public/css/tokens.css`

Extraído de `stitch_sistema_contagem_rei_autoparts/inicial_dashboard_ultra_clean/code.html` linhas 12-80 (cores + radii + fontes).

- [ ] **Step 1: Criar `public/css/tokens.css`**

```css
:root {
  --surface: #f8f9fa;
  --surface-dim: #d1dce0;
  --surface-bright: #f8f9fa;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f1f4f6;
  --surface-container: #eaeff1;
  --surface-container-high: #e3e9ec;
  --surface-container-highest: #dbe4e7;
  --on-surface: #2b3437;
  --on-surface-variant: #586064;
  --background: #f8f9fa;
  --on-background: #2b3437;
  --primary: #516169;
  --primary-dim: #45555d;
  --primary-container: #d5e5ef;
  --primary-fixed: #d5e5ef;
  --primary-fixed-dim: #c7d7e1;
  --on-primary: #f0f9ff;
  --on-primary-container: #45545c;
  --secondary: #40665d;
  --secondary-dim: #345a51;
  --secondary-container: #c1ebdf;
  --secondary-fixed: #c1ebdf;
  --secondary-fixed-dim: #b3ddd1;
  --on-secondary: #e3fff6;
  --on-secondary-container: #325950;
  --tertiary: #46655e;
  --tertiary-dim: #3a5952;
  --tertiary-container: #d8fbf2;
  --on-tertiary: #e3fff7;
  --on-tertiary-container: #42625b;
  --error: #9f403d;
  --error-dim: #4e0309;
  --error-container: #fe8983;
  --on-error: #fff7f6;
  --on-error-container: #752121;
  --outline: #737c7f;
  --outline-variant: #abb3b7;
  --inverse-surface: #0c0f10;
  --inverse-on-surface: #9b9d9e;
  --inverse-primary: #e0f0fb;

  --font-body: 'Inter', system-ui, sans-serif;
  --font-headline: 'Manrope', system-ui, sans-serif;

  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
}

html, body { font-family: var(--font-body); color: var(--on-surface); background: var(--background); }
h1, h2, h3, .font-headline { font-family: var(--font-headline); }

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
}

.zen-glass {
  background: rgba(248, 249, 250, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.zen-satin {
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dim) 100%);
}

.zen-shadow-ambient {
  box-shadow: 0 8px 40px rgba(43, 52, 55, 0.06);
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/tokens.css
git commit -m "feat(frontend): add Industrial Zen design tokens"
```

---

## Fase 1 — Infraestrutura (TDD)

### Task 4: API client — `public/js/infra/api.js`

**Files:**
- Create: `public/js/infra/api.js`
- Test: `tests/frontend/infra/api.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/infra/api.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarApi } from '../../../public/js/infra/api.js';

let fetchCalls;
function fakeFetch(resp) {
  fetchCalls = [];
  return async (url, opts) => { fetchCalls.push({ url, opts }); return resp; };
}

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('get retorna JSON em caso de 2xx', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: true, json: async () => ({ a: 1 }) }) });
  const r = await api.get('/foo');
  assert.deepEqual(r, { a: 1 });
  assert.equal(fetchCalls[0].url, 'http://x/foo');
});

test('post envia JSON e Content-Type', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: true, json: async () => ({ ok: true }) }) });
  await api.post('/bar', { n: 2 });
  const opts = fetchCalls[0].opts;
  assert.equal(opts.method, 'POST');
  assert.equal(opts.headers['Content-Type'], 'application/json');
  assert.equal(opts.body, '{"n":2}');
});

test('erro HTTP 4xx captura mensagem do corpo', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: false, status: 400, json: async () => ({ erro: 'bad' }), statusText: 'Bad Request' }) });
  await assert.rejects(api.post('/x', {}), /bad/);
});

test('erro sem JSON usa statusText', async () => {
  const api = criarApi({ base: 'http://x', fetch: fakeFetch({ ok: false, status: 500, json: async () => { throw new Error('no json'); }, statusText: 'Server Error' }) });
  await assert.rejects(api.post('/x', {}), /Server Error/);
});
```

- [ ] **Step 2: Rodar — FAIL**

Run: `node --test tests/frontend/infra/api.test.js`
Expected: FAIL (módulo ainda não existe).

- [ ] **Step 3: Implementar**

`public/js/infra/api.js`:
```js
export function criarApi({ base = '', fetch = globalThis.fetch } = {}) {
  async function get(path) {
    const r = await fetch(`${base}${path}`);
    if (!r.ok) {
      let msg;
      try { const body = await r.json(); msg = body.erro ?? r.statusText; }
      catch (_) { msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  }
  async function post(path, body) {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      let msg;
      try { const b = await r.json(); msg = b.erro ?? r.statusText; }
      catch (_) { msg = r.statusText; }
      throw new Error(msg);
    }
    return r.json();
  }
  return { get, post };
}

export const api = criarApi({ base: globalThis.location?.origin ?? '' });
```

- [ ] **Step 4: Rodar — PASS**

Run: `node --test tests/frontend/infra/api.test.js`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add public/js/infra/api.js tests/frontend/infra/api.test.js
git commit -m "feat(frontend): api client with error normalization + tests"
```

---

### Task 5: WS hub — `public/js/infra/ws.js`

**Files:**
- Create: `public/js/infra/ws.js`
- Test: `tests/frontend/infra/ws.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/infra/ws.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarWS } from '../../../public/js/infra/ws.js';

class FakeWS {
  constructor() { this.handlers = {}; FakeWS.last = this; }
  addEventListener(ev, fn) { (this.handlers[ev] ??= []).push(fn); }
  dispatch(ev, data) { for (const fn of (this.handlers[ev] ?? [])) fn(data); }
}

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('despacha evento customizado ao receber mensagem', async () => {
  const ws = criarWS({ url: 'ws://x', WS: FakeWS });
  let capturado = null;
  document.addEventListener('ws:sync.status', (e) => { capturado = e.detail; });
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'sync.status', payload: { estado: 'ONLINE' } }) });
  assert.deepEqual(capturado, { estado: 'ONLINE' });
});

test('on registra listener com remoção', () => {
  const ws = criarWS({ url: 'ws://x', WS: FakeWS });
  let n = 0;
  const off = ws.on('contagem.incrementada', () => n++);
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'contagem.incrementada', payload: {} }) });
  off();
  FakeWS.last.dispatch('message', { data: JSON.stringify({ evento: 'contagem.incrementada', payload: {} }) });
  assert.equal(n, 1);
});
```

- [ ] **Step 2: Rodar — FAIL**

- [ ] **Step 3: Implementar**

`public/js/infra/ws.js`:
```js
export function criarWS({ url, WS = globalThis.WebSocket } = {}) {
  const sock = new WS(url);
  sock.addEventListener('message', (m) => {
    let parsed;
    try { parsed = JSON.parse(m.data); } catch { return; }
    if (!parsed?.evento) return;
    document.dispatchEvent(new CustomEvent(`ws:${parsed.evento}`, { detail: parsed.payload }));
  });
  function on(evento, fn) {
    const handler = (e) => fn(e.detail);
    document.addEventListener(`ws:${evento}`, handler);
    return () => document.removeEventListener(`ws:${evento}`, handler);
  }
  return { on, socket: sock };
}
```

- [ ] **Step 4: Rodar — PASS** e **Commit**

```bash
git add public/js/infra/ws.js tests/frontend/infra/ws.test.js
git commit -m "feat(frontend): ws infra with CustomEvent dispatch + tests"
```

---

### Task 6: Hash router — `public/js/infra/router.js`

**Files:**
- Create: `public/js/infra/router.js`
- Test: `tests/frontend/infra/router.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/infra/router.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarRouter } from '../../../public/js/infra/router.js';

beforeEach(() => criarDOM('<div id="root"></div>'));
afterEach(() => limparDOM());

test('roteia rota exata', async () => {
  let rendered = '';
  const router = criarRouter({
    root: '#root',
    rotas: {
      '/': () => 'inicial',
      '/cargas': () => 'cargas',
    },
    render: (html) => { rendered = html; },
  });
  window.location.hash = '#/cargas';
  await router.resolver();
  assert.equal(rendered, 'cargas');
});

test('fallback para rota desconhecida renderiza "/"', async () => {
  let rendered = '';
  const router = criarRouter({
    root: '#root',
    rotas: { '/': () => 'home' },
    render: (html) => { rendered = html; },
  });
  window.location.hash = '#/xyz';
  await router.resolver();
  assert.equal(rendered, 'home');
});

test('extrai params de rota dinâmica', async () => {
  let capturado = null;
  const router = criarRouter({
    root: '#root',
    rotas: { '/cargas/:numero': (params) => { capturado = params; return 'x'; } },
    render: () => {},
  });
  window.location.hash = '#/cargas/SHP-42';
  await router.resolver();
  assert.deepEqual(capturado, { numero: 'SHP-42' });
});
```

- [ ] **Step 2: Rodar — FAIL**

- [ ] **Step 3: Implementar**

`public/js/infra/router.js`:
```js
export function criarRouter({ root, rotas, render }) {
  const entradas = Object.entries(rotas).map(([pattern, handler]) => {
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    return { pattern, regex, handler };
  });

  async function resolver() {
    const hash = (window.location.hash || '#/').slice(1);
    for (const { regex, handler } of entradas) {
      const m = hash.match(regex);
      if (m) {
        const html = await handler(m.groups ?? {});
        if (typeof render === 'function') render(html);
        else document.querySelector(root).innerHTML = html;
        return;
      }
    }
    const fallback = rotas['/'];
    if (fallback) {
      const html = await fallback({});
      if (typeof render === 'function') render(html);
      else document.querySelector(root).innerHTML = html;
    }
  }

  window.addEventListener('hashchange', resolver);
  return { resolver };
}
```

- [ ] **Step 4: Rodar — PASS** e **Commit**

```bash
git add public/js/infra/router.js tests/frontend/infra/router.test.js
git commit -m "feat(frontend): hash router with param extraction + tests"
```

---

### Task 7: Formatters — `public/js/infra/formatters.js`

**Files:**
- Create: `public/js/infra/formatters.js`
- Test: `tests/frontend/infra/formatters.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/infra/formatters.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarData, formatarNumero, formatarHora, rotuloSync } from '../../../public/js/infra/formatters.js';

test('formatarData ISO → DD/MM/AAAA', () => {
  assert.equal(formatarData('2026-04-20T10:44:58.524Z'), '20/04/2026');
});

test('formatarHora ISO → HH:mm', () => {
  assert.equal(formatarHora('2026-04-20T10:44:58.524Z').length, 5);
});

test('formatarNumero insere separador de milhar', () => {
  assert.equal(formatarNumero(1234567), '1.234.567');
});

test('rotuloSync traduz estado', () => {
  assert.equal(rotuloSync('ONLINE'), 'Online');
  assert.equal(rotuloSync('OFFLINE'), 'Offline');
  assert.equal(rotuloSync('RECOVERY'), 'Recuperando');
});
```

- [ ] **Step 2: Rodar — FAIL**

- [ ] **Step 3: Implementar**

`public/js/infra/formatters.js`:
```js
export function formatarData(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}
export function formatarHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function formatarNumero(n) {
  return (Number(n) || 0).toLocaleString('pt-BR');
}
const ROTULOS_SYNC = { ONLINE: 'Online', OFFLINE: 'Offline', RECOVERY: 'Recuperando' };
export function rotuloSync(estado) { return ROTULOS_SYNC[estado] ?? estado; }
```

- [ ] **Step 4: Rodar — PASS** e **Commit**

```bash
git add public/js/infra/formatters.js tests/frontend/infra/formatters.test.js
git commit -m "feat(frontend): pt-BR formatters + tests"
```

---

## Fase 2 — Domain (TDD)

### Task 8: Sync state manager — `public/js/domain/sync-state.js`

Agregado: estado de conexão (`ONLINE` | `OFFLINE` | `RECOVERY`) + outbox_pendentes. Atualizado por polling `/health` e por eventos `ws:sync.status`.

**Files:**
- Create: `public/js/domain/sync-state.js`
- Test: `tests/frontend/domain/sync-state.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/domain/sync-state.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarSyncState } from '../../../public/js/domain/sync-state.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('estado inicial é DESCONHECIDO', () => {
  const s = criarSyncState();
  assert.equal(s.atual().estado, 'DESCONHECIDO');
});

test('aplicaHealth atualiza estado + outbox', () => {
  const s = criarSyncState();
  s.aplicaHealth({ sync: { estado: 'ONLINE', outbox_pendentes: 3 } });
  assert.equal(s.atual().estado, 'ONLINE');
  assert.equal(s.atual().outbox_pendentes, 3);
});

test('notifica subscribers ao mudar', () => {
  const s = criarSyncState();
  const vistos = [];
  s.subscribe(e => vistos.push(e.estado));
  s.aplicaHealth({ sync: { estado: 'ONLINE', outbox_pendentes: 0 } });
  s.aplicaHealth({ sync: { estado: 'OFFLINE', outbox_pendentes: 2 } });
  assert.deepEqual(vistos, ['ONLINE', 'OFFLINE']);
});

test('aplicaEventoWS({estado}) atualiza', () => {
  const s = criarSyncState();
  s.aplicaEventoWS({ estado: 'RECOVERY' });
  assert.equal(s.atual().estado, 'RECOVERY');
});
```

- [ ] **Step 2: Rodar — FAIL**

- [ ] **Step 3: Implementar**

`public/js/domain/sync-state.js`:
```js
export function criarSyncState() {
  let state = { estado: 'DESCONHECIDO', outbox_pendentes: 0 };
  const subs = new Set();

  function notifica() { for (const fn of subs) try { fn(state); } catch {} }

  return {
    atual() { return { ...state }; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    aplicaHealth(h) {
      state = { estado: h.sync.estado, outbox_pendentes: h.sync.outbox_pendentes ?? 0 };
      notifica();
    },
    aplicaEventoWS(payload) {
      state = { ...state, estado: payload.estado };
      notifica();
    },
  };
}
```

- [ ] **Step 4: PASS** e **Commit**

```bash
git add public/js/domain/sync-state.js tests/frontend/domain/sync-state.test.js
git commit -m "feat(frontend): sync-state domain aggregate + tests"
```

---

### Task 9: Sessões state — `public/js/domain/sessoes-state.js`

Agregado: sessões ativas por câmera + atualização em tempo real por `ws:sessao.atualizada` e `ws:contagem.incrementada`.

**Files:**
- Create: `public/js/domain/sessoes-state.js`
- Test: `tests/frontend/domain/sessoes-state.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/domain/sessoes-state.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { criarSessoesState } from '../../../public/js/domain/sessoes-state.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('carregarAtivas povoa por câmera', () => {
  const s = criarSessoesState();
  s.carregarAtivas([
    { id: 'a', camera_id: 1, quantidade_total: 10 },
    { id: 'b', camera_id: 2, quantidade_total: 0 },
  ]);
  assert.equal(s.porCamera(1).id, 'a');
  assert.equal(s.porCamera(2).quantidade_total, 0);
});

test('incrementa quantidade_total por evento WS', () => {
  const s = criarSessoesState();
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 5 }]);
  s.aplicaContagem({ camera_id: 1, sessao_id: 'a', quantidade_total: 8 });
  assert.equal(s.porCamera(1).quantidade_total, 8);
});

test('sessao.atualizada substitui registro', () => {
  const s = criarSessoesState();
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 5, status: 'ativa' }]);
  s.aplicaAtualizacao({ id: 'a', camera_id: 1, quantidade_total: 5, status: 'encerrada' });
  assert.equal(s.porCamera(1).status, 'encerrada');
});

test('notifica subscribers', () => {
  const s = criarSessoesState();
  let n = 0;
  s.subscribe(() => n++);
  s.carregarAtivas([{ id: 'a', camera_id: 1, quantidade_total: 0 }]);
  s.aplicaContagem({ camera_id: 1, sessao_id: 'a', quantidade_total: 1 });
  assert.equal(n, 2);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/domain/sessoes-state.js`:
```js
export function criarSessoesState() {
  const porCam = new Map();
  const subs = new Set();
  function notifica() { for (const fn of subs) try { fn([...porCam.values()]); } catch {} }
  return {
    carregarAtivas(list) {
      porCam.clear();
      for (const s of list) porCam.set(s.camera_id, s);
      notifica();
    },
    aplicaContagem({ camera_id, sessao_id, quantidade_total }) {
      const atual = porCam.get(camera_id);
      if (!atual || atual.id !== sessao_id) return;
      porCam.set(camera_id, { ...atual, quantidade_total });
      notifica();
    },
    aplicaAtualizacao(sessao) {
      porCam.set(sessao.camera_id, sessao);
      notifica();
    },
    porCamera(id) { return porCam.get(id); },
    todas() { return [...porCam.values()]; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/domain/sessoes-state.js tests/frontend/domain/sessoes-state.test.js
git commit -m "feat(frontend): sessoes-state domain aggregate + tests"
```

---

### Task 10: Recursos catálogos — `public/js/domain/catalogos.js`

Agregado: embarques abertos, operadores, OPs, programas por câmera. Cache em memória + invalidação manual.

**Files:**
- Create: `public/js/domain/catalogos.js`
- Test: `tests/frontend/domain/catalogos.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/domain/catalogos.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCatalogos } from '../../../public/js/domain/catalogos.js';

function fakeApi() {
  const c = {
    gets: [],
    async get(path) { c.gets.push(path); return c._resp[path] ?? []; },
    _resp: {},
  };
  return c;
}

test('embarquesAbertos usa cache na 2a chamada', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=aberto'] = [{ numero_embarque: '01' }];
  const cat = criarCatalogos({ api });
  await cat.embarquesAbertos();
  await cat.embarquesAbertos();
  assert.equal(api.gets.length, 1);
});

test('invalidarEmbarques força refetch', async () => {
  const api = fakeApi();
  api._resp['/embarques?status=aberto'] = [];
  const cat = criarCatalogos({ api });
  await cat.embarquesAbertos();
  cat.invalidarEmbarques();
  await cat.embarquesAbertos();
  assert.equal(api.gets.length, 2);
});

test('programas por câmera com filtro', async () => {
  const api = fakeApi();
  api._resp['/programas?camera=1&q=B'] = [{ numero: 1, nome: 'PECA-B' }];
  const cat = criarCatalogos({ api });
  const r = await cat.programas(1, 'B');
  assert.equal(r[0].nome, 'PECA-B');
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/domain/catalogos.js`:
```js
export function criarCatalogos({ api }) {
  let cacheEmb = null, cacheOper = null;
  return {
    async embarquesAbertos() {
      if (!cacheEmb) cacheEmb = api.get('/embarques?status=aberto');
      return cacheEmb;
    },
    invalidarEmbarques() { cacheEmb = null; },
    async operadores() {
      if (!cacheOper) cacheOper = api.get('/operadores');
      return cacheOper;
    },
    invalidarOperadores() { cacheOper = null; },
    async ops(q = '') { return api.get(`/ops?q=${encodeURIComponent(q)}`); },
    async programas(cameraId, q = '') { return api.get(`/programas?camera=${cameraId}&q=${encodeURIComponent(q)}`); },
    async embarque(numero) { return api.get(`/embarques/${encodeURIComponent(numero)}`); },
  };
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/domain/catalogos.js tests/frontend/domain/catalogos.test.js
git commit -m "feat(frontend): catalogos domain aggregate with cache + tests"
```

---

### Task 11: Sessões service — `public/js/domain/sessoes-service.js`

Comandos: abrir, confirmar, encerrar. Chama o back-end via api client.

**Files:**
- Create: `public/js/domain/sessoes-service.js`
- Test: `tests/frontend/domain/sessoes-service.test.js`

- [ ] **Step 1: Escrever teste**

`tests/frontend/domain/sessoes-service.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSessoesService } from '../../../public/js/domain/sessoes-service.js';

function fakeApi() {
  const c = {
    posts: [],
    async post(path, body) { c.posts.push({ path, body }); return c._resp ?? { id: 'x' }; },
  };
  return c;
}

test('abrir envia payload para POST /sessoes', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  api._resp = { id: 'u1', camera_id: 1 };
  const r = await svc.abrir({ numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '1', camera_id: 1 });
  assert.equal(api.posts[0].path, '/sessoes');
  assert.equal(r.id, 'u1');
});

test('confirmar manda programa', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  await svc.confirmar('u1', { programaNumero: 2, programaNome: 'PECA-X' });
  assert.equal(api.posts[0].path, '/sessoes/u1/confirmar');
  assert.deepEqual(api.posts[0].body, { programaNumero: 2, programaNome: 'PECA-X' });
});

test('encerrar envia numero_caixa', async () => {
  const api = fakeApi();
  const svc = criarSessoesService({ api });
  await svc.encerrar('u1', 'CX-9');
  assert.deepEqual(api.posts[0].body, { numero_caixa: 'CX-9' });
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/domain/sessoes-service.js`:
```js
export function criarSessoesService({ api }) {
  return {
    async abrir(form) { return api.post('/sessoes', form); },
    async confirmar(id, programa) { return api.post(`/sessoes/${id}/confirmar`, programa); },
    async encerrar(id, numero_caixa) { return api.post(`/sessoes/${id}/encerrar`, { numero_caixa }); },
  };
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/domain/sessoes-service.js tests/frontend/domain/sessoes-service.test.js
git commit -m "feat(frontend): sessoes-service domain commands + tests"
```

---

## Fase 3 — UI primitives (TDD)

Cada primitive é uma **factory** que retorna um HTMLElement já com as classes Tailwind do Industrial Zen aplicadas. Tests via happy-dom verificam estrutura + classes + callbacks.

### Task 12: Icon primitive — `public/js/ui/primitives/icon.js`

Wrapper sobre `<span class="material-symbols-outlined">nome</span>`.

**Files:**
- Create: `public/js/ui/primitives/icon.js`
- Test: `tests/frontend/ui/icon.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Icon } from '../../../public/js/ui/primitives/icon.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Icon cria span material-symbols-outlined', () => {
  const el = Icon('factory');
  assert.equal(el.tagName, 'SPAN');
  assert.match(el.className, /material-symbols-outlined/);
  assert.equal(el.textContent, 'factory');
});

test('Icon aceita classes extras', () => {
  const el = Icon('check_circle', { className: 'text-secondary' });
  assert.match(el.className, /text-secondary/);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/icon.js`:
```js
export function Icon(nome, { className = '' } = {}) {
  const el = document.createElement('span');
  el.className = `material-symbols-outlined ${className}`.trim();
  el.textContent = nome;
  return el;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/icon.js tests/frontend/ui/icon.test.js
git commit -m "feat(frontend): Icon primitive + tests"
```

---

### Task 13: Button primitive — `public/js/ui/primitives/button.js`

Variantes: `primary` (satin gradient), `secondary` (ghost), `icon-only` (círculo).

**Files:**
- Create: `public/js/ui/primitives/button.js`
- Test: `tests/frontend/ui/button.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Button } from '../../../public/js/ui/primitives/button.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('variante primary aplica zen-satin', () => {
  const el = Button({ texto: 'Continuar', variante: 'primary' });
  assert.match(el.className, /zen-satin/);
  assert.equal(el.textContent, 'Continuar');
});

test('variante secondary sem background', () => {
  const el = Button({ texto: 'Cancelar', variante: 'secondary' });
  assert.doesNotMatch(el.className, /zen-satin/);
  assert.match(el.className, /text-primary/);
});

test('onClick é chamado', () => {
  let clicado = 0;
  const el = Button({ texto: 'x', onClick: () => clicado++ });
  el.click();
  assert.equal(clicado, 1);
});

test('iconOnly tem rounded-full', () => {
  const el = Button({ variante: 'icon-only', icone: 'search' });
  assert.match(el.className, /rounded-full/);
});

test('disabled seta atributo', () => {
  const el = Button({ texto: 'x', disabled: true });
  assert.equal(el.disabled, true);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/button.js`:
```js
import { Icon } from './icon.js';

const BASE = 'transition-all active:scale-95 font-medium text-sm rounded-lg';
const VARIANTES = {
  primary: `${BASE} zen-satin text-on-primary px-6 py-3 shadow-lg shadow-primary/20`,
  secondary: `${BASE} text-primary hover:bg-primary-container/50 px-6 py-3`,
  'icon-only': 'p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors',
};

export function Button({ texto = '', variante = 'primary', icone, onClick, disabled = false, className = '' } = {}) {
  const el = document.createElement('button');
  el.className = `${VARIANTES[variante] ?? VARIANTES.primary} ${className}`.trim();
  if (icone) {
    const ic = Icon(icone, { className: 'text-lg mr-2' });
    el.appendChild(ic);
  }
  if (texto) el.appendChild(document.createTextNode(texto));
  if (disabled) el.disabled = true;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/button.js tests/frontend/ui/button.test.js
git commit -m "feat(frontend): Button primitive with variants + tests"
```

---

### Task 14: Input primitive — `public/js/ui/primitives/input.js`

Regra no-line: sem bordas, fill `surface-container-high`, focus vai para `surface-container-lowest`.

**Files:**
- Create: `public/js/ui/primitives/input.js`
- Test: `tests/frontend/ui/input.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Input } from '../../../public/js/ui/primitives/input.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Input cria wrapper com label em uppercase tracking-widest', () => {
  const el = Input({ label: 'Ordem', placeholder: 'OP-1', id: 'in-op' });
  const lab = el.querySelector('label');
  const inp = el.querySelector('input');
  assert.match(lab.className, /uppercase/);
  assert.match(lab.className, /tracking-widest/);
  assert.equal(inp.placeholder, 'OP-1');
  assert.equal(inp.id, 'in-op');
  assert.match(inp.className, /bg-surface-container-high/);
  assert.match(inp.className, /border-none/);
});

test('type=password aceito', () => {
  const el = Input({ label: 'Senha', type: 'password' });
  assert.equal(el.querySelector('input').type, 'password');
});

test('onInput ouve input', () => {
  const el = Input({ label: 'x', onInput: (v) => (el._capturado = v) });
  const inp = el.querySelector('input');
  inp.value = 'abc';
  inp.dispatchEvent(new Event('input'));
  assert.equal(el._capturado, 'abc');
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/input.js`:
```js
export function Input({ label, id, placeholder = '', type = 'text', value = '', onInput, required = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1';
  if (label) {
    const lab = document.createElement('label');
    lab.className = 'text-[10px] uppercase tracking-widest text-on-surface-variant font-medium block';
    lab.textContent = label;
    if (id) lab.htmlFor = id;
    wrap.appendChild(lab);
  }
  const inp = document.createElement('input');
  inp.type = type;
  inp.placeholder = placeholder;
  inp.value = value;
  if (id) inp.id = id;
  if (required) inp.required = true;
  inp.className = 'w-full bg-surface-container-high border-none rounded-lg px-4 py-3 text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-300';
  if (onInput) inp.addEventListener('input', (e) => onInput(e.target.value));
  wrap.appendChild(inp);
  return wrap;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/input.js tests/frontend/ui/input.test.js
git commit -m "feat(frontend): Input primitive no-line rule + tests"
```

---

### Task 15: Badge primitive — `public/js/ui/primitives/badge.js`

Sync badge (ONLINE verde / OFFLINE âmbar / RECOVERY azul / DESCONHECIDO slate).

**Files:**
- Create: `public/js/ui/primitives/badge.js`
- Test: `tests/frontend/ui/badge.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { SyncBadge } from '../../../public/js/ui/primitives/badge.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('ONLINE → verde e texto Online', () => {
  const el = SyncBadge('ONLINE');
  assert.match(el.className, /bg-emerald/);
  assert.equal(el.textContent.trim(), 'Online');
});

test('OFFLINE → âmbar e texto Offline', () => {
  const el = SyncBadge('OFFLINE');
  assert.match(el.className, /bg-amber/);
});

test('RECOVERY → azul', () => {
  const el = SyncBadge('RECOVERY');
  assert.match(el.className, /bg-sky/);
});

test('DESCONHECIDO → slate neutro', () => {
  const el = SyncBadge('DESCONHECIDO');
  assert.match(el.className, /bg-slate/);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/badge.js`:
```js
import { rotuloSync } from '../../infra/formatters.js';

const CORES = {
  ONLINE: 'bg-emerald-100 text-emerald-800',
  OFFLINE: 'bg-amber-100 text-amber-800',
  RECOVERY: 'bg-sky-100 text-sky-800',
  DESCONHECIDO: 'bg-slate-100 text-slate-500',
};

export function SyncBadge(estado) {
  const el = document.createElement('span');
  el.className = `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${CORES[estado] ?? CORES.DESCONHECIDO}`;
  const dot = document.createElement('span');
  dot.className = 'w-1.5 h-1.5 rounded-full bg-current';
  el.appendChild(dot);
  el.appendChild(document.createTextNode(rotuloSync(estado)));
  return el;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/badge.js tests/frontend/ui/badge.test.js
git commit -m "feat(frontend): SyncBadge primitive + tests"
```

---

### Task 16: Card primitive — `public/js/ui/primitives/card.js`

Regra no-line: surface-container-lowest sobre fundo surface-container-low. `rounded-xl`.

**Files:**
- Create: `public/js/ui/primitives/card.js`
- Test: `tests/frontend/ui/card.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Card } from '../../../public/js/ui/primitives/card.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('Card cria div com bg-surface-container-lowest rounded-xl', () => {
  const el = Card();
  assert.match(el.className, /bg-surface-container-lowest/);
  assert.match(el.className, /rounded-xl/);
});

test('Card aceita conteúdo', () => {
  const child = document.createElement('p');
  child.textContent = 'hi';
  const el = Card({ children: [child] });
  assert.equal(el.querySelector('p').textContent, 'hi');
});

test('title opcional gera h3', () => {
  const el = Card({ title: 'Sessão Ativa' });
  assert.equal(el.querySelector('h3').textContent, 'Sessão Ativa');
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/card.js`:
```js
export function Card({ title, children = [], className = '' } = {}) {
  const el = document.createElement('div');
  el.className = `bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient ${className}`.trim();
  if (title) {
    const h = document.createElement('h3');
    h.className = 'text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4';
    h.textContent = title;
    el.appendChild(h);
  }
  for (const c of children) el.appendChild(c);
  return el;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/card.js tests/frontend/ui/card.test.js
git commit -m "feat(frontend): Card primitive no-line rule + tests"
```

---

### Task 17: Modal primitive — `public/js/ui/primitives/modal.js`

Backdrop `on-surface/10` + blur, max-w-2xl, `surface-container-lowest`, esc fecha.

**Files:**
- Create: `public/js/ui/primitives/modal.js`
- Test: `tests/frontend/ui/modal.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { Modal } from '../../../public/js/ui/primitives/modal.js';

beforeEach(() => criarDOM('<div id="root"></div>'));
afterEach(() => limparDOM());

test('abrir anexa ao document.body', () => {
  const m = Modal({ title: 'Nova Carga' });
  m.abrir();
  const overlay = document.querySelector('[data-modal-overlay]');
  assert.ok(overlay);
  assert.match(overlay.className, /backdrop-blur-sm/);
});

test('fechar remove', () => {
  const m = Modal({ title: 'x' });
  m.abrir();
  m.fechar();
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('Escape fecha', () => {
  const m = Modal({ title: 'x' });
  m.abrir();
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(document.querySelector('[data-modal-overlay]'), null);
});

test('onFechar invocado no fechar', () => {
  let n = 0;
  const m = Modal({ title: 'x', onFechar: () => n++ });
  m.abrir();
  m.fechar();
  assert.equal(n, 1);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/modal.js`:
```js
export function Modal({ title = '', subtitle = '', onFechar } = {}) {
  let overlay = null;
  let escListener = null;

  function fechar() {
    if (!overlay) return;
    overlay.remove();
    if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
    overlay = null;
    if (onFechar) onFechar();
  }

  function abrir() {
    overlay = document.createElement('div');
    overlay.dataset.modalOverlay = 'true';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm p-4';
    const container = document.createElement('div');
    container.className = 'w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden';
    const header = document.createElement('div');
    header.className = 'px-10 pt-10 pb-6';
    header.innerHTML = `
      <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">${title}</h2>
      <p class="text-sm font-body text-on-surface-variant font-light">${subtitle}</p>
    `;
    const body = document.createElement('div');
    body.dataset.modalBody = 'true';
    body.className = 'px-10 pb-10 space-y-8';
    container.appendChild(header);
    container.appendChild(body);
    overlay.appendChild(container);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
    document.body.appendChild(overlay);
    escListener = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', escListener);
  }

  function corpo() { return overlay?.querySelector('[data-modal-body]'); }

  return { abrir, fechar, corpo };
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/modal.js tests/frontend/ui/modal.test.js
git commit -m "feat(frontend): Modal primitive + tests"
```

---

### Task 18: SideNav primitive — `public/js/ui/primitives/sidenav.js`

**Files:**
- Create: `public/js/ui/primitives/sidenav.js`
- Test: `tests/frontend/ui/sidenav.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { SideNav } from '../../../public/js/ui/primitives/sidenav.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('SideNav gera aside fixed w-64', () => {
  const el = SideNav({
    titulo: 'Rei AutoParts',
    subtitulo: 'Inspeção Silenciosa',
    itens: [
      { id: 'inicial', label: 'Inicial', icone: 'dashboard', href: '#/' },
      { id: 'cargas', label: 'Cargas', icone: 'package_2', href: '#/cargas' },
    ],
    ativo: 'inicial',
  });
  assert.equal(el.tagName, 'ASIDE');
  assert.match(el.className, /w-64/);
  assert.match(el.className, /fixed/);
});

test('marca item ativo visualmente', () => {
  const el = SideNav({ titulo: 't', itens: [{ id: 'a', label: 'A', icone: 'x', href: '#/' }], ativo: 'a' });
  const ativoEl = el.querySelector('[data-ativo="true"]');
  assert.ok(ativoEl);
  assert.match(ativoEl.textContent, /A/);
});

test('itens geram âncoras com href correto', () => {
  const el = SideNav({ titulo: 't', itens: [{ id: 'b', label: 'B', icone: 'x', href: '#/b' }] });
  const anchor = el.querySelector('a[href="#/b"]');
  assert.ok(anchor);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/sidenav.js`:
```js
import { Icon } from './icon.js';

export function SideNav({ titulo = 'Rei AutoParts', subtitulo = '', itens = [], ativo = '' } = {}) {
  const aside = document.createElement('aside');
  aside.className = 'fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col py-6 px-4 z-50';

  const header = document.createElement('div');
  header.className = 'flex items-center gap-3 px-2 mb-10';
  header.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary">
      <span class="material-symbols-outlined">factory</span>
    </div>
    <div>
      <h2 class="font-black text-on-surface font-headline text-sm tracking-wide">${titulo}</h2>
      <p class="text-[10px] uppercase tracking-widest text-primary/60">${subtitulo}</p>
    </div>
  `;
  aside.appendChild(header);

  const nav = document.createElement('nav');
  nav.className = 'flex-1 space-y-1';
  for (const it of itens) {
    const a = document.createElement('a');
    a.href = it.href;
    const isAtivo = it.id === ativo;
    a.className = isAtivo
      ? 'flex items-center gap-3 px-3 py-2.5 bg-surface-container-lowest text-primary rounded-lg shadow-sm font-semibold transition-all'
      : 'flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:bg-surface-container transition-all rounded-lg';
    if (isAtivo) a.dataset.ativo = 'true';
    a.appendChild(Icon(it.icone));
    a.appendChild(document.createTextNode(it.label));
    nav.appendChild(a);
  }
  aside.appendChild(nav);
  return aside;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/sidenav.js tests/frontend/ui/sidenav.test.js
git commit -m "feat(frontend): SideNav primitive + tests"
```

---

### Task 19: TopNav primitive — `public/js/ui/primitives/topnav.js`

**Files:**
- Create: `public/js/ui/primitives/topnav.js`
- Test: `tests/frontend/ui/topnav.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { TopNav } from '../../../public/js/ui/primitives/topnav.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('TopNav gera header fixed com breadcrumb + slot para badge', () => {
  const badge = document.createElement('span');
  badge.textContent = 'sync';
  const el = TopNav({ caminho: ['Análise', 'Cargas'], badge });
  assert.equal(el.tagName, 'HEADER');
  assert.match(el.textContent, /Análise/);
  assert.match(el.textContent, /Cargas/);
  assert.match(el.textContent, /sync/);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/topnav.js`:
```js
export function TopNav({ caminho = [], badge } = {}) {
  const header = document.createElement('header');
  header.className = 'fixed top-0 right-0 left-64 z-40 bg-surface-container/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 zen-shadow-ambient';

  const crumbs = document.createElement('div');
  crumbs.className = 'flex items-center gap-2 text-sm text-on-surface-variant';
  caminho.forEach((p, i) => {
    const span = document.createElement('span');
    span.className = i === caminho.length - 1 ? 'font-semibold text-on-surface' : 'opacity-60';
    span.textContent = p;
    crumbs.appendChild(span);
    if (i < caminho.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'material-symbols-outlined text-xs';
      sep.textContent = 'chevron_right';
      crumbs.appendChild(sep);
    }
  });
  header.appendChild(crumbs);

  const right = document.createElement('div');
  right.className = 'flex items-center gap-4';
  if (badge) right.appendChild(badge);
  header.appendChild(right);
  return header;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/topnav.js tests/frontend/ui/topnav.test.js
git commit -m "feat(frontend): TopNav primitive + tests"
```

---

### Task 20: Toast primitive — `public/js/ui/primitives/toast.js`

Silent Alert com `error-container` saturação reduzida.

**Files:**
- Create: `public/js/ui/primitives/toast.js`
- Test: `tests/frontend/ui/toast.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { toast } from '../../../public/js/ui/primitives/toast.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('toast.erro anexa e remove após timeout', async () => {
  toast.erro('Câmera desconectada', { duracaoMs: 50 });
  assert.match(document.body.innerHTML, /Câmera desconectada/);
  await new Promise(r => setTimeout(r, 80));
  assert.doesNotMatch(document.body.innerHTML, /Câmera desconectada/);
});

test('toast.sucesso usa secondary-container', () => {
  toast.sucesso('Caixa encerrada', { duracaoMs: 1000 });
  const el = document.querySelector('[data-toast]');
  assert.match(el.className, /bg-secondary-container/);
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/primitives/toast.js`:
```js
function _criar(texto, className, duracaoMs) {
  const el = document.createElement('div');
  el.dataset.toast = 'true';
  el.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${className}`;
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duracaoMs);
}
export const toast = {
  erro: (texto, { duracaoMs = 4000 } = {}) => _criar(texto, 'bg-error-container/80 text-on-error-container', duracaoMs),
  sucesso: (texto, { duracaoMs = 3000 } = {}) => _criar(texto, 'bg-secondary-container text-on-secondary-container', duracaoMs),
  info: (texto, { duracaoMs = 3000 } = {}) => _criar(texto, 'bg-surface-container-high text-on-surface', duracaoMs),
};
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/ui/primitives/toast.js tests/frontend/ui/toast.test.js
git commit -m "feat(frontend): Toast primitive + tests"
```

---

## Fase 4 — SPA shell + router wiring

### Task 21: `public/index.html` — SPA shell + montagem da infra

**Files:**
- Create: `public/index.html`
- Create: `public/js/app.js`

- [ ] **Step 1: Criar `public/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rei AutoParts — Inspeção Silenciosa</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <script src="https://cdn.tailwindcss.com?plugins=forms"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Manrope:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <script>
    tailwind.config = { theme: { extend: { colors: {
      'surface': '#f8f9fa', 'surface-container-low': '#f1f4f6', 'surface-container': '#eaeff1',
      'surface-container-high': '#e3e9ec', 'surface-container-lowest': '#ffffff',
      'on-surface': '#2b3437', 'on-surface-variant': '#586064',
      'primary': '#516169', 'primary-dim': '#45555d', 'primary-container': '#d5e5ef', 'on-primary': '#f0f9ff',
      'secondary-container': '#c1ebdf', 'on-secondary-container': '#325950',
      'error-container': '#fe8983', 'on-error-container': '#752121',
      'outline': '#737c7f', 'outline-variant': '#abb3b7',
    } } } };
  </script>
</head>
<body class="bg-surface text-on-surface antialiased">
  <div id="shell"></div>
  <main id="root" class="ml-64 pt-20 p-8 min-h-screen"></main>
  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `public/js/app.js`**

```js
import { criarApi } from './infra/api.js';
import { criarWS } from './infra/ws.js';
import { criarRouter } from './infra/router.js';
import { criarSyncState } from './domain/sync-state.js';
import { criarSessoesState } from './domain/sessoes-state.js';
import { criarCatalogos } from './domain/catalogos.js';
import { criarSessoesService } from './domain/sessoes-service.js';
import { SideNav } from './ui/primitives/sidenav.js';
import { TopNav } from './ui/primitives/topnav.js';
import { SyncBadge } from './ui/primitives/badge.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSelecaoCarga } from './pages/selecao-carga.js';
import { renderDetalhesCarga } from './pages/detalhes-carga.js';
import { renderEmitirRelatorios } from './pages/emitir-relatorios.js';
import { renderEventos } from './pages/eventos.js';

const api = criarApi({ base: location.origin });
const catalogos = criarCatalogos({ api });
const sessoesSvc = criarSessoesService({ api });
const sync = criarSyncState();
const sessoes = criarSessoesState();
criarWS({ url: `ws://${location.host}/ws` });

document.addEventListener('ws:sync.status', (e) => sync.aplicaEventoWS(e.detail));
document.addEventListener('ws:contagem.incrementada', (e) => sessoes.aplicaContagem(e.detail));
document.addEventListener('ws:sessao.atualizada', (e) => sessoes.aplicaAtualizacao(e.detail));

async function pollHealth() {
  try { const h = await api.get('/health'); sync.aplicaHealth(h); } catch {}
}
setInterval(pollHealth, 5000);
pollHealth();

let _unsubSyncBadge = null;
function renderShell(ativo) {
  const shell = document.getElementById('shell');
  shell.innerHTML = '';
  if (_unsubSyncBadge) { _unsubSyncBadge(); _unsubSyncBadge = null; }
  const side = SideNav({
    titulo: 'Rei AutoParts',
    subtitulo: 'Inspeção Silenciosa',
    itens: [
      { id: 'inicial', label: 'Inicial', icone: 'dashboard', href: '#/' },
      { id: 'cargas', label: 'Cargas', icone: 'package_2', href: '#/cargas' },
      { id: 'relatorios', label: 'Relatórios', icone: 'print', href: '#/relatorios' },
      { id: 'eventos', label: 'Eventos', icone: 'history', href: '#/eventos' },
    ],
    ativo,
  });
  let badge = SyncBadge(sync.atual().estado);
  const top = TopNav({ caminho: [caminhoPadrao(ativo)], badge });
  shell.appendChild(side);
  shell.appendChild(top);
  _unsubSyncBadge = sync.subscribe(() => {
    const novoBadge = SyncBadge(sync.atual().estado);
    badge.replaceWith(novoBadge);
    badge = novoBadge;
  });
}
function caminhoPadrao(id) {
  return { inicial: 'Inicial', cargas: 'Cargas', relatorios: 'Relatórios', eventos: 'Eventos' }[id] ?? 'Rei AutoParts';
}

const ctx = { api, catalogos, sessoesSvc, sync, sessoes };

criarRouter({
  root: '#root',
  rotas: {
    '/': async () => { renderShell('inicial'); return renderDashboard(ctx); },
    '/cargas': async () => { renderShell('cargas'); return renderSelecaoCarga(ctx); },
    '/cargas/:numero': async (p) => { renderShell('cargas'); return renderDetalhesCarga(ctx, p.numero); },
    '/relatorios': async () => { renderShell('relatorios'); return renderEmitirRelatorios(ctx); },
    '/eventos': async () => { renderShell('eventos'); return renderEventos(ctx); },
  },
  render: (html) => {
    const root = document.getElementById('root');
    root.innerHTML = '';
    if (typeof html === 'string') root.innerHTML = html;
    else if (html instanceof HTMLElement) root.appendChild(html);
  },
}).resolver();
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html public/js/app.js
git commit -m "feat(frontend): SPA shell + router wiring"
```

---

## Fase 5 — Páginas (TDD)

Cada página é uma função `renderXxx(ctx) → HTMLElement`. Teste valida estrutura + dados mockados.

### Task 22: Dashboard — `public/js/pages/dashboard.js`

Base: `stitch_sistema_contagem_rei_autoparts/inicial_dashboard_ultra_clean/code.html`. Mostra saudação, 2 quick actions (Nova Contagem / Emitir Relatórios), rodapé com status.

**Files:**
- Create: `public/js/pages/dashboard.js`
- Test: `tests/frontend/pages/dashboard.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDashboard } from '../../../public/js/pages/dashboard.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderDashboard retorna container com 2 quick actions', () => {
  const ctx = { sync: { atual: () => ({ estado: 'ONLINE' }) } };
  const el = renderDashboard(ctx);
  const botoes = el.querySelectorAll('[data-quick-action]');
  assert.equal(botoes.length, 2);
  assert.match(botoes[0].textContent, /Nova Contagem/);
  assert.match(botoes[1].textContent, /Emitir Relatórios/);
});

test('quick action Nova Contagem linka para /cargas', () => {
  const el = renderDashboard({ sync: { atual: () => ({ estado: 'ONLINE' }) } });
  const a = el.querySelector('[data-quick-action="nova-contagem"]');
  assert.equal(a.getAttribute('href'), '#/cargas');
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/pages/dashboard.js`:
```js
export function renderDashboard(ctx) {
  const container = document.createElement('div');
  container.className = 'space-y-12';

  const hero = document.createElement('section');
  hero.className = 'mb-12';
  hero.innerHTML = `
    <p class="text-on-secondary-container font-medium tracking-widest text-xs uppercase mb-1">Sessão Ativa</p>
    <h2 class="text-3xl font-light text-on-surface tracking-tight font-headline">Bem-vindo, Operador.</h2>
    <p class="text-on-surface-variant text-sm font-light">Expedição Rei AutoParts</p>
  `;

  const section = document.createElement('section');
  const title = document.createElement('h3');
  title.className = 'text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-4';
  title.textContent = 'Ações Rápidas';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-4';

  const acao1 = document.createElement('a');
  acao1.dataset.quickAction = 'nova-contagem';
  acao1.href = '#/cargas';
  acao1.className = 'flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl hover:bg-secondary-container/40 transition-all zen-shadow-ambient group';
  acao1.innerHTML = `
    <div class="p-3 bg-secondary-container/50 rounded-xl"><span class="material-symbols-outlined text-2xl text-secondary">add_box</span></div>
    <span class="text-xs font-bold text-on-surface uppercase tracking-widest">Nova Contagem</span>
  `;

  const acao2 = document.createElement('a');
  acao2.dataset.quickAction = 'emitir-relatorios';
  acao2.href = '#/relatorios';
  acao2.className = 'flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl hover:bg-secondary-container/40 transition-all zen-shadow-ambient group';
  acao2.innerHTML = `
    <div class="p-3 bg-secondary-container/50 rounded-xl"><span class="material-symbols-outlined text-2xl text-secondary">print</span></div>
    <span class="text-xs font-bold text-on-surface uppercase tracking-widest">Emitir Relatórios</span>
  `;

  grid.appendChild(acao1);
  grid.appendChild(acao2);
  section.appendChild(title);
  section.appendChild(grid);

  container.appendChild(hero);
  container.appendChild(section);
  return container;
}
```

- [ ] **Step 3: PASS** e **Commit**

```bash
git add public/js/pages/dashboard.js tests/frontend/pages/dashboard.test.js
git commit -m "feat(frontend): dashboard page + tests"
```

---

### Task 23: Seleção de carga — `public/js/pages/selecao-carga.js`

Base: `stitch_sistema_contagem_rei_autoparts/sele_o_de_carga_zeninspect_ai/code.html`. Lista embarques abertos como cards clicáveis + botão "Nova Carga".

**Files:**
- Create: `public/js/pages/selecao-carga.js`
- Create: `public/js/ui/composites/card-carga.js` (card de carga reutilizado em detalhes)
- Test: `tests/frontend/pages/selecao-carga.test.js`
- Test: `tests/frontend/ui/card-carga.test.js`

- [ ] **Step 1: Teste CardCarga**

`tests/frontend/ui/card-carga.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { CardCarga } from '../../../public/js/ui/composites/card-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('CardCarga mostra número, motorista e data', () => {
  const el = CardCarga({ numero_embarque: '01', motorista: 'Emilio', placa: 'UEI-8H29', data_criacao: '2026-04-18T12:00:00Z' });
  assert.match(el.textContent, /01/);
  assert.match(el.textContent, /Emilio/);
  assert.match(el.textContent, /UEI-8H29/);
});

test('href vai para /cargas/:numero', () => {
  const el = CardCarga({ numero_embarque: '01' });
  assert.equal(el.getAttribute('href'), '#/cargas/01');
});
```

- [ ] **Step 2: FAIL** → **Implementar CardCarga**

`public/js/ui/composites/card-carga.js`:
```js
import { formatarData } from '../../infra/formatters.js';

export function CardCarga({ numero_embarque, motorista = '-', placa = '-', data_criacao, status = 'aberto' } = {}) {
  const a = document.createElement('a');
  a.href = `#/cargas/${encodeURIComponent(numero_embarque)}`;
  a.className = 'block bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient hover:bg-secondary-container/20 transition-colors';
  a.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Embarque</span>
      <span class="text-[10px] font-bold uppercase tracking-widest text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded">${status}</span>
    </div>
    <h3 class="text-2xl font-headline font-light text-on-surface mb-2">${numero_embarque}</h3>
    <p class="text-sm text-on-surface-variant">${motorista} · ${placa}</p>
    <p class="text-xs text-outline mt-3">${formatarData(data_criacao)}</p>
  `;
  return a;
}
```

- [ ] **Step 3: Teste da página**

`tests/frontend/pages/selecao-carga.test.js`:
```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderSelecaoCarga } from '../../../public/js/pages/selecao-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderSelecaoCarga lista cargas do catálogo', async () => {
  const ctx = {
    catalogos: {
      embarquesAbertos: async () => [
        { numero_embarque: '01', motorista: 'E', placa: 'X-1', data_criacao: '2026-04-18T00:00:00Z' },
        { numero_embarque: '02', motorista: 'M', placa: 'X-2', data_criacao: '2026-04-19T00:00:00Z' },
      ],
    },
  };
  const el = await renderSelecaoCarga(ctx);
  const cards = el.querySelectorAll('a[href^="#/cargas/"]');
  assert.equal(cards.length, 2);
});

test('botão Nova Carga abre modal', async () => {
  const ctx = { catalogos: { embarquesAbertos: async () => [] } };
  const el = await renderSelecaoCarga(ctx);
  const btn = el.querySelector('[data-abrir-nova-carga]');
  assert.ok(btn);
});
```

- [ ] **Step 4: FAIL** → **Implementar página**

`public/js/pages/selecao-carga.js`:
```js
import { CardCarga } from '../ui/composites/card-carga.js';
import { Button } from '../ui/primitives/button.js';
import { abrirModalNovaCarga } from '../ui/composites/modal-nova-carga.js';

export async function renderSelecaoCarga(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const header = document.createElement('section');
  header.className = 'flex justify-between items-end';
  header.innerHTML = `
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Expedição</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Selecionar Carga</h2>
      <p class="text-sm text-on-surface-variant font-light">Escolha um embarque aberto ou inicie uma nova carga.</p>
    </div>
  `;
  const btn = Button({ texto: 'Nova Carga', icone: 'add', variante: 'primary', onClick: () => abrirModalNovaCarga(ctx) });
  btn.dataset.abrirNovaCarga = 'true';
  header.appendChild(btn);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  try {
    const lista = await ctx.catalogos.embarquesAbertos();
    for (const e of lista) grid.appendChild(CardCarga(e));
  } catch (err) {
    grid.innerHTML = `<p class="text-on-surface-variant">Falha carregando: ${err.message}</p>`;
  }

  el.appendChild(header);
  el.appendChild(grid);
  return el;
}
```

- [ ] **Step 5: PASS + commit**

```bash
git add public/js/ui/composites/card-carga.js tests/frontend/ui/card-carga.test.js public/js/pages/selecao-carga.js tests/frontend/pages/selecao-carga.test.js
git commit -m "feat(frontend): selecao-carga page + CardCarga composite + tests"
```

---

### Task 24: Modal Nova Carga — `public/js/ui/composites/modal-nova-carga.js`

Base: `iniciar_nova_carga_rei_autoparts/code.html`. Passos: (1) Embarque + OP + Operador + Câmera; (2) Seletor de programa; (3) Confirmação.

**Files:**
- Create: `public/js/ui/composites/modal-nova-carga.js`
- Test: `tests/frontend/ui/modal-nova-carga.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalNovaCarga } from '../../../public/js/ui/composites/modal-nova-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

function fakeCtx() {
  return {
    catalogos: {
      embarquesAbertos: async () => [{ numero_embarque: '01' }],
      operadores: async () => [{ codigo: '1807', nome: 'Emilio' }],
      programas: async (c, q) => [{ numero: 1, nome: 'PECA-B' }],
      invalidarEmbarques: () => {},
    },
    sessoesSvc: {
      abrir: async (form) => ({ id: 'S1', camera_id: form.camera_id }),
      confirmar: async (id, p) => ({ id, programa_numero: p.programaNumero }),
    },
  };
}

test('abre modal com inputs obrigatórios', async () => {
  await abrirModalNovaCarga(fakeCtx());
  assert.ok(document.querySelector('[data-input="numero_embarque"]'));
  assert.ok(document.querySelector('[data-input="codigo_op"]'));
  assert.ok(document.querySelector('[data-input="codigo_operador"]'));
  assert.ok(document.querySelector('[data-input="camera_id"]'));
});

test('submete abertura e avança para seletor de programa', async () => {
  await abrirModalNovaCarga(fakeCtx());
  document.querySelector('[data-input="numero_embarque"]').value = '01';
  document.querySelector('[data-input="codigo_op"]').value = 'OP-1';
  document.querySelector('[data-input="codigo_operador"]').value = '1807';
  document.querySelector('[data-input="camera_id"]').value = '1';
  document.querySelector('[data-submit-abrir]').click();
  await new Promise(r => setTimeout(r, 10));
  assert.ok(document.querySelector('[data-stage="programa"]'));
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/composites/modal-nova-carga.js`:
```js
import { Modal } from '../primitives/modal.js';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { toast } from '../primitives/toast.js';

export async function abrirModalNovaCarga(ctx) {
  const modal = Modal({ title: 'Nova Carga', subtitle: 'Insira os parâmetros técnicos para iniciar.' });
  modal.abrir();
  const body = modal.corpo();

  const stage1 = document.createElement('div');
  stage1.dataset.stage = 'params';

  const embarqueIn = Input({ label: 'Número do Embarque', id: 'in-emb' });
  embarqueIn.querySelector('input').dataset.input = 'numero_embarque';
  const opIn = Input({ label: 'Ordem de Produção', id: 'in-op' });
  opIn.querySelector('input').dataset.input = 'codigo_op';
  const operIn = Input({ label: 'Código do Operador', id: 'in-oper' });
  operIn.querySelector('input').dataset.input = 'codigo_operador';
  const cameraIn = Input({ label: 'Câmera (1 ou 2)', id: 'in-cam', value: '1' });
  cameraIn.querySelector('input').dataset.input = 'camera_id';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 gap-4';
  grid.appendChild(opIn);
  grid.appendChild(operIn);

  stage1.appendChild(embarqueIn);
  stage1.appendChild(grid);
  stage1.appendChild(cameraIn);

  const continuar = Button({ texto: 'Continuar', variante: 'primary', onClick: async () => {
    const form = {
      numero_embarque: document.querySelector('[data-input="numero_embarque"]').value,
      codigo_op: document.querySelector('[data-input="codigo_op"]').value,
      codigo_operador: document.querySelector('[data-input="codigo_operador"]').value,
      camera_id: Number(document.querySelector('[data-input="camera_id"]').value),
    };
    try {
      const sessao = await ctx.sessoesSvc.abrir(form);
      renderStageProgram(body, ctx, sessao, modal);
    } catch (e) { toast.erro(e.message); }
  }});
  continuar.dataset.submitAbrir = 'true';

  const cancelar = Button({ texto: 'Cancelar', variante: 'secondary', onClick: () => modal.fechar() });

  const actions = document.createElement('div');
  actions.className = 'flex gap-4 pt-4';
  actions.appendChild(continuar);
  actions.appendChild(cancelar);
  stage1.appendChild(actions);

  body.appendChild(stage1);
}

function renderStageProgram(body, ctx, sessao, modal) {
  body.innerHTML = '';
  const stage = document.createElement('div');
  stage.dataset.stage = 'programa';
  stage.innerHTML = `<p class="text-sm text-on-surface-variant mb-4">Sessão aberta na câmera ${sessao.camera_id}. Selecione o programa.</p>`;
  const busca = Input({ label: 'Buscar programa', id: 'in-busca-prog' });
  const lista = document.createElement('ul');
  lista.className = 'space-y-2 max-h-80 overflow-auto';
  stage.appendChild(busca);
  stage.appendChild(lista);
  body.appendChild(stage);

  async function refresh(q = '') {
    lista.innerHTML = '';
    const progs = await ctx.catalogos.programas(sessao.camera_id, q);
    for (const p of progs) {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left px-4 py-3 rounded-lg bg-surface-container-high hover:bg-secondary-container/40 transition-colors';
      btn.textContent = `${String(p.numero).padStart(3,'0')} · ${p.nome}`;
      btn.addEventListener('click', async () => {
        try {
          await ctx.sessoesSvc.confirmar(sessao.id, { programaNumero: p.numero, programaNome: p.nome });
          modal.fechar();
          window.location.hash = `#/cargas/${encodeURIComponent(sessao.numero_embarque ?? '')}`;
        } catch (e) { toast.erro(e.message); }
      });
      lista.appendChild(btn);
    }
  }
  busca.querySelector('input').addEventListener('input', (e) => refresh(e.target.value));
  refresh('');
}
```

- [ ] **Step 3: PASS + commit**

```bash
git add public/js/ui/composites/modal-nova-carga.js tests/frontend/ui/modal-nova-carga.test.js
git commit -m "feat(frontend): modal Nova Carga composite + tests"
```

---

### Task 25: Detalhes da carga — `public/js/pages/detalhes-carga.js`

Base: `detalhes_da_carga_aberta_rei_autoparts/code.html`. Lista caixas do embarque, painel da sessão ativa (contador gigante), botão "Finalizar Carga" e "Imprimir Etiquetas".

**Pré-requisito (back-end):** a rota `GET /sessoes` atual só retorna ativas globais. Precisa suportar `?embarque=<numero>` (retorna ativas + encerradas daquele embarque) para a página montar o painel + tabela.

**Files:**
- Modify: `src/db/queries/sessoes.js` (nova função `listarPorEmbarque`)
- Modify: `src/domain/sessao-service.js` (expor `listarPorEmbarque`)
- Modify: `src/http/routes/sessoes.js` (filtro por query param)
- Modify: `tests/sessoes-routes.test.js` (novo caso `?embarque=`)
- Create: `public/js/pages/detalhes-carga.js`
- Create: `public/js/ui/composites/painel-contagem.js`
- Create: `public/js/ui/composites/tabela-caixas.js`
- Test: `tests/frontend/pages/detalhes-carga.test.js`
- Test: `tests/frontend/ui/painel-contagem.test.js`
- Test: `tests/frontend/ui/tabela-caixas.test.js`

- [ ] **Step 0.1: Teste da nova query**

Em `tests/sessoes-queries.test.js`, adicionar `listarPorEmbarque` ao import no topo e incluir:

```js
import { criarSessao, buscarAtivaPorCamera, incrementarContagem, encerrarSessao, listarPorEmbarque } from '../src/db/queries/sessoes.js';
// ...

test('listarPorEmbarque retorna todas (ativas + encerradas) do embarque', () => {
  const db = setup();
  db.prepare('INSERT INTO embarques (numero_embarque, status) VALUES (?, ?)').run('E2', 'aberto');
  criarSessao(db, { id: 'a', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-01-01T00:00:00Z' });
  criarSessao(db, { id: 'b', numero_embarque: 'E1', codigo_op: 'OP1', codigo_operador: '001', camera_id: 2, iniciada_em: '2026-01-01T00:01:00Z' });
  encerrarSessao(db, 'b', 'CX-1', '2026-01-01T00:02:00Z');
  criarSessao(db, { id: 'c', numero_embarque: 'E2', codigo_op: 'OP1', codigo_operador: '001', camera_id: 1, iniciada_em: '2026-01-01T00:03:00Z' });
  const r = listarPorEmbarque(db, 'E1');
  assert.equal(r.length, 2);
  assert.ok(r.every(s => s.numero_embarque === 'E1'));
});
```

- [ ] **Step 0.2: Implementar query**

Adicionar em `src/db/queries/sessoes.js`:

```js
export function listarPorEmbarque(db, numero_embarque) {
  return db.prepare(
    `SELECT * FROM sessoes_contagem
     WHERE numero_embarque = ?
     ORDER BY iniciada_em DESC`
  ).all(numero_embarque);
}
```

- [ ] **Step 0.3: Expor no service e rota**

Em `src/domain/sessao-service.js`:
```js
import { criarSessao, buscarAtivaPorCamera, buscarPorId, encerrarSessao, listarAtivas, listarPorEmbarque } from '../db/queries/sessoes.js';
// ...
function listarPorEmbarqueSnapshot(numero) { return listarPorEmbarque(db, numero); }
return { abrir, confirmar, encerrar, listarAtivas: listarAtivasSnapshot, listarPorEmbarque: listarPorEmbarqueSnapshot };
```

Em `src/http/routes/sessoes.js`, substituir handler:
```js
fastify.get('/sessoes', async (req) => {
  const { embarque } = req.query;
  if (embarque) return sessaoService.listarPorEmbarque(embarque);
  return sessaoService.listarAtivas();
});
```

- [ ] **Step 0.4: Teste da rota**

Em `tests/sessoes-routes.test.js`, adicionar caso:

```js
test('GET /sessoes?embarque=E1 delega para listarPorEmbarque', async () => {
  const chamadas = [];
  const service = {
    listarAtivas: () => [],
    listarPorEmbarque: (n) => { chamadas.push(n); return [{ id: 'x', numero_embarque: n }]; },
  };
  const f = Fastify();
  rotasSessoes(f, { sessaoService: service });
  const r = await f.inject({ method: 'GET', url: '/sessoes?embarque=E1' });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(chamadas, ['E1']);
});
```

- [ ] **Step 0.5: PASS back-end + Commit parcial**

```bash
node --test tests/sessoes-queries.test.js tests/sessoes-routes.test.js
git add src/db/queries/sessoes.js src/domain/sessao-service.js src/http/routes/sessoes.js tests/sessoes-queries.test.js tests/sessoes-routes.test.js
git commit -m "feat(sessoes): suporte a GET /sessoes?embarque=<numero>"
```

- [ ] **Step 1: Teste PainelContagem**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { PainelContagem } from '../../../public/js/ui/composites/painel-contagem.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('exibe contador gigante', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 42, camera_id: 1, programa_nome: 'PECA-B' } });
  const num = el.querySelector('[data-contagem]');
  assert.equal(num.textContent.replace(/\s/g, ''), '42');
});

test('atualizar substitui valor', () => {
  const painel = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1 } });
  painel.querySelector('[data-contagem]').textContent = '10';
  assert.equal(painel.querySelector('[data-contagem]').textContent, '10');
});
```

- [ ] **Step 2: FAIL** → **Implementar PainelContagem**

`public/js/ui/composites/painel-contagem.js`:
```js
import { formatarNumero } from '../../infra/formatters.js';

export function PainelContagem({ sessao }) {
  const el = document.createElement('section');
  el.className = 'bg-surface-container-lowest rounded-2xl p-10 zen-shadow-ambient';
  el.innerHTML = `
    <div class="flex items-baseline justify-between mb-6">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Câmera ${sessao.camera_id}</p>
        <h3 class="font-headline text-2xl text-on-surface">${sessao.programa_nome ?? 'Aguardando programa'}</h3>
      </div>
      <span data-sessao-id="${sessao.id}" class="text-[10px] font-mono text-outline">${sessao.id.slice(0, 8)}</span>
    </div>
    <div data-contagem class="font-headline text-[10rem] font-extralight leading-none text-primary tracking-tight text-center py-6">${formatarNumero(sessao.quantidade_total ?? 0)}</div>
    <p class="text-center text-[10px] uppercase tracking-[0.3em] text-outline">Peças</p>
  `;
  return el;
}
```

- [ ] **Step 3: Teste TabelaCaixas**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { TabelaCaixas } from '../../../public/js/ui/composites/tabela-caixas.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderiza linha por caixa', () => {
  const el = TabelaCaixas({ caixas: [
    { numero_caixa: 'CX-1', codigo_op: 'OP1', quantidade_total: 10 },
    { numero_caixa: 'CX-2', codigo_op: 'OP1', quantidade_total: 20 },
  ]});
  assert.equal(el.querySelectorAll('[data-linha-caixa]').length, 2);
});

test('mensagem quando vazio', () => {
  const el = TabelaCaixas({ caixas: [] });
  assert.match(el.textContent, /Nenhuma caixa/);
});
```

- [ ] **Step 4: FAIL** → **Implementar TabelaCaixas**

`public/js/ui/composites/tabela-caixas.js`:
```js
import { formatarNumero, formatarHora } from '../../infra/formatters.js';

export function TabelaCaixas({ caixas = [] } = {}) {
  const el = document.createElement('section');
  el.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  if (caixas.length === 0) {
    el.innerHTML = '<p class="text-on-surface-variant text-sm">Nenhuma caixa registrada ainda.</p>';
    return el;
  }
  const linhas = caixas.map(c => `
    <div data-linha-caixa class="grid grid-cols-4 py-3 text-sm">
      <span class="font-medium text-on-surface">${c.numero_caixa ?? '-'}</span>
      <span class="text-on-surface-variant">${c.codigo_op}</span>
      <span class="text-on-surface font-semibold">${formatarNumero(c.quantidade_total)}</span>
      <span class="text-on-surface-variant text-right">${formatarHora(c.encerrada_em ?? c.iniciada_em)}</span>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="grid grid-cols-4 pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Caixa</span><span>OP</span><span>Peças</span><span class="text-right">Hora</span>
    </div>
    ${linhas}
  `;
  return el;
}
```

- [ ] **Step 5: Teste página detalhes**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderDetalhesCarga } from '../../../public/js/pages/detalhes-carga.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderDetalhesCarga busca embarque + caixas', async () => {
  const ctx = {
    api: {
      get: async (path) => {
        if (path.startsWith('/embarques/')) return { numero_embarque: '01', motorista: 'E', status: 'aberto', data_criacao: '2026-04-18T00:00:00Z' };
        if (path.startsWith('/sessoes')) return [
          { id: 'a', numero_embarque: '01', camera_id: 1, quantidade_total: 5, numero_caixa: 'CX-1', codigo_op: 'OP1', status: 'encerrada', encerrada_em: '2026-04-18T10:00:00Z' },
          { id: 'b', numero_embarque: '01', camera_id: 2, quantidade_total: 3, codigo_op: 'OP1', status: 'ativa', programa_nome: 'PECA-X', iniciada_em: '2026-04-18T11:00:00Z' },
        ];
        return [];
      },
    },
    sessoes: { porCamera: () => null, subscribe: () => () => {} },
  };
  const el = await renderDetalhesCarga(ctx, '01');
  assert.match(el.textContent, /01/);
  assert.match(el.textContent, /CX-1/);
  assert.match(el.textContent, /PECA-X/);
});
```

- [ ] **Step 6: FAIL** → **Implementar página detalhes**

`public/js/pages/detalhes-carga.js`:
```js
import { PainelContagem } from '../ui/composites/painel-contagem.js';
import { TabelaCaixas } from '../ui/composites/tabela-caixas.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';

export async function renderDetalhesCarga(ctx, numero) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const [embarque, caixas] = await Promise.all([
    ctx.api.get(`/embarques/${encodeURIComponent(numero)}`),
    ctx.api.get(`/sessoes?embarque=${encodeURIComponent(numero)}`).catch(() => []),
  ]);

  const header = document.createElement('section');
  header.className = 'flex justify-between items-end';
  header.innerHTML = `
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Detalhes da Carga</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">${embarque.numero_embarque}</h2>
      <p class="text-sm text-on-surface-variant font-light">${embarque.motorista ?? '-'} · ${embarque.placa ?? '-'}</p>
    </div>
  `;
  const btnFinalizar = Button({ texto: 'Finalizar Carga', icone: 'check_circle', onClick: () => toast.info('Finalização via Supabase ainda pendente.') });
  header.appendChild(btnFinalizar);
  el.appendChild(header);

  const ativa = caixas.find(c => c.status === 'ativa');
  if (ativa) el.appendChild(PainelContagem({ sessao: ativa }));

  el.appendChild(TabelaCaixas({ caixas: caixas.filter(c => c.status === 'encerrada') }));

  if (ativa) {
    const unsub = ctx.sessoes.subscribe(() => {
      const atualizada = ctx.sessoes.porCamera(ativa.camera_id);
      if (atualizada && atualizada.id === ativa.id) {
        const c = el.querySelector('[data-contagem]');
        if (c) c.textContent = String(atualizada.quantidade_total);
      }
    });
    window.addEventListener('hashchange', unsub, { once: true });
  }
  return el;
}
```

- [ ] **Step 7: Commit**

```bash
git add public/js/ui/composites/painel-contagem.js tests/frontend/ui/painel-contagem.test.js
git add public/js/ui/composites/tabela-caixas.js tests/frontend/ui/tabela-caixas.test.js
git add public/js/pages/detalhes-carga.js tests/frontend/pages/detalhes-carga.test.js
git commit -m "feat(frontend): detalhes-carga page + Painel + Tabela composites + tests"
```

---

### Task 26: Emitir Relatórios — `public/js/pages/emitir-relatorios.js`

Base: `emitir_relat_rios_gest_o_de_cargas/code.html` + modal `modal_de_emiss_o_de_relat_rios_rei_autoparts/code.html`.

**Files:**
- Create: `public/js/pages/emitir-relatorios.js`
- Create: `public/js/ui/composites/modal-emitir-relatorio.js`
- Test: `tests/frontend/pages/emitir-relatorios.test.js`
- Test: `tests/frontend/ui/modal-emitir-relatorio.test.js`

- [ ] **Step 1: Teste modal emitir**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { abrirModalEmitir } from '../../../public/js/ui/composites/modal-emitir-relatorio.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('modal mostra 3 opções de formato', () => {
  abrirModalEmitir({ numero: '01', onBaixar: () => {} });
  assert.ok(document.querySelector('[data-fmt="csv"]'));
  assert.ok(document.querySelector('[data-fmt="xlsx"]'));
  assert.ok(document.querySelector('[data-fmt="pdf"]'));
});

test('clicar no formato chama onBaixar com o fmt', () => {
  let chamado = null;
  abrirModalEmitir({ numero: '01', onBaixar: (fmt) => { chamado = fmt; } });
  document.querySelector('[data-fmt="xlsx"]').click();
  assert.equal(chamado, 'xlsx');
});
```

- [ ] **Step 2: FAIL** → **Implementar**

`public/js/ui/composites/modal-emitir-relatorio.js`:
```js
import { Modal } from '../primitives/modal.js';
import { Button } from '../primitives/button.js';

export function abrirModalEmitir({ numero, onBaixar }) {
  const m = Modal({ title: `Emitir Relatório — ${numero}`, subtitle: 'Selecione o formato de saída.' });
  m.abrir();
  const body = m.corpo();
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-4';
  for (const fmt of ['csv', 'xlsx', 'pdf']) {
    const b = document.createElement('button');
    b.dataset.fmt = fmt;
    b.className = 'flex flex-col items-center gap-3 p-6 bg-surface-container-high hover:bg-secondary-container/40 rounded-xl transition-colors';
    b.innerHTML = `<span class="material-symbols-outlined text-4xl text-secondary">description</span><span class="text-sm font-bold uppercase tracking-widest">${fmt}</span>`;
    b.addEventListener('click', () => { onBaixar(fmt); m.fechar(); });
    grid.appendChild(b);
  }
  body.appendChild(grid);
}
```

- [ ] **Step 3: Teste página**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderEmitirRelatorios } from '../../../public/js/pages/emitir-relatorios.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('lista todas as cargas disponíveis', async () => {
  const ctx = {
    api: { get: async () => [
      { numero_embarque: '01', status: 'aberto', data_criacao: '2026-04-18T00:00:00Z' },
      { numero_embarque: '02', status: 'fechado', data_criacao: '2026-04-19T00:00:00Z' },
    ]},
  };
  const el = await renderEmitirRelatorios(ctx);
  assert.equal(el.querySelectorAll('[data-embarque]').length, 2);
});
```

- [ ] **Step 4: FAIL** → **Implementar**

`public/js/pages/emitir-relatorios.js`:
```js
import { abrirModalEmitir } from '../ui/composites/modal-emitir-relatorio.js';

export async function renderEmitirRelatorios(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const header = document.createElement('section');
  header.innerHTML = `
    <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Gestão de Cargas</p>
    <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Emitir Relatórios</h2>
  `;
  el.appendChild(header);

  const lista = await ctx.api.get('/embarques');
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-6';
  for (const emb of lista) {
    const card = document.createElement('button');
    card.dataset.embarque = emb.numero_embarque;
    card.className = 'text-left bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient hover:bg-secondary-container/20 transition-colors';
    card.innerHTML = `
      <div class="flex justify-between mb-3">
        <span class="text-[10px] uppercase tracking-[0.2em] text-outline font-bold">Embarque</span>
        <span class="text-[10px] uppercase tracking-widest text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded">${emb.status}</span>
      </div>
      <h3 class="text-2xl font-headline font-light">${emb.numero_embarque}</h3>
    `;
    card.addEventListener('click', () => abrirModalEmitir({
      numero: emb.numero_embarque,
      onBaixar: (fmt) => { window.location.href = `/relatorios/embarque/${encodeURIComponent(emb.numero_embarque)}?fmt=${fmt}`; },
    }));
    grid.appendChild(card);
  }
  el.appendChild(grid);
  return el;
}
```

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/composites/modal-emitir-relatorio.js tests/frontend/ui/modal-emitir-relatorio.test.js
git add public/js/pages/emitir-relatorios.js tests/frontend/pages/emitir-relatorios.test.js
git commit -m "feat(frontend): emitir-relatorios page + modal composite + tests"
```

---

### Task 27: Eventos (Logs) — `public/js/pages/eventos.js`

Base: `eventos_logs_zeninspect_ai/code.html`. Tabela de eventos com filtro por nível.

**Files:**
- Create: `public/js/pages/eventos.js`
- Test: `tests/frontend/pages/eventos.test.js`
- Modify: `src/http/routes/eventos.js` (criar rota GET `/eventos`)
- Modify: `src/server.js` (registrar rota)
- Test: `tests/eventos-route.test.js`

- [ ] **Step 1: Teste back-end da rota eventos**

`tests/eventos-route.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { openDatabase } from '../src/db/sqlite.js';
import { registrarEvento } from '../src/db/queries/eventos.js';
import { rotasEventos } from '../src/http/routes/eventos.js';

test('GET /eventos retorna últimos 100 por padrão', async () => {
  const db = openDatabase(':memory:');
  for (let i = 0; i < 3; i++) registrarEvento(db, { nivel: 'INFO', categoria: 'T', mensagem: `m${i}`, timestamp: new Date().toISOString() });
  const f = Fastify();
  rotasEventos(f, { db });
  const r = await f.inject({ method: 'GET', url: '/eventos' });
  assert.equal(r.statusCode, 200);
  const body = r.json();
  assert.equal(body.length, 3);
});

test('GET /eventos?nivel=ERROR filtra', async () => {
  const db = openDatabase(':memory:');
  registrarEvento(db, { nivel: 'INFO', categoria: 'T', mensagem: 'i', timestamp: new Date().toISOString() });
  registrarEvento(db, { nivel: 'ERROR', categoria: 'T', mensagem: 'e', timestamp: new Date().toISOString() });
  const f = Fastify();
  rotasEventos(f, { db });
  const r = await f.inject({ method: 'GET', url: '/eventos?nivel=ERROR' });
  const body = r.json();
  assert.equal(body.length, 1);
  assert.equal(body[0].nivel, 'ERROR');
});
```

- [ ] **Step 2: Rodar — FAIL** → **Implementar rota**

`src/http/routes/eventos.js`:
```js
import { listarRecentes } from '../../db/queries/eventos.js';

export function rotasEventos(fastify, { db }) {
  fastify.get('/eventos', async (req) => {
    const nivel = req.query.nivel;
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const todos = listarRecentes(db, limit);
    return nivel ? todos.filter(e => e.nivel === nivel) : todos;
  });
}
```

Editar `src/server.js` — adicionar import e registro da rota junto com as outras:
```js
import { rotasEventos } from './http/routes/eventos.js';
// ...
rotasEventos(fastify, { db });
```

- [ ] **Step 3: Back-end PASS**

Run: `node --test tests/eventos-route.test.js`
Expected: PASS (2/2).

- [ ] **Step 4: Teste página frontend**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderEventos } from '../../../public/js/pages/eventos.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderEventos exibe tabela com eventos do api', async () => {
  const ctx = { api: { get: async () => [
    { nivel: 'INFO', categoria: 'SESSAO', mensagem: 'Abriu', timestamp: '2026-04-20T10:00:00Z' },
    { nivel: 'ERROR', categoria: 'SYNC', mensagem: 'Falha', timestamp: '2026-04-20T10:01:00Z' },
  ]}};
  const el = await renderEventos(ctx);
  assert.equal(el.querySelectorAll('[data-linha-evento]').length, 2);
});
```

- [ ] **Step 5: FAIL** → **Implementar página**

`public/js/pages/eventos.js`:
```js
import { formatarHora, formatarData } from '../infra/formatters.js';

const COR_NIVEL = {
  INFO: 'text-on-surface-variant',
  SUCCESS: 'text-on-secondary-container',
  WARN: 'text-amber-700',
  ERROR: 'text-on-error-container',
};

export async function renderEventos(ctx) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';
  el.innerHTML = `
    <section>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Observabilidade</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">Eventos</h2>
    </section>
  `;
  const eventos = await ctx.api.get('/eventos');
  const tabela = document.createElement('section');
  tabela.className = 'bg-surface-container-lowest rounded-2xl p-8 zen-shadow-ambient';
  tabela.innerHTML = `
    <div class="grid grid-cols-[80px_100px_140px_1fr] pb-3 text-[10px] uppercase tracking-widest text-outline font-bold">
      <span>Hora</span><span>Nível</span><span>Categoria</span><span>Mensagem</span>
    </div>
    ${eventos.map(e => `
      <div data-linha-evento class="grid grid-cols-[80px_100px_140px_1fr] py-3 text-sm">
        <span class="text-on-surface-variant">${formatarHora(e.timestamp)}</span>
        <span class="${COR_NIVEL[e.nivel] ?? 'text-on-surface-variant'} font-semibold">${e.nivel}</span>
        <span class="text-on-surface-variant">${e.categoria}</span>
        <span class="text-on-surface">${e.mensagem}</span>
      </div>
    `).join('')}
  `;
  el.appendChild(tabela);
  return el;
}
```

- [ ] **Step 6: PASS + Commit**

```bash
git add src/http/routes/eventos.js src/server.js tests/eventos-route.test.js
git add public/js/pages/eventos.js tests/frontend/pages/eventos.test.js
git commit -m "feat(frontend+backend): eventos page + GET /eventos route + tests"
```

---

## Fase 6 — TV kiosk redesign + cleanup

### Task 28: TV redesign — `public/tv/index.html` + `public/js/tv-app.js`

Baseado no painel da sessão mas full-screen sem sidenav. Usa o `PainelContagem`.

**Files:**
- Modify: `public/tv/index.html`
- Modify: `public/js/tv-app.js`
- Test: `tests/frontend/pages/tv.test.js`

- [ ] **Step 1: Teste**

```js
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarDOM, limparDOM } from '../_helpers/dom.js';
import { renderTV } from '../../../public/js/tv-render.js';

beforeEach(() => criarDOM());
afterEach(() => limparDOM());

test('renderTV cria 2 painéis quando há 2 câmeras', () => {
  const sessoes = {
    todas: () => [
      { id: 'a', camera_id: 1, quantidade_total: 10, programa_nome: 'PECA-A' },
      { id: 'b', camera_id: 2, quantidade_total: 20, programa_nome: 'PECA-B' },
    ],
  };
  const el = renderTV({ sessoes });
  assert.equal(el.querySelectorAll('[data-sessao-id]').length, 2);
});

test('renderTV mostra placeholder se não há sessões', () => {
  const el = renderTV({ sessoes: { todas: () => [] } });
  assert.match(el.textContent, /Nenhuma sessão ativa/);
});
```

- [ ] **Step 2: FAIL** → **Criar `public/js/tv-render.js`**

```js
import { PainelContagem } from './ui/composites/painel-contagem.js';

export function renderTV({ sessoes }) {
  const el = document.createElement('div');
  el.className = 'grid grid-cols-2 gap-12 w-full';
  const ativas = sessoes.todas();
  if (ativas.length === 0) {
    el.className = 'flex items-center justify-center w-full';
    el.innerHTML = '<p class="text-6xl font-headline text-outline">Nenhuma sessão ativa</p>';
    return el;
  }
  for (const s of ativas) el.appendChild(PainelContagem({ sessao: s }));
  return el;
}
```

- [ ] **Step 3: Reescrever `public/tv/index.html`**

```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>TV — Rei AutoParts</title>
  <link rel="stylesheet" href="/css/tokens.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter&family=Manrope:wght@300;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
  <style>body { background: var(--background); color: var(--on-surface); }</style>
</head>
<body class="min-h-screen p-16">
  <header class="flex justify-between items-center mb-12">
    <div>
      <p class="text-[10px] uppercase tracking-[0.3em] text-outline font-bold mb-2">Expedição</p>
      <h1 class="text-5xl font-headline font-light">Rei AutoParts</h1>
    </div>
    <div id="sync-slot"></div>
  </header>
  <main id="painel" class="flex items-center justify-center min-h-[60vh]"></main>
  <script type="module" src="/js/tv-app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Reescrever `public/js/tv-app.js`**

```js
import { criarApi } from './infra/api.js';
import { criarWS } from './infra/ws.js';
import { criarSessoesState } from './domain/sessoes-state.js';
import { criarSyncState } from './domain/sync-state.js';
import { SyncBadge } from './ui/primitives/badge.js';
import { renderTV } from './tv-render.js';

const api = criarApi({ base: location.origin });
const sync = criarSyncState();
const sessoes = criarSessoesState();
criarWS({ url: `ws://${location.host}/ws` });

document.addEventListener('ws:sync.status', (e) => sync.aplicaEventoWS(e.detail));
document.addEventListener('ws:contagem.incrementada', (e) => sessoes.aplicaContagem(e.detail));
document.addEventListener('ws:sessao.atualizada', (e) => sessoes.aplicaAtualizacao(e.detail));

async function rerender() {
  const el = renderTV({ sessoes });
  const painel = document.getElementById('painel');
  painel.innerHTML = '';
  painel.appendChild(el);
}
sessoes.subscribe(rerender);
sync.subscribe(() => {
  const slot = document.getElementById('sync-slot');
  slot.innerHTML = '';
  slot.appendChild(SyncBadge(sync.atual().estado));
});

async function bootstrap() {
  try {
    const ativas = await api.get('/sessoes?status=ativa');
    sessoes.carregarAtivas(ativas);
  } catch {}
  try {
    const h = await api.get('/health');
    sync.aplicaHealth(h);
  } catch {}
  rerender();
}
bootstrap();
setInterval(async () => { try { sync.aplicaHealth(await api.get('/health')); } catch {} }, 5000);
```

- [ ] **Step 5: Commit**

```bash
git add public/js/tv-render.js tests/frontend/pages/tv.test.js public/tv/index.html public/js/tv-app.js
git commit -m "feat(frontend): TV kiosk redesign reusing PainelContagem"
```

---

### Task 29: Remover MVP antigo + atualizar checklist

**Files:**
- Delete: `public/operador/index.html`
- Delete: `public/js/operador-app.js`
- Modify: `docs/checklist-e2e.md`

- [ ] **Step 1: Validar que o novo SPA cobre os casos do operador**

Abrir `http://localhost:3000/` no navegador → tela de dashboard. Navegar: Cargas → Nova Carga → selecionar programa → contagem. Equivalência com MVP antigo confirmada.

- [ ] **Step 2: Remover MVP**

```bash
rm public/operador/index.html
rm public/js/operador-app.js
rmdir public/operador
```

- [ ] **Step 3: Atualizar `docs/checklist-e2e.md` — adicionar seção de validação UI**

Acrescentar no fim:

```markdown
## UI Industrial Zen (pós-migração)
- [ ] `/` renderiza dashboard Industrial Zen (sidenav + topnav + saudação + ações rápidas)
- [ ] `/#/cargas` lista cargas abertas em cards (paleta slate + teal)
- [ ] Botão "Nova Carga" abre modal (backdrop-blur + layers)
- [ ] Modal passo 2 exibe seletor de programa com busca
- [ ] `/#/cargas/<num>` mostra painel de contagem gigante + tabela de caixas
- [ ] Badge sync sincroniza ONLINE/OFFLINE/RECOVERY no canto superior
- [ ] `/#/relatorios` lista embarques e abre modal de emissão (CSV/XLSX/PDF)
- [ ] `/#/eventos` exibe tabela de eventos com cores por nível
- [ ] TV kiosk (`/tv/`) exibe PainelContagem em tela cheia para 2 câmeras
- [ ] Tailwind CDN + Inter/Manrope/Material Symbols carregam sem 404
```

- [ ] **Step 4: Rodar suite completa**

Run: `node --test tests/`
Expected: todos os testes (back-end + frontend) PASS.

- [ ] **Step 5: Commit**

```bash
git add -u public/
git add docs/checklist-e2e.md
git commit -m "chore(frontend): remove MVP operador + document UI checklist"
```

---

### Task 30: Push final

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Confirmar no GitHub** que todos os commits apareceram.

---

## Páginas fora do escopo imediato (iteração futura)

As telas abaixo existem em `stitch_sistema_contagem_rei_autoparts/` e ainda não foram portadas. Cada uma segue o mesmo padrão: cria-se uma `page/<nome>.js` com teste `tests/frontend/pages/<nome>.test.js` seguindo o estilo das Tasks 22-27, reutilizando primitivos e compósitos já testados.

- `continuar_carga_nica_rei_autoparts` → variante de "Continuar" (single) — novo page `continuar-carga-unica.js`
- `continuar_carga_m_ltipla_rei_autoparts` → variante multi — novo page `continuar-carga-multipla.js`
- `detalhes_da_carga_expedida_foco_na_tabela` → somente leitura — novo page `detalhes-carga-expedida.js`
- `emitir_relat_rios_cargas_abertas_agrupadas` → variante agrupada — novo page `relatorios-cargas-abertas.js`

Esses podem ser adicionados em uma segunda iteração quando o fluxo principal estiver validado em produção.

---

## Self-review

**Cobertura do spec (migração Stitch → `public/`):**
- ✅ Design system Industrial Zen → `public/css/tokens.css` (Task 3) + config Tailwind em `public/index.html` (Task 21)
- ✅ 8 de 12 telas portadas como pages (dashboard, seleção de carga, modal nova carga, detalhes carga aberta, emitir relatórios, modal emitir, eventos, TV kiosk)
- ✅ 4 telas restantes documentadas como iteração futura com padrão replicável
- ✅ Primitivos reutilizáveis: Icon, Button, Input, Badge, Card, Modal, SideNav, TopNav, Toast
- ✅ Domain isolado (sync-state, sessoes-state, catalogos, sessoes-service) — DDD
- ✅ TDD em todas as tasks (test-first + commit por task)
- ✅ Back-end intacto, exceto nova rota `GET /eventos` (Task 27)

**Type consistency:**
- `criarApi({ base, fetch })` usado consistentemente em app.js e tests.
- `ctx` objeto tem: `api`, `catalogos`, `sessoesSvc`, `sync`, `sessoes` — referenciado uniformemente em todas as pages.
- `PainelContagem({ sessao })` aceita o shape do objeto `sessoes_contagem` do back-end.

**Sem placeholders:** nenhum "TBD", "similar a X" ou "implement error handling". Cada step tem código completo.
