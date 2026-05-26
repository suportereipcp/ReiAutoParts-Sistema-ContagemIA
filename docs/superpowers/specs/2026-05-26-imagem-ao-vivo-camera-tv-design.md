# Imagem ao Vivo da Câmera no Monitor TV

Data: 2026-05-26

## Objetivo

Exibir, em cada painel do Monitor 2 (TV kiosk), o feed ao vivo da câmera Keyence correspondente — a imagem que a própria câmera renderiza com a linha de contagem e os boxes de rastreamento sobrepostos. O operador na TV vê em tempo (quase) real a esteira, as peças cruzando a linha e a contagem acontecendo, ao lado do contador numérico já existente.

A exibição é **puramente demonstrativa**: não afeta a contagem, não persiste imagens e não cria dependência de internet. A contagem continua 100% governada pelos pulsos TCP na porta 8500.

## Descoberta de Hardware (base da solução)

A câmera **Keyence IV4-600CA** possui um **Monitor da Web** nativo (configurável em `Configurações de comunicação → Monitor da Web → Habilitar(HTTP)` no IV Smart Navigator; requer reinício da câmera para aplicar).

Quando habilitado, a câmera roda um servidor HTTP na **porta 80** e serve:

- `http://<ip-camera>/iv4-wm-i.html` — página HTML do monitor
- `http://<ip-camera>/iliveimage.jpg` — **o JPEG ao vivo** (atualizado pela própria câmera)

A página HTML da Keyence é apenas um `<img>` que recarrega `iliveimage.jpg?<timestamp>` a cada 2 segundos via `setInterval`. Ou seja, **o recurso que nos interessa é o endpoint `iliveimage.jpg`** — um snapshot que reflete a visão atual da câmera, com overlays de linha/box. Não é MJPEG/stream: é polling de JPEG.

A imagem mostra exatamente o frame do julgamento quando uma peça cruza a linha de contagem (mesmo evento que dispara o pulso TCP), além do movimento contínuo da esteira nos demais momentos.

### Pré-requisito de rede

O Edge PC precisa de acesso à **porta 80** de cada câmera. No ambiente atual o firewall corporativo (gerido pelo TI) libera por IP+porta — hoje liberadas 8500 (contagem) e 63000 (Navigator). A porta 80 já foi liberada para a câmera 1 (`192.168.15.196`) durante a validação. A câmera 2 precisará da mesma liberação.

## Abordagem Escolhida

**Polling de JPEG via proxy no backend.**

- O frontend da TV faz poll de um endpoint **same-origin** no próprio Edge PC: `GET /cameras/:id/live-image`.
- O backend Fastify repassa (proxy) a requisição para `http://<ip-camera>/iliveimage.jpg` e devolve os bytes da imagem.

Por que proxy em vez de o `<img>` apontar direto para o IP da câmera:

1. Mantém os IPs das câmeras **somente no servidor** (frontend não precisa conhecê-los).
2. Evita qualquer problema de cross-origin / mixed-content no browser kiosk.
3. Permite tratamento central de erro (câmera offline → 503 → placeholder na TV).
4. Alinha com o padrão do projeto (todo acesso a hardware passa pelo backend).

Alternativas descartadas:
- **`<img>` direto para o IP da câmera:** funcionaria para exibição, mas exporia IPs no frontend e dependeria do firewall liberar a porta 80 para o browser kiosk (que pode rodar em PC diferente do que hospeda o backend).
- **FTP / SFTP (foto por julgamento gravada em disco):** suportado pela câmera, mas exige servidor FTP no Edge PC, escrita em disco e limpeza. Desnecessário agora que o live view por HTTP funciona.
- **MJPEG / stream contínuo:** a câmera não expõe stream, apenas JPEG por polling.

## Arquitetura

```
Browser TV (Edge PC)                 Backend Fastify (Edge PC)            Câmera IV4
  <img> por painel  ──poll 1s──►  GET /cameras/:id/live-image  ──HTTP──►  GET /iliveimage.jpg
                                   (proxy, validação de id)                (porta 80)
        ◄────────── bytes JPEG ──────────────◄──── bytes JPEG ───────────◄
```

- **Sem** SQLite, **sem** WebSocket novo, **sem** arquivos em disco, **sem** mudança no fluxo de pulsos.
- A imagem só aparece para câmeras com **sessão ativa** (a TV já só renderiza painéis de sessões ativas; encerrar a sessão remove o painel e, com ele, a imagem).

## Componentes

### 1. Config (`src/config.js`)

Adicionar a porta do monitor web por câmera, com default 80:

```js
cameras: [
  { id: 1, ip: env.CAMERA_1_IP, porta: Number(env.CAMERA_1_PORTA ?? 8500),
    portaImagem: Number(env.CAMERA_1_PORTA_IMAGEM ?? 80) },
  { id: 2, ip: env.CAMERA_2_IP, porta: Number(env.CAMERA_2_PORTA ?? 8500),
    portaImagem: Number(env.CAMERA_2_PORTA_IMAGEM ?? 80) },
],
```

Documentar `CAMERA_N_PORTA_IMAGEM` em `.env.example`. O caminho `iliveimage.jpg` é fixo do firmware IV4 — fica como constante no código, não em `.env`.

### 2. Rota proxy (`src/http/routes/cameras.js` — novo)

`rotasCameras(fastify, { cameras })`:

- `GET /cameras/:id/live-image`
  - Valida `id` contra a lista de câmeras conhecidas (404 se desconhecido).
  - `fetch('http://<ip>:<portaImagem>/iliveimage.jpg', { signal: AbortSignal.timeout(2000) })` (fetch global do Node 20).
  - Sucesso → responde `200` com `Content-Type: image/jpeg`, `Cache-Control: no-store`, corpo = bytes da câmera.
  - Falha (timeout, conexão recusada, status não-2xx) → responde `503` (a TV cai no placeholder via `onerror`).
- Registrar em `server.js`: `rotasCameras(fastify, { cameras: config.cameras })`.

### 3. Frontend TV

**`public/js/ui/composites/painel-contagem.js`** — adicionar uma área de imagem ao painel (abaixo do bloco de info/contador, dentro do card), exibida apenas no contexto da TV. Estrutura:

```html
<div data-camera-live class="border-t border-surface-container bg-black/5">
  <img data-camera-live-img
       class="w-full h-auto object-contain"
       alt="Imagem ao vivo da câmera ${sessao.camera_id}">
  <!-- placeholder quando a imagem falha -->
</div>
```

**`public/js/tv-render.js` / `tv-app.js`** — para cada painel renderizado, iniciar um poll que atualiza o `src`:

```js
const PERIODO_MS = 1000;
function iniciarLiveImage(painelEl, cameraId) {
  const img = painelEl.querySelector('[data-camera-live-img]');
  const tick = () => {
    if (!painelEl.isConnected) { clearInterval(timer); return; }
    img.src = `/cameras/${cameraId}/live-image?${Date.now()}`;
  };
  const timer = setInterval(tick, PERIODO_MS);
  timer.unref?.();
  tick();
}
```

- O padrão de auto-limpeza do intervalo segue o cronômetro já existente em `painel-contagem.js` (`if (!el.isConnected) clearInterval(...)`).
- `img.onerror` → troca para um placeholder ("Sem imagem" / "Câmera indisponível") sem quebrar o layout.
- O período de 1s é mais responsivo que os 2s da página nativa da Keyence; a câmera pode atualizar o JPEG em ritmo próprio, mas 1s dá percepção de "ao vivo" sem sobrecarga (2 câmeras × 1 req/s).

## Tratamento de Erros

| Situação | Comportamento |
|---|---|
| Câmera sem porta 80 liberada / offline | proxy responde 503 → `<img onerror>` mostra placeholder |
| Timeout na busca da imagem (>2s) | proxy aborta e responde 503 → placeholder |
| `id` de câmera inválido na rota | 404 |
| Sessão encerrada | painel é removido na re-renderização → poll se auto-encerra (`!isConnected`) |
| Monitor da Web desabilitado na câmera | 503 contínuo → placeholder permanente (sinaliza configuração pendente) |

## Fora de Escopo

- Persistência ou histórico de imagens.
- Galeria/replay de frames antes/depois do julgamento (a câmera não expõe sequência de frames; só o JPEG ao vivo).
- Stream MJPEG/vídeo.
- Exibir imagem no Monitor 1 (operador) — apenas a TV kiosk.
- Configurar o Monitor da Web da câmera via código (feito manualmente no IV Smart Navigator).

## Critérios de Aceite

1. Com Monitor da Web habilitado e porta 80 liberada, cada painel da TV exibe o feed ao vivo da sua câmera, atualizando ~1×/s.
2. A imagem da câmera 1 nunca aparece no painel da câmera 2 e vice-versa.
3. Câmera indisponível mostra placeholder sem quebrar o layout nem travar o restante da TV.
4. Encerrar a sessão remove o painel e cessa o polling daquela câmera.
5. Nenhuma imagem é gravada em disco; nenhum acesso à internet é necessário.
6. A contagem (pulsos TCP) permanece inalterada.
