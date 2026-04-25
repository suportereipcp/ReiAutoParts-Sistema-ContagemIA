# Etiquetas de Caixa ZPL Design

## Objetivo

Ao encerrar uma sessao de contagem, o sistema deve emitir uma etiqueta identificadora da caixa. A etiqueta informa quais itens estao na caixa, a quantidade contada, o operador responsavel e a ordem cronologica dos acrescimos. A mesma etiqueta deve poder ser reimpressa a partir de cargas abertas caso seja perdida ou danificada.

O desenho final da etiqueta fisica fica fora deste escopo. Esta especificacao define o modelo operacional, a persistencia, o motor ZPL configuravel e os pontos de integracao para impressora termica.

## Contexto Atual

O projeto ja trata `sessoes_contagem` como trilha historica de contagens. A mesma caixa pode receber novas sessoes no mesmo embarque quando a OP e compativel. Isso permite usar as sessoes encerradas como fonte de verdade para montar a linha cronologica da etiqueta.

O frontend agrupa caixas em `public/js/domain/caixas.js`, e o encerramento de sessao ocorre pelo modal `modal-encerrar-sessao.js`, chamando `POST /sessoes/:id/encerrar`.

## Decisoes

- O motor inicial sera ZPL, nao PDF.
- O layout ZPL inicial sera funcional e simples, sem compromisso com o desenho final.
- O transporte da impressora sera configuravel: TCP/IP ou spooler/driver Windows.
- O encerramento da sessao nao deve ser revertido se a impressao falhar.
- Falhas de impressao geram status pendente ou erro para retry/reimpressao.
- Cada encerramento de sessao cria uma emissao automatica da etiqueta da caixa.
- Reimpressoes criam novas emissoes auditaveis, sem alterar a trilha historica das sessoes.
- A ordem cronologica da etiqueta vem das sessoes encerradas da mesma caixa e embarque.

## Fora de Escopo

- Desenho final da etiqueta.
- Confirmacao do modelo de impressora, DPI e tamanho fisico.
- Integracao definitiva com ERP/faturamento.
- Execucao de migracoes Supabase sem aprovacao explicita.
- Drivers para protocolos nao ZPL.

## Modelo de Dados

Novas tabelas SQLite serao necessarias. A migracao Supabase equivalente deve existir em `supabase/migrations/`, mas nao deve ser aplicada via codigo.

### `etiquetas_caixa`

Representa uma emissao ou reemissao de etiqueta.

Campos propostos:

- `id`: UUID local.
- `numero_embarque`: embarque da caixa.
- `numero_caixa`: identificador logico da caixa, incluindo caixas sem numero.
- `sessao_origem_id`: sessao que disparou a emissao automatica, quando houver.
- `codigo_operador`: operador que originou a emissao ou reemissao.
- `motivo`: `encerramento` ou `reimpressao`.
- `status`: `pendente`, `impressa`, `erro`, `cancelada`.
- `partes_total`: total de partes geradas.
- `erro_detalhe`: ultima falha de impressao, quando houver.
- `criada_em`: timestamp local.
- `impressa_em`: timestamp de conclusao, quando houver.

### `etiquetas_caixa_partes`

Representa cada parte/pagina da etiqueta.

Campos propostos:

- `id`: UUID local.
- `etiqueta_id`: referencia a `etiquetas_caixa`.
- `parte_numero`: indice iniciando em 1.
- `partes_total`: total de partes da emissao.
- `payload_zpl`: conteudo ZPL gerado.
- `status`: `pendente`, `impressa`, `erro`, `cancelada`.
- `tentativas`: total de tentativas de envio.
- `erro_detalhe`: ultima falha da parte.
- `criada_em`: timestamp local.
- `impressa_em`: timestamp da parte.

## Documento Logico da Etiqueta

O service de etiquetas deve montar um objeto independente do ZPL:

```js
{
  numero_embarque,
  numero_caixa,
  numero_caixa_exibicao,
  gerada_em,
  motivo,
  operador_emissao,
  linhas: [
    {
      ordem,
      sessao_id,
      codigo_op,
      item_codigo,
      item_descricao,
      quantidade_total,
      codigo_operador,
      iniciada_em,
      encerrada_em
    }
  ]
}
```

Esse documento e a fronteira entre regra de negocio e impressao. Ele permite trocar template, paginacao ou transporte sem mexer no encerramento de sessao.

## Paginacao

A paginacao sera feita no renderer ZPL com limite configuravel de linhas por parte. Quando houver mais linhas do que o limite, o renderer gera varias partes e inclui `Parte N/M` em cada payload.

O primeiro limite pode ser conservador, por exemplo 8 a 12 linhas por etiqueta, ate o tamanho fisico ser conhecido. Quando a impressora e a etiqueta forem definidas, o limite passa a ser calculado a partir de `LABEL_HEIGHT_DOTS`, fonte e espacamento.

## Arquitetura

### `src/labels/caixa-label-service.js`

Responsavel por:

- buscar sessoes encerradas da caixa no embarque;
- ordenar por `encerrada_em`, depois `iniciada_em`;
- enriquecer linhas com dados de OP;
- criar o documento logico;
- pedir renderizacao ZPL;
- persistir emissao e partes;
- enfileirar impressao.

### `src/labels/zpl-renderer.js`

Responsavel por:

- receber o documento logico;
- aplicar template ZPL simples;
- dividir linhas em partes;
- gerar payloads ZPL completos.

Configuracoes:

- `LABEL_DPI`;
- `LABEL_WIDTH_DOTS`;
- `LABEL_HEIGHT_DOTS`;
- `LABEL_LINES_PER_PART`;
- `LABEL_TEMPLATE`.

### `src/printer/print-queue.js`

Responsavel por:

- localizar partes pendentes;
- enviar pelo transporte configurado;
- marcar parte como impressa ou erro;
- atualizar status agregado da etiqueta;
- registrar eventos operacionais.

### Transportes

`src/printer/transports/tcp.js`

- envia ZPL para `LABEL_PRINTER_HOST:LABEL_PRINTER_PORT`;
- porta padrao: `9100`.

`src/printer/transports/spooler.js`

- ponto de extensao para envio via driver/spooler Windows;
- inicialmente pode retornar erro claro se `LABEL_PRINTER_MODE=spooler` ainda nao estiver implementado.

## Fluxo de Encerramento

1. Operador encerra sessao e escolhe caixa.
2. `sessaoService.encerrar` valida caixa, encerra camera e grava a sessao.
3. Apos gravar a sessao, o service chama `caixaLabelService.emitirPorEncerramento`.
4. O service monta o historico completo da caixa.
5. O renderer gera uma ou mais partes ZPL.
6. As tabelas de etiquetas recebem emissao e partes pendentes.
7. A fila tenta imprimir.
8. A resposta da rota de encerramento inclui a sessao encerrada e o resumo da etiqueta.

Falha de impressao nao desfaz a sessao. A UI deve mostrar aviso objetivo e permitir reimpressao.

## Fluxo de Reimpressao

1. Usuario acessa uma carga aberta.
2. Na lista de caixas, solicita reimpressao da etiqueta.
3. Backend cria nova emissao com motivo `reimpressao`.
4. O historico atual da caixa e usado novamente.
5. A fila envia as partes ZPL.
6. A UI exibe status da emissao.

## API

Rotas propostas:

- `POST /etiquetas/caixas`
  - cria reimpressao manual;
  - body: `numero_embarque`, `numero_caixa`, `codigo_operador`.

- `GET /etiquetas/caixas?embarque=...&caixa=...`
  - lista emissoes da caixa.

- `POST /etiquetas/:id/retry`
  - recoloca partes com erro na fila.

O encerramento de sessao tambem passa a retornar:

```js
{
  sessao,
  etiqueta: {
    id,
    status,
    partes_total
  }
}
```

## UI

Alteracoes esperadas:

- Em cargas abertas, a tabela de caixas deve exibir acao de reimpressao por caixa.
- Apos encerrar sessao, a UI deve informar se a etiqueta foi enviada, ficou pendente ou falhou.
- O operador nao precisa visualizar o desenho da etiqueta nessa etapa.

## Sync

As emissoes de etiqueta devem ser tratadas como auditoria operacional local e sincronizavel. O Supabase precisa receber tabelas equivalentes para rastreabilidade, mas a impressao continua edge-first.

Nao criar functions, triggers ou policies no Supabase sem nova aprovacao.

## Configuracao

Novas variaveis propostas:

```env
LABEL_PRINTER_ENABLED=false
LABEL_PRINTER_MODE=tcp
LABEL_PRINTER_HOST=
LABEL_PRINTER_PORT=9100
LABEL_PRINTER_NAME=
LABEL_DPI=203
LABEL_WIDTH_DOTS=
LABEL_HEIGHT_DOTS=
LABEL_LINES_PER_PART=10
LABEL_TEMPLATE=caixa-default
```

Enquanto o modo final nao for validado, o sistema deve aceitar `LABEL_PRINTER_ENABLED=false` para gerar e armazenar ZPL sem enviar para hardware.

## Tratamento de Erros

- Impressora indisponivel: etiqueta fica `erro`, sessao permanece encerrada.
- Configuracao incompleta: etiqueta fica `pendente` ou `erro` com detalhe claro.
- Falha em uma parte: etiqueta fica `erro` ate retry ou reimpressao.
- Reimpressao repetida: sempre cria nova emissao auditavel.
- Caixa sem historico encerrado: rota retorna erro de validacao.

## Testes

Cobertura minima:

- monta documento logico com uma sessao encerrada;
- monta documento logico com acrescimos em ordem cronologica;
- pagina varias partes quando excede limite;
- gera ZPL contendo parte `N/M`;
- encerramento cria emissao automatica;
- falha de transporte nao reverte encerramento;
- reimpressao cria nova emissao;
- retry altera partes com erro para pendente;
- API retorna status de etiqueta no encerramento;
- UI chama reimpressao pela caixa aberta.

## Riscos

- O tamanho fisico da etiqueta pode reduzir o numero real de linhas por parte.
- Spooler Windows pode exigir dependencia externa ou processo auxiliar.
- A existencia de acentos em descricoes pode exigir ajuste de encoding ZPL.
- O retorno da impressora via TCP 9100 costuma ser limitado; sucesso de envio nao garante etiqueta fisicamente impressa.

## Criterio de Aceite

- Encerrar uma sessao cria uma emissao de etiqueta para a caixa.
- A emissao contem todas as sessoes encerradas daquela caixa no embarque, em ordem cronologica.
- Acrescimos aparecem como linhas separadas.
- Muitas linhas geram partes numeradas.
- A etiqueta pode ser reimpressa em cargas abertas.
- O ZPL fica armazenado para auditoria e diagnostico.
- O transporte pode ser trocado entre TCP/IP e spooler por configuracao futura.
