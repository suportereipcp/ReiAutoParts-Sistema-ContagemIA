# Atlas de Referencias de Codigo — Design Spec

**Data:** 2026-04-22
**Status:** implementado

Documento de apoio para a organizacao do vault do Obsidian focada em leitura guiada de codigo.

## Objetivo

Criar uma camada documental que funcione como atalho para IA e humanos antes da leitura do codigo bruto. As notas devem indicar:

- quais arquivos olhar;
- o que cada grupo de arquivos faz;
- em que fluxo funcional eles entram;
- quais testes cobrem aquela area;
- qual foi o contexto de criacao ou evolucao.

## Estrutura definida

- um indice global em `06 - Referencias de Codigo/Mapa do Codigo.md`;
- notas por subsistema de backend, frontend, operacao e testes;
- referencias explicitas a caminhos reais do repositorio;
- ligacao com a navegacao principal do vault.

## Modelo de nota

Cada nota de referencia deve, sempre que fizer sentido, responder:

1. quando ler esta nota antes do codigo;
2. quais arquivos ela cobre;
3. o que esses arquivos fazem;
4. quais dependencias e acoplamentos existem;
5. quais testes ajudam a editar com seguranca;
6. qual foi o contexto de criacao ou evolucao recente.

## Resultado esperado

Permitir que a IA localize mais rapidamente o ponto correto do codigo quando o usuario pedir alteracoes de comportamento, integracao, tela, script ou persistencia.
