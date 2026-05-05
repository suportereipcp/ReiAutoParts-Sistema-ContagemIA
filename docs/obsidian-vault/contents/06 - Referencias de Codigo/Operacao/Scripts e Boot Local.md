---
tags:
  - codigo
  - operacao
  - scripts
arquivos_cobertos:
  - abrir-sistema.bat
  - scripts/start-edge.bat
  - scripts/kiosk-tv.bat
  - scripts/fake-keyence.js
  - scripts/ping-keyence.js
  - scripts/limpar-outbox-pendentes.js
  - ecosystem.config.cjs
testes_relacionados: []
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
atualizado_em: 2026-04-22
---

# Scripts e Boot Local

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- startup no Windows;
- PM2;
- Chrome em kiosk;
- simulacao da camera;
- ping manual da Keyence;
- limpeza de outbox local.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `abrir-sistema.bat` | bootstrap completo operador + TV, com healthcheck antes de abrir o Chrome |
| `scripts/start-edge.bat` | sobe o backend e abre a UI do operador |
| `scripts/kiosk-tv.bat` | abre a TV em modo kiosk |
| `scripts/fake-keyence.js` | simula uma Keyence por TCP, inclusive `PW`, `PNR`, `CTR`, `OE` e pulsos |
| `scripts/ping-keyence.js` | CLI interativa para conversar com a camera real |
| `scripts/limpar-outbox-pendentes.js` | remove itens ainda nao sincronizados da outbox local |
| `ecosystem.config.cjs` | processo PM2 do backend |

## Scripts mais importantes

### `abrir-sistema.bat`

Melhor ponto de entrada para operacao local. Ele:

- detecta Chrome;
- sobe PM2 ou faz fallback para `npm start`;
- espera `/health`;
- abre operador e TV.

### `fake-keyence.js`

Melhor ponto de apoio para desenvolvimento sem hardware. Simula:

- leitura de programa;
- troca de programa;
- reset de contagem;
- habilitacao de saida automatica;
- emissao de pulso periodica.

### `ping-keyence.js`

Melhor ferramenta para diagnostico manual do protocolo e da conectividade real.

## Cuidados

- `limpar-outbox-pendentes.js` e destrutivo para a fila local; use apenas conscientemente;
- `kiosk-tv.bat` assume o segundo monitor em `1920,0`;
- qualquer mudanca em porta ou rota precisa ser alinhada com os batchs.
