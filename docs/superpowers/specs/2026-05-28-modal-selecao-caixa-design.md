---
categoria: feature
classe: ui
tipo: design
data: 2026-05-28
status: aprovado
modulo: encerramento-sessao
---

# Modal de Seleção de Caixa no Encerramento de Sessão

## Contexto

Hoje, ao encerrar uma sessão de contagem, o usuário escolhe entre três opções via radio button num único modal (`modal-encerrar-sessao.js`):

1. Caixa já existente (dropdown filtrado por mesma OP)
2. Nova caixa numerada (input livre)
3. Nova caixa sem número (gera identificador interno)

O fluxo atual não mostra o conteúdo das caixas existentes — o usuário escolhe pelo número, sem visibilidade do que já foi contado em cada caixa. Isso aumenta o risco de:

- Adicionar peças à caixa errada (especialmente entre caixas "Sem número #N", indistinguíveis pelo rótulo)
- Criar caixa nova desnecessária quando a peça caberia em uma existente

## Objetivo

Substituir o modal único por um **wizard de três telas**, dando ao usuário visibilidade do conteúdo de cada caixa antes de confirmar o destino da contagem.

## Comportamento

### Modal #1 — "Encerrar Sessão"

Substitui os 3 radio buttons por **3 botões grandes empilhados**:

- **Caixa já existente** → fecha Modal #1 e abre Modal #2
- **Nova caixa numerada** → o conteúdo do Modal #1 troca de estado, mostrando o input "Número da caixa" + botões `Confirmar` / `Voltar`
- **Nova caixa sem número** → cria direto (chama `onConfirmar({ criar_caixa_sem_numero: true })`, idêntico ao comportamento atual)

**Aviso de "embarque faturado"**: continua exibido no Modal #1 (acima dos botões), com o checkbox de ciência. Uma vez marcado, vale para todo o wizard — não precisa ser reconfirmado nos Modais #2/#3.

**Estado vazio**: se o embarque ainda não tem nenhuma caixa criada (primeira sessão), o botão "Caixa já existente" **não aparece** — só os dois de criação.

### Modal #2 — "Qual caixa deseja descarregar?"

Substitui o dropdown anterior. Mostra **todas as caixas do embarque** em lista cronológica (mais recente primeiro).

Cada linha exibe:

```
nº caixa · OP · item · total · qtd de sessões
```

Caixas com OP diferente da sessão atual ficam **opacas/desabilitadas**, com tooltip "OP diferente — incompatível" (regra já validada no backend em `_validarCompatibilidadeCaixa`).

**Botões**:

- **Voltar** (rodapé) → fecha Modal #2 e reabre Modal #1, preservando o estado do checkbox de faturado
- Clique numa caixa habilitada → fecha Modal #2 e abre Modal #3

### Modal #3 — Packlist da caixa

Cabeçalho com nº da caixa + OP/item. Lista **cronológica** das sessões já registradas na caixa:

```
OP-1234 · Filtro de óleo · 150 un · João  · 14:23
OP-1234 · Filtro de óleo ·  80 un · Maria · 15:10
                          ─────────
                          Total: 230 un
```

**Botões** no rodapé:

- **Concluir** → encerra a sessão atual nesta caixa (chama `onConfirmar({ caixa_id })`, idêntico ao atual)
- **Voltar** → fecha Modal #3 e reabre Modal #2

## Arquitetura

### Frontend

Toda mudança ocorre na camada de UI. O wizard é implementado como **três funções separadas** num único módulo (ou três módulos cooperando), trocando referências entre si via callbacks.

**Arquivos afetados**:

