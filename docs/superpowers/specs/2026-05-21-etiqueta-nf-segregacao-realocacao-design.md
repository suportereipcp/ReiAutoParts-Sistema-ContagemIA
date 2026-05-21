# Ciclo de NF, Segregação e Realocação de Etiquetas — Design

## Objetivo

Fechar o ciclo da etiqueta de caixa em relação à Nota Fiscal (NF). Hoje as etiquetas são impressas no encerramento da sessão, **antes** de o embarque ser faturado, e portanto **sem NF**. Quando o comercial fatura o embarque, o ERP envia o número da NF (via webhook → Supabase). A partir desse momento:

1. O embarque é **finalizado** (controle de status nosso) e movido para Expedidas.
2. O operador aciona uma **reimpressão em massa** que gera as etiquetas **com NF** de todas as caixas elegíveis. Os carregadores só carregam caixas cuja etiqueta tem NF; caixas sem NF ficam **segregadas**.
3. Caixas com sessão aberta/tardia no momento do faturamento ficam segregadas e dependem de **aprovação** por um usuário responsável.
4. Itens **reprovados** (não vão neste carregamento) são **realocados** para um próximo embarque e entram na reimpressão em massa daquele embarque quando ele for faturado.

Esta especificação cobre as três fases num único documento. O plano de implementação pode fasear a entrega (Fase 1: finalização + massa; Fase 2: aprovação; Fase 3: realocação).

## Contexto Atual

- Etiquetas são por **item**, não por caixa. Uma caixa com 4 itens distintos recebe 4 etiquetas (uma por item, com a respectiva quantidade); número da caixa e NF se repetem — isso é normal. (`caixa-label-service.montarDocumento` agrupa as sessões encerradas de uma `(embarque, caixa)` por `item_codigo`; o renderer emite uma etiqueta por item.)
- A NF é renderizada **ao vivo** a partir de `embarques.numero_nota_fiscal` no momento de montar o documento. Logo, uma reimpressão feita após a chegada da NF já sai com NF — exceto quando devemos **segurar** a NF (sessão pendente de aprovação).
- `embarques` e `operadores` são **espelhos read-only do ERP** atualizados pelo `reverse-poller` (estratégia snapshot para embarques, a cada 30s). Colunas novas que o `upsertEmbarque` não lista sobrevivem ao upsert.
- Hoje o frontend define "expedida" por `embarque.status === 'fechado'` e trata NF ausente como pendência (`pendentesNota`). Este design **muda o critério**: finalização e roteamento para Expedidas passam a se basear na **presença da NF**, e o `status` passa a ser um campo **controlado por nós** (ver Decisões).
- Já existe reimpressão **única** de uma caixa (`POST /etiquetas/caixas`, `modal-reimprimir.js`) — mantida sem alteração de comportamento.
- Encerramento de sessão: `POST /sessoes/:id/encerrar` → `sessao-service.encerrar` → `caixaLabelService.emitirPorEncerramento`.

## Decisões

- **Gatilho de finalização:** transição de `embarques.numero_nota_fiscal` de vazio → preenchido (detectada pelo poller). O ERP envia **apenas** o número da NF via webhook; **não** envia status.
- **Status é controle nosso:** ao detectar a NF, o Rei-AutoContagem define o status do embarque (ex.: `faturado`) localmente **e** propaga para o Supabase (`sistema_contagem.embarques`) via outbox. Como o ERP nunca escreve status, não há conflito com o snapshot do poller.
- **Finalização automática; impressão manual:** a carga finaliza sozinha ao chegar a NF; a reimpressão em massa é um botão acionado pelo operador.
- **Reimpressão em massa:** todas as caixas elegíveis do embarque × cada item de cada caixa, com NF. Exige código do operador e mostra a contagem de etiquetas antes de confirmar.
- **Segregação:** caixa só é elegível para carregamento (e para a massa) quando todas as suas sessões têm NF liberada (`regular` ou `aprovada`). Caixas com sessão `pendente_aprovacao`/`reprovada` ficam segregadas e **fora** da massa.
- **Bloqueio:** embarque finalizado não aceita abrir novas sessões.
- **Encerramento tardio:** sessão encerrada após a finalização do embarque entra no mesmo embarque, marcada `pendente_aprovacao`, com a NF **retida** na etiqueta; a UI exige confirmação e orienta contatar o Líder (que notifica o PCP).
- **Aprovação:** feita por usuário cujo código está na tabela local `aprovadores`. Aprovar libera a NF (`aprovada`) e habilita a reimpressão com NF (acionada manualmente depois). Reprovar (`reprovada`) retém o item para realocação.
- **Realocação:** por **sugestão + confirmação** — ao abrir um embarque novo, o sistema sugere mover os itens reprovados; um usuário responsável confirma/escolhe o destino. Quando o embarque destino for faturado, o item entra na massa daquele embarque com a NF nova.
- **Acesso à tela de aprovadores:** sem gate por enquanto (todos acessam); autenticação fica para depois. Aprovar uma sessão, porém, sempre exige um código presente na lista de aprovadores.
- **Abordagem de modelagem:** estado explícito em colunas locais + um serviço de domínio único (`faturamento-service`).

