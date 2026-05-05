---
tags:
  - operacao
  - keyence
  - tcp
fontes:
  - manual.pdf
  - AGENTS.md
  - docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md
atualizado_em: 2026-05-05
---

# Integracao Keyence IV4

## Base lida

Esta nota resume o capitulo de comunicacao aciclica TCP/IP do `manual.pdf` e cruza esse conteudo com os comandos adotados na arquitetura do sistema.

## Especificacoes de comunicacao

- protocolo: TCP/IP aciclico;
- porta padrao: `8500`;
- ate 2 conexoes;
- codificacao: ASCII;
- delimitador: `CR (0x0D)`.

## Preparacao da camera

Segundo o manual, a camera deve ter:

1. comunicacao nao processual habilitada;
2. porta TCP configurada e preferencialmente mantida em `8500`;
3. metodo de alternacao de programa ajustado para `Painel/PC/Rede/Troca automatica`.

## Comandos usados pelo sistema

| Comando | Uso no projeto | Resposta esperada |
|---|---|---|
| `PW,nnn` | troca o programa antes da sessao | `PW` |
| `PR` | le o programa atual | `PR,nnn` |
| `PNR` | le o nome do programa atual | `PNR,...` |
| `OE,1` | habilita emissao automatica de resultado | `OE` |
| `OE,0` | suspende emissao automatica | `OE` |
| `CTR` | zera contagem interna | `CTR` |
| `SR` | consulta status do sensor | `SR,a,b,c,d,e,f,g` |
| `RER` / `WR` | leem erro e aviso | `RER,nnn` / `WR,nnn` |

## Regras operacionais importantes

- `OE` volta para desabilitado apos desligar a energia;
- a alteracao de formato e alguns estados valem so enquanto a conexao estiver aberta;
- o sistema atual trabalha com a regra "comando antes de escuta": so considera pulso valido depois de armar a camera;
- numero do programa e nome do programa sao campos diferentes. No Navigator, `P017: PROG_017` significa numero `017` e nome `PROG_017`;
- o cache local de programas deve refletir exatamente `numero -> nome`. Exemplo validado em campo: `P008 = 867A.2` e `P017 = PROG_017`.

## Payload de contagem

### Formato real usado no modo IA Contagem de Passagem

A camera Keyence nao envia JSON bruto. Ela envia linhas ASCII/CSV terminadas por `CR`.

Formato observado/validado para o modo `IA Contagem de Passagem`:

```text
RT,<numero_resultado>,--,<ferramenta>,<contagem>,<total_dia>\r
```

Exemplo:

```text
RT,04123,--,01,0000001,0000005\r
```

Interpretacao no sistema:

- `RT`: resultado automatico da camera;
- `04123`: numero sequencial do resultado/julgamento;
- `--`: status geral informado pela camera;
- `01`: ferramenta / tool ID;
- `0000001`: contagem atual da ferramenta;
- `0000005`: total do dia informado pela camera.

JSON interno gerado pelo sistema:

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

### Formato legado ainda aceito pelo parser

O parser ainda aceita o formato antigo documentado inicialmente:

```text
02,0000150,0000500,000\r
```

Interpretacao:

- `02`: ferramenta / tool ID;
- `0000150`: contagem atual;
- `0000500`: total do dia;
- `000`: brilho.

Esse formato nao deve ser assumido como emissao atual da camera IV4 em uso. Para diagnostico de campo, priorize o formato `RT,...`.

## Filtragem de resultados repetidos

A Keyence pode enviar `RT` continuamente a cada captura/julgamento. Nessa situacao, `numero_resultado` muda, mas `contagem` e `total_dia` podem permanecer iguais:

```text
RT,04123,--,01,0000001,0000005\r
RT,04124,--,01,0000001,0000005\r
RT,04125,--,01,0000001,0000005\r
```

Isso nao representa tres pecas novas. O sistema trata como um unico pulso enquanto `ferramenta + contagem + total_dia` permanecerem iguais. Um novo pulso so e emitido quando `contagem` ou `total_dia` muda, ou quando o filtro e limpo por reinicio da contagem/sessao.

## Log ao vivo no sistema

A tela `Eventos > Trafego ao vivo` mostra em tempo real:

- `ASCII/CSV recebido`: linha bruta enviada pela camera;
- `JSON interpretado`: objeto interno gerado pelo parser;
- status de leitura, como `Contagem lida`, `Resposta de comando`, `Resposta solta`, `Erro lido` ou `Nao interpretada`;
- agrupamento por dia e camera, com filtro por dia/camera e scroll interno.

Use esse painel para validar se o problema esta na emissao da camera, no parser ou no fluxo de contagem.

## Erros relevantes do manual

| Codigo | Significado resumido |
|---|---|
| `02` | comando inexistente |
| `03` | comando invalido para o estado ou configuracao atual |
| `22` | numero de parametros ou faixa incorreta |

## Leitura pratica para o projeto

- `PW`, `CTR` e `OE,1` formam a ativacao da sessao;
- `OE,0` encerra a escuta automatica;
- `PR` e `PNR` apoiam inspecao, diagnostico e cache de programas;
- `PNR` deve ser casado somente com resposta `PNR`; respostas assincronas de outro comando nao podem preencher nome de programa;
- `SR`, `RER` e `WR` sao uteis para troubleshooting de hardware.