| Arquivo | Mudança |
|---|---|
| `public/js/ui/composites/modal-encerrar-sessao.js` | Refator: substitui o modal único por orquestrador do wizard (Modal #1). Estado do checkbox de faturado vira variável compartilhada entre modais. |
| `public/js/ui/composites/modal-selecionar-caixa.js` | **Novo**. Implementa o Modal #2 (lista de caixas). |
| `public/js/ui/composites/modal-packlist-caixa.js` | **Novo**. Implementa o Modal #3 (packlist + confirmação). |
| `public/js/pages/detalhes-carga.js` | Passa o array `sessoes` completo (não só `caixas` agrupadas) para o `abrirModalEncerrarSessao`, para alimentar o packlist do Modal #3. |

### Backend

**Sem alterações.** Toda a informação necessária já vem de `GET /sessoes?embarque=...` (rota existente em `src/http/routes/sessoes.js`). Os helpers `agruparCaixas` e `rotuloCaixa` em `public/js/domain/caixas.js` continuam funcionando — o Modal #2 reusa `agruparCaixas`, o Modal #3 filtra as sessões da caixa selecionada.

### Contrato entre modais

```
abrirModalEncerrarSessao({
  sessao,                  // sessão sendo encerrada
  sessoesDoEmbarque,       // novo: array completo de sessões para popular Modal #2/#3
  embarqueFaturado,
  onConfirmar              // mesma assinatura atual: ({caixa_id} | {numero_caixa} | {criar_caixa_sem_numero})
})
```

Modal #1 instancia Modal #2 quando o usuário clica "Caixa existente", passando:
- `sessoesDoEmbarque`
- `opAtual` (para filtro de compatibilidade visual)
- `onSelecionar(caixaId)` — handler quando uma caixa é clicada
- `onVoltar()` — reabre Modal #1

Modal #2 instancia Modal #3 quando uma caixa é clicada, passando:
- `caixaId`
- `sessoesDaCaixa` (filtradas)
- `onConfirmar()` — confirma encerramento
- `onVoltar()` — reabre Modal #2

## Decisões de design

- **Wizard (1 modal por vez) ao invés de stack**: simplifica a UX e evita modais empilhados em telas pequenas (a estação é touch-friendly). "Voltar" reabre o modal anterior.
- **ESC / clique fora cancela tudo**: a primitiva `Modal` já fecha em ESC e em clique no overlay. No wizard, esse comportamento cancela o fluxo inteiro — não volta para o modal anterior. Equivale ao "Cancelar" do modal atual.
- **Estado do checkbox de faturado preservado**: navegar Modal #1 → #2 → #1 não exige re-marcar; UX consistente com wizards padrão.
- **Sem novo endpoint**: a página `detalhes-carga` já consome a lista de sessões; reaproveitamos esse dado em vez de criar API redundante.
- **Caixas incompatíveis visíveis mas desabilitadas**: dá ao operador noção do quadro completo do embarque (B em vez de A), reduzindo confusão "por que essa caixa não aparece?".
- **Lista cronológica simples no packlist (não agrupada)**: mais transparente para auditoria — operador vê quem contou o quê e quando, sem agregação que esconde informação.

## Fora de escopo

- Mudança na regra de compatibilidade de OP (continua sendo "uma caixa = uma OP" por embarque)
- Endpoints de packlist por caixa (reusamos `/sessoes?embarque=`)
- Suporte a múltiplas OPs por caixa
- Filtros/busca no Modal #2 (assume-se que a quantidade de caixas por embarque é manejável visualmente)
- Mudança no fluxo de impressão de etiqueta (etiqueta segue sendo emitida automaticamente após `encerrar`)

## Testes

Cobertura mínima para o wizard:

- Modal #1: botão "Caixa existente" oculto quando embarque sem caixas
- Modal #1: "Nova numerada" troca estado para input, "Voltar" volta aos 3 botões
- Modal #2: caixas incompatíveis renderizadas com classe `disabled` e click bloqueado
- Modal #2: clicar em caixa válida abre Modal #3 com sessões filtradas corretamente
- Modal #3: "Concluir" chama `onConfirmar({caixa_id})` com o ID correto
- Modal #3: "Voltar" reabre Modal #2 sem perder lista
- Estado do checkbox de faturado preservado ao navegar Voltar
