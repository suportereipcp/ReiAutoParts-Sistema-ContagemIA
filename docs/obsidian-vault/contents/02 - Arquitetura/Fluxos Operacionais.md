---
tags:
  - arquitetura
  - fluxos
fontes:
  - ARQUITETURA.md
  - docs/superpowers/specs/2026-04-17-sistema-contagem-rei-autoparts-design.md
atualizado_em: 2026-04-22
---

# Fluxos Operacionais

## 1. Abertura de sessao

1. operador consulta embarques, OPs e operadores a partir do cache local;
2. sistema aloca a camera livre;
3. operador seleciona o programa da camera;
4. Edge PC envia `PW -> CTR -> OE,1`;
5. sessao muda para `ativa` e as telas recebem o estado por WebSocket.

## 2. Contagem em andamento

1. a camera emite um payload TCP com ferramenta, contagem e total diario;
2. o parser interpreta o pulso;
3. o dominio grava a contagem no SQLite;
4. a outbox registra o evento para sincronizacao futura;
5. Monitor 1 e TV atualizam imediatamente.

## 3. Encerramento da caixa

1. operador informa o numero da caixa;
2. sistema valida duplicidade por embarque;
3. Edge PC envia `OE,0` para suspender a camera;
4. sessao e encerrada e marcada para sync;
5. o embarque permanece disponivel ate o ERP fecha-lo com nota fiscal.

## 4. Fechamento do embarque

- acontece quando o ERP preenche `numero_nota_fiscal`;
- o reverse poller traz a mudanca para o SQLite local;
- o embarque sai da lista de "abertos" e nao aceita novas sessoes.

## 5. Comportamento degradado

- se a internet cair, a contagem continua local;
- se uma camera cair, o sistema tenta reconnect com backoff;
- se houver pulso sem sessao ativa, o evento e descartado com `WARN`.

## Resumo por evento

| Evento | Origem | Consequencia |
|---|---|---|
| abertura de sessao | operador | camera e armada para contar |
| pulso de contagem | camera | SQLite e UI atualizam |
| encerramento | operador | camera suspensa e sessao vai para outbox |
| sync | worker | Supabase recebe sessoes e eventos |
