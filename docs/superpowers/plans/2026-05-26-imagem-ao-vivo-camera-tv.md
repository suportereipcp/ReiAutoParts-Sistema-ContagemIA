# Imagem ao Vivo da Câmera no Monitor TV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir o feed ao vivo de cada câmera Keyence IV4 no painel correspondente do Monitor 2 (TV kiosk), via proxy no backend e polling de JPEG no frontend.

**Architecture:** A câmera serve um JPEG ao vivo em `http://<ip>:80/iliveimage.jpg` (Monitor da Web nativo do IV4). Um endpoint proxy same-origin no Fastify (`GET /cameras/:id/live-image`) busca essa imagem e a repassa; o frontend da TV faz poll desse endpoint (~1×/s) e atualiza um `<img>` por painel. Sem disco, sem WebSocket novo, sem mudança no fluxo de pulsos.

**Tech Stack:** Node.js 20 (ESM), Fastify, `fetch` global do Node, `node:test`, happy-dom (testes de frontend), HTML/JS vanilla.

**Spec:** `docs/superpowers/specs/2026-05-26-imagem-ao-vivo-camera-tv-design.md`

---

## File Structure

- **Modify** `src/config.js` — adiciona `portaImagem` (default 80) a cada câmera.
- **Create** `src/camera/live-image.js` — função `buscarImagemCamera(cam, opts)` que busca o JPEG da câmera (fetch injetável p/ teste).
- **Create** `src/http/routes/cameras.js` — rota proxy `GET /cameras/:id/live-image`.
- **Modify** `src/server.js` — registra `rotasCameras`.
- **Modify** `public/js/ui/composites/painel-contagem.js` — área de imagem opt-in (`liveImage: true`) + polling auto-limpo.
- **Modify** `public/js/tv-render.js` — passa `liveImage: true` ao montar os painéis da TV.
- **Modify** `.env.example` — documenta `CAMERA_N_PORTA_IMAGEM`.
- **Test** `tests/config.test.js`, `tests/camera-live-image.test.js` (novo), `tests/cameras-routes.test.js` (novo), `tests/frontend/ui/painel-contagem.test.js`.

---

## Task 1: Config — porta de imagem por câmera

**Files:**
- Modify: `src/config.js:22-25`
- Test: `tests/config.test.js`

- [ ] **Step 1: Write the failing test**

Adicionar ao fim de `tests/config.test.js`:

```js
test('loadConfig define porta de imagem da camera com default 80', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CAMERA_1_IP: '192.168.0.10',
    CAMERA_2_IP: '192.168.0.11',
  });
  assert.equal(cfg.cameras[0].portaImagem, 80);
  assert.equal(cfg.cameras[1].portaImagem, 80);
});

test('loadConfig permite sobrescrever a porta de imagem da camera', () => {
  const cfg = loadConfig({
    NEXT_PUBLIC_SUPABASE_URL: 'https://x',
    SUPABASE_SERVICE_ROLE_KEY: 'key',
    CAMERA_1_IP: '192.168.0.10',
    CAMERA_2_IP: '192.168.0.11',
    CAMERA_1_PORTA_IMAGEM: '8080',
  });
  assert.equal(cfg.cameras[0].portaImagem, 8080);
  assert.equal(cfg.cameras[1].portaImagem, 80);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.js`
Expected: FAIL — `cfg.cameras[0].portaImagem` é `undefined`, esperado `80`.

- [ ] **Step 3: Write minimal implementation**

Em `src/config.js`, substituir o array `cameras` (linhas 22-25):

```js
    cameras: [
      { id: 1, ip: env.CAMERA_1_IP, porta: Number(env.CAMERA_1_PORTA ?? 8500), portaImagem: Number(env.CAMERA_1_PORTA_IMAGEM ?? 80) },
      { id: 2, ip: env.CAMERA_2_IP, porta: Number(env.CAMERA_2_PORTA ?? 8500), portaImagem: Number(env.CAMERA_2_PORTA_IMAGEM ?? 80) },
    ],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config.test.js`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat(config): porta de imagem por camera (default 80)"