## Fora de Escopo

- Sistema de autenticação/perfis de usuário (a tela de aprovadores fica aberta por ora).
- Desenho final da etiqueta física (mantém o layout atual `1181x709`).
- Validação com impressora Zebra real (config de transporte já existe).
- Execução de migrações Supabase via código (apenas escrever os arquivos em `supabase/migrations/`).
- Alteração do comportamento da reimpressão **única** existente.

## Modelo de Dados

Migrações SQLite locais novas; equivalentes Supabase em `supabase/migrations/` (não aplicadas via código).

### `sessoes_contagem` (colunas novas)

| Coluna | Tipo | Descrição |
|---|---|---|
| `faturamento_status` | TEXT NOT NULL DEFAULT `'regular'` | `regular` \| `pendente_aprovacao` \| `aprovada` \| `reprovada` \| `realocada`. CHECK na lista. |
| `aprovada_por` | TEXT | Código do aprovador (FK lógica para `aprovadores.codigo`). |
| `aprovada_em` | TEXT | Timestamp ISO da aprovação. |
| `embarque_destino` | TEXT | Embarque alvo da realocação; `NULL` = embarque original. |

Replicam para o Supabase via `enfileirarSync('sessoes_contagem', ...)` já existente. A migração Supabase adiciona as mesmas colunas.

**Embarque efetivo da sessão** (para rotular/elegibilidade) = `embarque_destino ?? numero_embarque`.

### `embarques` (coluna nova, local-only)

| Coluna | Tipo | Descrição |
|---|---|---|
| `finalizada_em` | TEXT | Timestamp ISO setado quando a NF é detectada pela primeira vez. `NULL` = não finalizado. O `upsertEmbarque` não lista esta coluna, então sobrevive ao snapshot. |

O `status` passa a ser controlado por nós: `aberto` (padrão) → `faturado` ao finalizar. Propagado ao Supabase via outbox (novo tipo de item de sync para embarque-status), respeitando escrita só em `sistema_contagem`.

### `aprovadores` (tabela local nova)

| Coluna | Tipo | Descrição |
|---|---|---|
| `codigo` | TEXT PRIMARY KEY | Código do operador autorizado a aprovar. |
| `nome` | TEXT | Nome exibido. |
| `ativo` | INTEGER NOT NULL DEFAULT 1 | |
| `criado_em` | TEXT NOT NULL | |

Local-only (não sincroniza). Gerenciada pela tela de Gestão de Aprovadores.

### `etiquetas_caixa.motivo` (CHECK ampliado)

Incluir `reimpressao_massa` e `pos_aprovacao` além de `encerramento` e `reimpressao`.

## Componentes

### `src/domain/faturamento-service.js` (novo)

Dono único da regra. Funções:

