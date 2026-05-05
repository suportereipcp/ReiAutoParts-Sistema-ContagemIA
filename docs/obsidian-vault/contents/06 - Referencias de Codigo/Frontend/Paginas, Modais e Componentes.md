---
tags:
  - codigo
  - frontend
  - paginas
arquivos_cobertos:
  - public/js/pages/dashboard.js
  - public/js/pages/selecao-carga.js
  - public/js/pages/detalhes-carga.js
  - public/js/pages/detalhes-carga-expedida.js
  - public/js/pages/emitir-relatorios.js
  - public/js/pages/relatorios-cargas-abertas.js
  - public/js/pages/eventos.js
  - public/js/ui/primitives/*.js
  - public/js/ui/composites/*.js
testes_relacionados:
  - tests/frontend/pages/dashboard.test.js
  - tests/frontend/pages/selecao-carga.test.js
  - tests/frontend/pages/detalhes-carga.test.js
  - tests/frontend/pages/detalhes-carga-expedida.test.js
  - tests/frontend/pages/emitir-relatorios.test.js
  - tests/frontend/pages/relatorios-cargas-abertas.test.js
  - tests/frontend/pages/eventos.test.js
  - tests/frontend/ui/*.test.js
origem:
  - 28822ce feat(frontend): dashboard page + tests
  - 76ab5f6 feat(frontend): modal Nova Carga composite + tests
  - d93caa8 feat(frontend): detalhes-carga page + Painel + Tabela composites + tests
  - 8e7eae4 feat(frontend): emitir-relatorios page + modal composite + tests
  - 6f88980 feat(frontend+backend): eventos page + GET /eventos route + tests
  - ec3ff6d feat(frontend): TV kiosk redesign reusing PainelContagem
  - 9233323 feat(frontend): 4 telas pendentes do design stitch (continuar carga + expedida + agrupada)
atualizado_em: 2026-04-22
---

# Paginas, Modais e Componentes

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- fluxo de nova carga;
- painel de contagem;
- tabela de caixas;
- dashboard;
- paginas de relatorio;
- pagina de eventos;
- primitives visuais e modais da SPA.

## Mapa rapido das paginas

| Arquivo | Papel |
|---|---|
| `public/js/pages/dashboard.js` | landing da SPA |
| `public/js/pages/selecao-carga.js` | lista embarques abertos e abre o modal de nova carga |
| `public/js/pages/detalhes-carga.js` | mostra cabecalho do embarque, painel da sessao ativa e caixas encerradas |
| `public/js/pages/detalhes-carga-expedida.js` | variante de leitura para carga expedida |
| `public/js/pages/emitir-relatorios.js` | fluxo de emissao de relatorios |
| `public/js/pages/relatorios-cargas-abertas.js` | visao auxiliar de relatorios para cargas abertas |
| `public/js/pages/eventos.js` | tabela de eventos com consumo de `/eventos` |

## Arquivos de fluxo mais importantes

### `public/js/pages/selecao-carga.js`

- consome `catalogos.embarquesAbertos()`;
- usa `CardCarga`;
- abre `modal-nova-carga.js` sob demanda.

### `public/js/ui/composites/modal-nova-carga.js`

Este arquivo concentra o fluxo mais importante da operacao:

1. coleta embarque, OP, operador e camera;
2. chama `sessoesSvc.abrir(form)`;
3. troca para a etapa de escolha de programa;
4. consulta `catalogos.programas(cameraId, q)`;
5. confirma a sessao e redireciona para `#/cargas/<embarque>`.

Se a alteracao envolve abrir sessao no frontend, comece por ele.

### `public/js/pages/detalhes-carga.js`

- busca embarque e sessoes do embarque em paralelo;
- mostra `PainelContagem` para a sessao ativa;
- mostra `TabelaCaixas` para as encerradas;
- escuta atualizacoes do store de sessoes para refletir contagem ao vivo.

### `public/js/ui/composites/painel-contagem.js`

E o card visual da contagem em tempo real. Foi reaproveitado tambem pela TV.

## Primitives visuais

Arquivos em `public/js/ui/primitives/` definem a base reutilizavel:

- `badge.js`
- `button.js`
- `card.js`
- `icon.js`
- `input.js`
- `modal.js`
- `sidenav.js`
- `toast.js`
- `topnav.js`

Se a mudanca e visual e repetida em varias telas, a chance e alta de estar aqui e nao na pagina.

## Composites

Arquivos em `public/js/ui/composites/` montam blocos de fluxo ou negocio visual:

- `card-carga.js`
- `modal-nova-carga.js`
- `modal-emitir-relatorio.js`
- `modal-continuar-carga-unica.js`
- `modal-continuar-carga-multipla.js`
- `painel-contagem.js`
- `tabela-caixas.js`

## Contexto de criacao

O frontend foi evoluindo em ondas:

- `28822ce`: dashboard inicial;
- `76ab5f6`: modal de nova carga;
- `d93caa8`: detalhes da carga e composites centrais;
- `8e7eae4`: emissao de relatorios;
- `6f88980`: eventos;
- `ec3ff6d`: TV reaproveitando `PainelContagem`;
- `9233323`: telas pendentes adicionais do Stitch.

## Testes que ajudam a editar com seguranca

- paginas: `tests/frontend/pages/*.test.js`
- components: `tests/frontend/ui/*.test.js`

Se a mudanca for de fluxo e UI ao mesmo tempo, cruze esta nota com:

- [[06 - Referencias de Codigo/Frontend/Estado, API e Eventos]]
- [[06 - Referencias de Codigo/Backend/HTTP, WebSocket e Relatorios]]
- [[06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem]]
