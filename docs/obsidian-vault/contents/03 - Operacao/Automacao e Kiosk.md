---
tags:
  - operacao
  - windows
  - kiosk
fontes:
  - scripts_automacao.md
  - scripts/start-edge.bat
  - scripts/kiosk-tv.bat
  - abrir-sistema.bat
atualizado_em: 2026-04-22
---

# Automacao e Kiosk

## Estado atual do repositorio

Arquivos reais encontrados:

- `abrir-sistema.bat`
- `scripts/start-edge.bat`
- `scripts/kiosk-tv.bat`
- `ecosystem.config.cjs`

## Fluxo atual de inicializacao

### `abrir-sistema.bat`

- detecta o Chrome;
- sobe o backend com PM2 ou faz fallback para `npm start`;
- espera `/health` responder em `http://localhost:3000/health`;
- abre operador em `http://localhost:3000/`;
- abre TV em `http://localhost:3000/tv/` no segundo monitor.

### `scripts/start-edge.bat`

- inicia `contagem-edge` via PM2;
- abre o Chrome em nova janela para a UI do operador.

### `scripts/kiosk-tv.bat`

- abre o Chrome em modo kiosk;
- usa `--window-position=1920,0`, assumindo o segundo monitor a direita do principal.

## Diferenca para a documentacao historica

O arquivo `scripts_automacao.md` descreve a mesma ideia, mas com referencias antigas:

- usa `start_nexus.bat`;
- aponta para a porta `8000`;
- fala em rotas antigas como `/operador` e `/tv-dashboard`.

Para o estado atual do projeto, considere validas as rotas `3000`, `/` e `/tv/`.

## Ajustes provaveis em campo

- revisar `--window-position` conforme a resolucao e a posicao fisica do Monitor 2;
- validar se o PM2 esta instalado no Edge PC;
- manter a inicializacao dependente do healthcheck antes de abrir o Chrome.