- `aoReceberNF(numeroEmbarque)` — idempotente. Seta `finalizada_em` e `status='faturado'` (se ainda não), enfileira sync de status ao Supabase, emite evento `SISTEMA`/`SUCCESS`, broadcast `embarque.finalizado`. Não altera sessões já encerradas (continuam `regular`). Não encerra sessões ativas.
- `marcarEncerramentoTardio(sessao)` — chamada por `sessao-service.encerrar` quando o embarque está finalizado: define `faturamento_status='pendente_aprovacao'`.
- `embarqueFinalizado(numeroEmbarque)` — helper booleano (`finalizada_em` não nulo).
- `caixaElegivel(numeroEmbarque, numeroCaixa)` — true se nenhuma sessão da caixa está `pendente_aprovacao`/`reprovada`.
- `aprovarSessao(sessaoId, codigoAprovador)` — valida aprovador na tabela; `faturamento_status='aprovada'`, grava `aprovada_por/em`; sync; broadcast.
- `reprovarSessao(sessaoId, codigoAprovador)` — valida aprovador; `faturamento_status='reprovada'`; sync; broadcast.
- `sugerirRealocacoes(numeroEmbarqueNovo)` — lista sessões `reprovada` candidatas a realocar para o embarque novo.
- `confirmarRealocacao(sessaoId, embarqueDestino)` — `embarque_destino` setado, `faturamento_status='realocada'`; sync; broadcast.
- `reimpressaoMassa(numeroEmbarque, codigoOperador)` — itera caixas elegíveis do embarque (considerando `embarque_destino`), chama `caixaLabelService.emitir(motivo='reimpressao_massa')` para cada; retorna `{ etiquetas, partes, caixas_puladas }`.
- `previewMassa(numeroEmbarque)` — conta quantas etiquetas/caixas seriam impressas (sem imprimir).

### `src/db/queries/faturamento.js` (novo)

Queries de leitura/escrita das colunas novas, listagem de sessões segregadas por embarque, contagem de itens elegíveis, candidatos a realocação.

### `src/http/routes/faturamento.js` (novo)

| Rota | Descrição |
|---|---|
| `GET /faturamento/embarques/:n/reimpressao-massa/preview` | Contagem de etiquetas/caixas elegíveis. |
| `POST /faturamento/embarques/:n/reimpressao-massa` | `{ codigo_operador }` → dispara a massa. |
| `GET /faturamento/embarques/:n/segregadas` | Sessões/caixas segregadas (pendente/reprovada) do embarque. |
| `POST /faturamento/sessoes/:id/aprovar` | `{ codigo_aprovador }`. |
| `POST /faturamento/sessoes/:id/reprovar` | `{ codigo_aprovador }`. |
| `GET /faturamento/embarques/:n/sugestoes-realocacao` | Itens reprovados sugeridos para o embarque novo `:n`. |
| `POST /faturamento/sessoes/:id/realocar` | `{ embarque_destino }`. |
| `GET /faturamento/aprovadores` / `POST` / `DELETE /:codigo` | CRUD de aprovadores. |

### `src/sync/reverse-poller.js` (alteração)

Após o upsert de `embarques`, comparar o valor anterior vs novo de `numero_nota_fiscal`. Em transição vazio→preenchido, chamar `faturamentoService.aoReceberNF(numero_embarque)`. O poller recebe `faturamentoService` por injeção.

### `src/labels/caixa-label-service.js` (alteração)

`montarDocumento` passa a:
- Considerar o **embarque efetivo** das sessões (via `embarque_destino`).
- **Reter a NF** (`numero_nota_fiscal = null` no documento) quando a caixa tiver qualquer sessão `pendente_aprovacao`/`reprovada`.
- Novo motivo aceito (`reimpressao_massa`, `pos_aprovacao`).

### Frontend

- `selecao-carga.js` / `catalogos`: roteamento aberta vs expedida passa a usar NF/`finalizada_em`. Atalho de reimpressão em massa na linha expedida.
- `detalhes-carga-expedida.js`: botão **Imprimir etiquetas finais** (massa) com preview de contagem + `modal` de confirmação (operador + contagem); seção **Caixas segregadas** com ações Aprovar/Reprovar (pede código do aprovador); para reprovadas, ação de Realocar.
- `modal-encerrar-sessao.js`: se o embarque está finalizado, exibir aviso "embarque já faturado — confirme e contate o Líder" e exigir confirmação explícita antes de encerrar.
- Nova página **Gestão de Aprovadores** (lista + adicionar/remover), sem gate de acesso por ora.
- Notificação/sugestão de realocação ao abrir embarque novo (banner no detalhe da carga aberta ou na seleção).

