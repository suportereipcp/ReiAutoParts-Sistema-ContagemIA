---
tags:
  - operacao
  - checklist
  - e2e
fontes:
  - docs/checklist-e2e.md
atualizado_em: 2026-04-22
---

# Checklist E2E

## Leitura rapida do status atual

O checklist existente mostra um cenario intermediario:

- infraestrutura basica e healthcheck ja foram validados;
- fluxo offline online ja foi exercitado;
- parte fisica com camera e troca de programa ainda tem itens pendentes;
- bloco "UI Industrial Zen" ainda aparece majoritariamente aberto.

## Blocos do checklist original

### Pre-requisitos

- Supabase acessivel;
- migrations 001 e 002 aplicadas;
- ERP com ao menos um embarque e uma OP;
- camera 1 configurada na porta 8500;
- `.env` preenchido;
- dependencias instaladas.

### Golden path

- servidor sobe;
- `/health` responde;
- UI do operador abre;
- dropdowns carregam;
- sessao aloca camera;
- camera troca programa;
- TV acompanha a contagem;
- sessao encerra e sincroniza.

### Resiliencia

- rede cai;
- badge muda para `OFFLINE`;
- contagem continua local;
- rede volta;
- estado passa por `RECOVERY` e retorna para `ONLINE`.

### Duplicata e falha de camera

- reuso de numero de caixa deve bloquear;
- duas sessoes na mesma camera devem falhar;
- camera desligada deve virar `desconectada`;
- reconexao deve ser automatica.

### Relatorios e UI

- exportacao CSV, XLSX e PDF;
- validacao futura do dashboard Industrial Zen e da TV em tela cheia.

## Uso desta nota

Consulte o arquivo original quando precisar marcar evidencias detalhadas. Esta nota serve como visao organizada do que ja foi exercitado e do que ainda falta validar em campo.