```

---

## Task 2: Helper de busca da imagem da câmera

**Files:**
- Create: `src/camera/live-image.js`
- Test: `tests/camera-live-image.test.js`

- [ ] **Step 1: Write the failing test**

Criar `tests/camera-live-image.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarImagemCamera } from '../src/camera/live-image.js';

function fetchFake({ ok = true, status = 200, bytes = 'jpeg-bytes' } = {}) {
  const chamadas = [];
  const fetchFn = async (url, opts) => {
    chamadas.push({ url, opts });
    return {
      ok,
      status,
      arrayBuffer: async () => new TextEncoder().encode(bytes).buffer,
    };
  };
  return { fetchFn, chamadas };
}

test('buscarImagemCamera monta a URL com ip, portaImagem e iliveimage.jpg', async () => {
  const { fetchFn, chamadas } = fetchFake();
  await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn });
  assert.match(chamadas[0].url, /^http:\/\/1\.2\.3\.4:80\/iliveimage\.jpg\?\d+$/);
});

test('buscarImagemCamera usa porta customizada quando informada', async () => {
  const { fetchFn, chamadas } = fetchFake();
  await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 8080 }, { fetchFn });
  assert.match(chamadas[0].url, /:8080\/iliveimage\.jpg/);
});

test('buscarImagemCamera retorna um Buffer com os bytes da câmera', async () => {
  const { fetchFn } = fetchFake({ bytes: 'ABC' });
  const buf = await buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn });
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString(), 'ABC');
});

