---
tags:
  - codigo
  - backend
  - keyence
arquivos_cobertos:
  - src/camera/keyence-parser.js
  - src/camera/keyence-client.js
  - src/camera/camera-manager.js
  - src/http/routes/programas.js
testes_relacionados:
  - tests/keyence-parser.test.js
  - tests/keyence-client.test.js
  - tests/camera-manager.test.js
origem:
  - 80f6c08 feat: implementacao completa do sistema de contagem edge-first
atualizado_em: 2026-05-05
---

# Camera Keyence e Programas

## Quando ler esta nota antes do codigo

Leia aqui primeiro se a alteracao envolve:

- protocolo TCP com a camera;
- fila de comandos;
- parse de pulsos ou respostas `ER`;
- parse de resultado automatico `RT` da IA Contagem de Passagem;
- reconnect;
- ativacao e suspensao com `OE`;
- descoberta e busca de programas da camera.

## Arquivos cobertos

| Arquivo | Funcao |
|---|---|
| `src/camera/keyence-parser.js` | converte linhas ASCII em pulso, resposta normal ou erro |
| `src/camera/keyence-client.js` | gerencia socket TCP, buffer, fila de comandos e timeouts |
| `src/camera/camera-manager.js` | adiciona estado de alto nivel: desconectada, suspensa, ativa, reconnect e cache de programas |
| `src/http/routes/programas.js` | endpoint que expõe programas da camera para a UI |

## Sequencia de responsabilidades

1. `keyence-client.js` fala TCP puro com a camera.
2. `keyence-parser.js` interpreta cada linha que volta.
3. `camera-manager.js` usa o client para operar a camera como recurso do dominio.
4. `rotasProgramas.js` consulta o manager e devolve a lista filtrada para a UI.

## O que cada camada faz

### `keyence-client.js`

- abre socket com `setNoDelay` e `keepAlive`;
- acumula bytes ate `CR`;
- envia comandos em fila para evitar respostas concorrentes;
- resolve um comando pendente somente quando a resposta tem o mesmo comando base. Exemplo: `PNR` so pode ser resolvido por resposta `PNR`;
- faz timeout por comando;
- emite eventos `pulso`, `erro`, `desconectado`, `raw`, `resposta-sem-comando` e `linha-processada`;
- deduplica `RT` continuo: se `ferramenta + contagem + total_dia` nao mudarem, a linha repetida nao vira novo pulso nem novo log ao vivo;
- limpa o filtro de `RT` repetido ao receber confirmacao de `CTR` e quando a conexao fecha.

Se o problema e "comando travou", "resposta nao casou" ou "socket fechou", este e o arquivo certo.

### `keyence-parser.js`

- interpreta o formato legado `02,0000150,0000500,000`;
- interpreta o formato real observado no IV Navigator para `IA Contagem de Passagem`:

```text
RT,<numero_resultado>,--,<ferramenta>,<contagem>,<total_dia>
```

Exemplo:

```text
RT,04123,--,01,0000001,0000005
```

Resultado interno:

```json
{
  "tipo": "pulso",
  "ferramenta": 1,
  "contagem": 1,
  "total_dia": 5,
  "brilho": 0,
  "numero_resultado": 4123,
  "status_geral": "--"
}
```

O parser nao deve tratar todo `RT` como pulso. `RT` de ferramenta comum sem contagem numerica deve continuar como resposta normal.

### `camera-manager.js`

- trata reconnect com backoff;
- executa `PW -> CTR -> OE` na ativacao da sessao;
- executa `OE,0` no encerramento;
- descobre programas fazendo iteracao de `PW` e `PNR`;
- guarda cache em `programas`.

Este e o melhor ponto para alterar comportamento operacional da camera sem mexer no TCP bruto.

Regra operacional de programas:

- numero do programa e nome do programa sao entidades diferentes;
- `P017: PROG_017` no Navigator significa `{ numero: 17, nome: "PROG_017" }`;
- cache local valido deve preservar essa associacao. Exemplo validado: `{ numero: 8, nome: "867A.2" }` e `{ numero: 17, nome: "PROG_017" }`;
- quando o cache local estiver incoerente, atualize pela rota `POST /programas/atualizar` somente com a camera livre/suspensa, pois a varredura troca programas temporariamente.

### `rotasProgramas.js`

- valida camera;
- `GET /programas?camera=1&q=...` lista a memoria/cache local filtrada;
- `POST /programas/atualizar` forca varredura real da camera e salva cache local;
- bloqueia atualizacao quando a camera esta com sessao ativa;
- aplica filtro textual local sobre numero/nome ja carregado no manager.

## Acoplamentos importantes

- `sessao-service.js` chama `ativarSessao()` e `encerrarSessao()` no manager;
- `server.js` escuta o evento `pulso` do manager e repassa para `contagem-service.js`;
- `server.js` escuta `linha-processada` e publica `camera.trafego` via WebSocket para o log ao vivo;
- a UI de nova carga depende do endpoint `/programas`.

## Contexto de criacao

Esse subsistema entrou na implementacao base edge-first em `80f6c08` como a espinha dorsal da integracao com a Keyence.

## Testes que devem ser lidos antes de alterar

- `tests/keyence-parser.test.js`: formato de linhas e respostas;
- `tests/keyence-client.test.js`: fila, casamento de resposta por comando, deduplicacao de `RT`, respostas soltas e timeout;
- `tests/camera-manager.test.js`: estados, comandos e descoberta de programas.