## Fluxo de Dados

```
ERP (webhook NF) → Supabase (numero_nota_fiscal) → reverse-poller (30s)
  → detecta transição vazio→preenchido
  → faturamento-service.aoReceberNF: finalizada_em + status=faturado (local + outbox→Supabase)
  → broadcast embarque.finalizado

Operador (Expedidas) → POST reimpressao-massa → faturamento-service
  → itera caixas elegíveis → caixaLabelService.emitir(reimpressao_massa) → print-queue (TCP)

Encerrar sessão tardia → sessao-service.encerrar → faturamento-service.marcarEncerramentoTardio
  → faturamento_status=pendente_aprovacao → etiqueta sem NF (segregada)

Aprovador → aprovar/reprovar → faturamento-service → sync sessoes_contagem
Reprovado → (abrir embarque novo) → sugestão → confirmarRealocacao(embarque_destino)
  → quando destino faturado → entra na massa do destino com NF nova
```

## Tratamento de Erros e Bordas

- **Impressora offline na massa:** etiquetas entram na fila com retry existente; a resposta reporta total enfileirado e eventuais erros parciais. Não bloqueia.
- **`aoReceberNF` idempotente:** se `finalizada_em` já setado, não refaz nem reenfileira.
- **NF sem sessões encerradas:** apenas finaliza o embarque (massa retorna zero etiquetas).
- **Aprovador inválido / inativo:** erro 400 claro; nenhuma alteração de estado.
- **Reprovado sem embarque novo:** permanece `reprovada` (segregado), visível no detalhe da carga, até realocação manual/sugerida.
- **Realocar para embarque já faturado:** recusar (destino deve estar aberto).
- **Sessão ativa no momento da finalização:** continua ativa; ao encerrar vira `pendente_aprovacao` (tardia).
- **Caixa parcialmente segregada:** se uma das sessões da caixa está pendente/reprovada, a caixa inteira é segregada (não imprime na massa) até resolver.

## Sincronização

- Colunas novas de `sessoes_contagem` replicam pelo fluxo de outbox existente.
- Novo item de outbox para **status do embarque** (escrita em `sistema_contagem.embarques`).
- `aprovadores` e `embarques.finalizada_em` são **locais** (não sincronizam).
- Migração Supabase: colunas em `sessoes_contagem`; nada para `aprovadores`.

## Testes (`node:test`)

- Poller: transição NF vazio→preenchido dispara `aoReceberNF` uma única vez (idempotência).
- `aoReceberNF`: seta `finalizada_em`/`status`, não mexe em sessões encerradas, não encerra ativas.
- `_validarPreRequisitos`: recusa abrir sessão em embarque finalizado.
- `encerrar` tardio: marca `pendente_aprovacao` e etiqueta sai sem NF.
- `montarDocumento`: retém NF para caixa com sessão pendente/reprovada; inclui NF para `regular`/`aprovada`; usa `embarque_destino` quando presente.
- `reimpressaoMassa`: pula segregadas, conta etiquetas/itens corretamente, motivo `reimpressao_massa`.
- `previewMassa`: contagem bate com a massa real.
- `aprovarSessao`/`reprovarSessao`: transições e autorização (código fora da lista é rejeitado).
- Realocação: reprovado → `confirmarRealocacao` → elegível na massa do destino só após NF do destino.
- CRUD de aprovadores.

## Fases de Implementação (sugestão para o plano)

1. **Fundação:** modelo de dados + `faturamento-service` (finalização, bloqueio, encerramento tardio, segregação) + reimpressão em massa + UI de Expedidas/massa/aviso de encerramento.
2. **Aprovação:** tabela/tela de aprovadores + listagem de segregadas + aprovar/reprovar + reimpressão pós-aprovação.
3. **Realocação:** sugestão ao abrir embarque novo + confirmar destino + elegibilidade na massa do destino.