test('buscarImagemCamera lança erro em status não-ok', async () => {
  const { fetchFn } = fetchFake({ ok: false, status: 503 });
  await assert.rejects(
    () => buscarImagemCamera({ id: 1, ip: '1.2.3.4', portaImagem: 80 }, { fetchFn }),
    /HTTP 503/
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/camera-live-image.test.js`
Expected: FAIL — módulo `src/camera/live-image.js` não existe.

- [ ] **Step 3: Write minimal implementation**

Criar `src/camera/live-image.js`:

```js
// Caminho fixo do firmware do IV4 (Monitor da Web → Imagem da Web).
const CAMINHO_IMAGEM = 'iliveimage.jpg';

/**
 * Busca o JPEG ao vivo de uma câmera IV4 via Monitor da Web (HTTP).
 * @param {{ ip: string, portaImagem?: number }} cam
 * @param {{ fetchFn?: typeof fetch, timeoutMs?: number }} [opts]
 * @returns {Promise<Buffer>}
 */
export async function buscarImagemCamera(cam, { fetchFn = fetch, timeoutMs = 2000 } = {}) {
  const porta = cam.portaImagem ?? 80;
  const url = `http://${cam.ip}:${porta}/${CAMINHO_IMAGEM}?${Date.now()}`;
  const resp = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/camera-live-image.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/camera/live-image.js tests/camera-live-image.test.js
git commit -m "feat(camera): helper buscarImagemCamera para o Monitor da Web do IV4"
```

---

## Task 3: Rota proxy `GET /cameras/:id/live-image`

**Files:**
- Create: `src/http/routes/cameras.js`
- Test: `tests/cameras-routes.test.js`

- [ ] **Step 1: Write the failing test**

Criar `tests/cameras-routes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { rotasCameras } from '../src/http/routes/cameras.js';

const CAMERAS = [
  { id: 1, ip: '1.2.3.4', portaImagem: 80 },
  { id: 2, ip: '1.2.3.5', portaImagem: 80 },
];

async function app({ buscarImagem }) {
  const fastify = Fastify({ logger: false });
  rotasCameras(fastify, { cameras: CAMERAS, buscarImagem });
  await fastify.ready();
  return fastify;
}

test('GET /cameras/:id/live-image devolve a imagem da câmera correta', async () => {
  const usadas = [];
  const fastify = await app({
    async buscarImagem(cam) { usadas.push(cam.id); return Buffer.from('IMG-2'); },
  });

  const r = await fastify.inject({ method: 'GET', url: '/cameras/2/live-image' });

  assert.equal(r.statusCode, 200);
  assert.match(r.headers['content-type'], /image\/jpeg/);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.rawPayload.toString(), 'IMG-2');
  assert.deepEqual(usadas, [2]);
});

test('GET /cameras/:id/live-image responde 404 para câmera desconhecida', async () => {
  const fastify = await app({ async buscarImagem() { return Buffer.from('x'); } });
  const r = await fastify.inject({ method: 'GET', url: '/cameras/99/live-image' });
  assert.equal(r.statusCode, 404);
  assert.match(r.json().erro, /camera 99 desconhecida/i);
});

test('GET /cameras/:id/live-image responde 503 quando a busca falha', async () => {
  const fastify = await app({
    async buscarImagem() { throw new Error('timeout'); },
  });
  const r = await fastify.inject({ method: 'GET', url: '/cameras/1/live-image' });
  assert.equal(r.statusCode, 503);
  assert.match(r.json().erro, /imagem indispon[ií]vel/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cameras-routes.test.js`
Expected: FAIL — módulo `src/http/routes/cameras.js` não existe.

- [ ] **Step 3: Write minimal implementation**

Criar `src/http/routes/cameras.js`:

```js
import { buscarImagemCamera } from '../../camera/live-image.js';

export function rotasCameras(fastify, { cameras, buscarImagem = buscarImagemCamera }) {
  const porId = new Map(cameras.map((c) => [c.id, c]));

  fastify.get('/cameras/:id/live-image', async (req, reply) => {
    const id = Number(req.params.id);
    const cam = porId.get(id);
    if (!cam) return reply.code(404).send({ erro: `camera ${id} desconhecida` });
    try {
      const buf = await buscarImagem(cam);
      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Cache-Control', 'no-store')
        .send(buf);
    } catch (e) {
      return reply.code(503).send({ erro: `imagem indisponível para camera ${id}: ${e.message}` });
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/cameras-routes.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/http/routes/cameras.js tests/cameras-routes.test.js
git commit -m "feat(http): rota proxy GET /cameras/:id/live-image"
```

---

## Task 4: Registrar a rota no servidor

**Files:**
- Modify: `src/server.js` (bloco de imports de rotas ~41-49 e bloco de registro ~215-225)

- [ ] **Step 1: Add the import**

Em `src/server.js`, logo após a linha `import { rotaHealth } from './http/routes/health.js';`, adicionar:

```js
import { rotasCameras } from './http/routes/cameras.js';
```

- [ ] **Step 2: Register the route**

Em `src/server.js`, logo após a linha `rotaHealth(fastify, { db, syncWorker, cameraManagers });`, adicionar:

```js
  rotasCameras(fastify, { cameras: config.cameras });
```

- [ ] **Step 3: Verify the server boots and the full suite passes**

Run: `npm test`
Expected: PASS em toda a suíte (nenhuma regressão; novos testes das Tasks 1-3 inclusos).

- [ ] **Step 4: Commit**

```bash
git add src/server.js
git commit -m "feat(server): registra rota de imagem ao vivo das cameras"
```

---

## Task 5: Área de imagem ao vivo no painel (opt-in)

**Files:**
- Modify: `public/js/ui/composites/painel-contagem.js`
- Test: `tests/frontend/ui/painel-contagem.test.js`

- [ ] **Step 1: Write the failing test**

Adicionar ao fim de `tests/frontend/ui/painel-contagem.test.js`:

```js
test('sem liveImage não renderiza área de imagem (uso no operador)', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1, programa_nome: 'PECA-A' } });
  assert.equal(el.querySelector('[data-camera-live]'), null);
});

test('com liveImage renderiza <img> apontando para o proxy da câmera', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 2, programa_nome: 'PECA-A' }, liveImage: true });
  const img = el.querySelector('[data-camera-live-img]');
  assert.ok(img, 'img deve existir');
  assert.match(img.getAttribute('src'), /^\/cameras\/2\/live-image\?\d+$/);
  assert.match(img.getAttribute('alt'), /câmera 2/i);
});

test('evento de erro na imagem revela o placeholder', () => {
  const el = PainelContagem({ sessao: { id: 'x', quantidade_total: 0, camera_id: 1, programa_nome: 'PECA-A' }, liveImage: true });
  const img = el.querySelector('[data-camera-live-img]');
  const placeholder = el.querySelector('[data-camera-live-placeholder]');
  assert.ok(placeholder.classList.contains('hidden'), 'placeholder começa oculto');
  img.dispatchEvent(new Event('error'));
  assert.ok(img.classList.contains('hidden'), 'img some no erro');
  assert.ok(!placeholder.classList.contains('hidden'), 'placeholder aparece no erro');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend/ui/painel-contagem.test.js`
Expected: FAIL — `[data-camera-live-img]` não existe (com liveImage).

- [ ] **Step 3: Write minimal implementation**

Em `public/js/ui/composites/painel-contagem.js`:

3a. Alterar a assinatura da função (linha 4) para aceitar `liveImage`:

```js
export function PainelContagem({ sessao, onEncerrar, onReiniciarContagem, onReiniciarSessao, liveImage = false } = {}) {
```

3b. Logo após o bloco `if (onEncerrar || ...) { ... el.appendChild(actions); }` (antes do bloco do cronômetro `const tempoEl = ...`), inserir:

```js
  if (liveImage) {
    const area = document.createElement('div');
    area.dataset.cameraLive = 'true';
    area.className = 'relative border-t border-surface-container bg-black/5';

    const img = document.createElement('img');
    img.dataset.cameraLiveImg = 'true';
    img.className = 'block w-full h-auto object-contain';
    img.alt = `Imagem ao vivo da câmera ${sessao.camera_id}`;
    img.src = `/cameras/${sessao.camera_id}/live-image?${Date.now()}`;

    const placeholder = document.createElement('div');
    placeholder.dataset.cameraLivePlaceholder = 'true';
    placeholder.className = 'hidden absolute inset-0 flex items-center justify-center text-sm font-medium text-outline';
    placeholder.textContent = 'Câmera indisponível';

    img.addEventListener('error', () => {
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
    });
    img.addEventListener('load', () => {
      img.classList.remove('hidden');
      placeholder.classList.add('hidden');
    });

    area.appendChild(img);
    area.appendChild(placeholder);
    el.appendChild(area);

    // Polling do JPEG ao vivo; auto-limpa quando o painel sai da tela
    // (mesmo padrão do cronômetro de tempo abaixo).
    const PERIODO_MS = 1000;
    const timerImg = setInterval(() => {
      if (!el.isConnected) { clearInterval(timerImg); return; }
      img.src = `/cameras/${sessao.camera_id}/live-image?${Date.now()}`;
    }, PERIODO_MS);
    timerImg.unref?.();
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/frontend/ui/painel-contagem.test.js`
Expected: PASS (todos os testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/composites/painel-contagem.js tests/frontend/ui/painel-contagem.test.js
git commit -m "feat(tv): área de imagem ao vivo opt-in no PainelContagem"
```

---

## Task 6: Ativar a imagem ao vivo na TV

**Files:**
- Modify: `public/js/tv-render.js:12`
- Test: `tests/frontend/pages/tv.test.js`

- [ ] **Step 1: Write the failing test**

Adicionar ao fim de `tests/frontend/pages/tv.test.js`:

```js
test('renderTV ativa a imagem ao vivo em cada painel', () => {
  const sessoes = {
    todas: () => [
      { id: 'a', camera_id: 1, quantidade_total: 10, programa_nome: 'PECA-A' },
      { id: 'b', camera_id: 2, quantidade_total: 20, programa_nome: 'PECA-B' },
    ],
  };
  const el = renderTV({ sessoes });
  const imgs = el.querySelectorAll('[data-camera-live-img]');
  assert.equal(imgs.length, 2);
  assert.match(imgs[0].getAttribute('src'), /\/cameras\/1\/live-image/);
  assert.match(imgs[1].getAttribute('src'), /\/cameras\/2\/live-image/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/frontend/pages/tv.test.js`
Expected: FAIL — `[data-camera-live-img]` ausente (renderTV ainda não passa `liveImage`).

- [ ] **Step 3: Write minimal implementation**

Em `public/js/tv-render.js`, alterar a linha 12:

```js
  for (const s of ativas) el.appendChild(PainelContagem({ sessao: s, liveImage: true }));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/frontend/pages/tv.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add public/js/tv-render.js tests/frontend/pages/tv.test.js
git commit -m "feat(tv): exibe imagem ao vivo das cameras nos paineis"
```

---

## Task 7: Documentar variável de ambiente e validar a suíte completa

**Files:**
- Modify: `.env.example:6-8`

- [ ] **Step 1: Document the env var**

Em `.env.example`, substituir as linhas das câmeras (6-8) por:

```
CAMERA_1_IP=
CAMERA_1_PORTA=8500
CAMERA_1_PORTA_IMAGEM=80
CAMERA_2_IP=
CAMERA_2_PORTA=8500
CAMERA_2_PORTA_IMAGEM=80
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS em toda a suíte, sem regressões.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): CAMERA_N_PORTA_IMAGEM (porta do Monitor da Web do IV4)"
```

---

## Validação Manual (pós-implementação, no Edge PC)

Não automatizável (depende de hardware/rede). Executar com câmeras ligadas, Monitor da Web habilitado e porta 80 liberada no firewall:

1. `npm start` no Edge PC.
2. Abrir `http://localhost:3000/cameras/1/live-image` no browser → deve exibir o JPEG da câmera 1.
3. Repetir para `/cameras/2/live-image`.
4. Abrir a TV (`http://localhost:3000/tv/`) com sessões ativas nas duas câmeras → cada painel mostra o feed ao vivo da sua câmera, atualizando ~1×/s, com a linha de contagem visível.
5. Desligar/bloquear uma câmera → o painel correspondente mostra "Câmera indisponível" sem quebrar o layout; o outro painel segue normal.
6. Encerrar uma sessão → o painel some e o polling daquela câmera cessa.

---

## Self-Review

**Cobertura do spec:**
- Endpoint proxy `GET /cameras/:id/live-image` → Tasks 3-4. ✓
- Polling de JPEG ~1s no frontend, um `<img>` por painel → Tasks 5-6. ✓
- Isolamento por câmera (1 não aparece no painel da 2) → Task 6 testa `src` com id correto. ✓
- Placeholder em falha / 503 → Tasks 3 (503) e 5 (placeholder no erro). ✓
- Config `portaImagem` default 80 + `.env.example` → Tasks 1 e 7. ✓
- Sessão encerrada cessa polling → padrão `!isConnected` (Task 5) + validação manual passo 6. ✓
- Sem disco / sem internet / contagem inalterada → nenhuma task toca SQLite, FTP ou fluxo de pulsos. ✓

**Placeholders:** nenhum — todo passo tem código/comando concretos.

**Consistência de tipos/nomes:** `buscarImagemCamera` (definida na Task 2) é o default importado na Task 3; o parâmetro injetável da rota chama-se `buscarImagem` em ambas (route e teste). `portaImagem` consistente entre config (Task 1), helper (Task 2) e testes. Seletores `[data-camera-live]`, `[data-camera-live-img]`, `[data-camera-live-placeholder]` idênticos entre componente (Task 5) e testes (Tasks 5-6). ✓
