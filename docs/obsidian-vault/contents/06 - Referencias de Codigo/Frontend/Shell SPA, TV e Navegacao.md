---
tags:
  - codigo
  - frontend
  - shell
arquivos_cobertos:
  - public/index.html
  - public/js/app.js
  - public/tv/index.html
  - public/js/tv-app.js
  - public/js/tv-render.js
  - public/css/tokens.css
testes_relacionados:
  - tests/frontend/infra/router.test.js
  - tests/frontend/pages/tv.test.js
origem:
  - 0b9a81d feat(frontend): SPA shell + router wiring
  - ec3ff6d feat(frontend): TV kiosk redesign reusing PainelContagem
atualizado_em: 2026-04-22
---

# Shell SPA, TV e Navegacao

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- shell HTML da aplicacao do operador;
- layout fixo com sidenav e topnav;
- rotas hash;
- bootstrap da TV kiosk;
- montagem inicial da SPA;
- tokens visuais globais.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `public/index.html` | shell da SPA do operador; carrega Tailwind, fontes, tokens e `app.js` |
| `public/js/app.js` | orquestra router, shell, stores, API e paginas do operador |
| `public/tv/index.html` | shell simplificado da TV kiosk |
| `public/js/tv-app.js` | bootstrap da TV; liga WS, health e renderizacao |
| `public/js/tv-render.js` | converte estado das sessoes em DOM da TV |
| `public/css/tokens.css` | tokens visuais compartilhados do frontend |

## Responsabilidade de cada entrypoint

### Operador

`public/index.html` apenas prepara o ambiente. Quem monta a aplicacao de fato e `public/js/app.js`.

`app.js`:

- cria API client, catalogos, services e stores;
- registra listeners WS;
- faz polling de `/health`;
- monta `SideNav`, `TopNav` e `SyncBadge`;
- resolve rotas hash e renderiza paginas.

### TV kiosk

`public/tv/index.html` carrega uma shell dedicada e `public/js/tv-app.js`.

`tv-app.js`:

- conecta WS;
- reaproveita os stores de sync e sessoes;
- faz bootstrap com `/sessoes` e `/health`;
- rerenderiza quando o estado muda.

## Rotas principais da SPA do operador

| Hash route | Pagina |
|---|---|
| `#/` | dashboard |
| `#/cargas` | selecao de carga |
| `#/cargas/:numero` | detalhes da carga aberta |
| `#/expedidas/:numero` | detalhes de carga expedida |
| `#/relatorios` | emissao de relatorios |
| `#/relatorios/abertas` | relatorios de cargas abertas |
| `#/eventos` | logs e eventos |

## Contexto de criacao

- a shell SPA entrou em `0b9a81d`;
- a TV foi redesenhada e passou a reaproveitar `PainelContagem` em `ec3ff6d`.

## Se a alteracao for de comportamento e nao de layout

Veja tambem:

- [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]]
- [[06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes]]
