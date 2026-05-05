# Atlas de Referencias de Codigo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizar o vault do Obsidian com notas de referencia que apontem para arquivos reais do codigo, seus testes e seu contexto funcional.

**Architecture:** O trabalho fica concentrado no vault do Obsidian e em docs auxiliares do repositorio. A navegacao principal aponta para um mapa de codigo e este mapa se decompõe por subsistemas do backend, frontend, operacao e testes.

**Tech Stack:** Markdown, Obsidian, git history local, estrutura Node.js existente

---

### Task 1: Criar o indice global do atlas

**Files:**
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Mapa do Codigo.md`
- Modify: `Sistema de Contagem - AutoParts/Bem-vindo.md`
- Modify: `Sistema de Contagem - AutoParts/00 - Hub/Mapa da Documentacao.md`

- [ ] Mapear entrypoints reais do backend, frontend, TV e scripts
- [ ] Registrar a tabela "se voce quer alterar..."
- [ ] Expor os links da nova secao na navegacao principal

### Task 2: Cobrir o backend por subsistema

**Files:**
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/Bootstrap, Config e Runtime.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/Banco Local, Queries e Migrations.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/Camera Keyence e Programas.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/Dominio de Sessao e Contagem.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/HTTP, WebSocket e Relatorios.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Backend/Sync e Supabase.md`

- [ ] Referenciar arquivos exatos de runtime
- [ ] Explicar responsabilidades e acoplamentos
- [ ] Apontar testes relacionados
- [ ] Incluir contexto de criacao a partir de commits e planos existentes

### Task 3: Cobrir o frontend e a operacao

**Files:**
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Frontend/Shell SPA, TV e Navegacao.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Frontend/Estado, API e Eventos.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Frontend/Paginas, Modais e Componentes.md`
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Operacao/Scripts e Boot Local.md`

- [ ] Mapear shells, stores, pages e componentes
- [ ] Referenciar batchs, scripts de simulacao e diagnostico
- [ ] Indicar onde comeca cada fluxo de carga e de TV

### Task 4: Criar mapa de cobertura de testes

**Files:**
- Create: `Sistema de Contagem - AutoParts/06 - Referencias de Codigo/Testes/Mapa de Cobertura.md`

- [ ] Mapear arquivos de producao para seus testes principais
- [ ] Destacar areas com cobertura menos direta

### Task 5: Registrar a intencao em docs auxiliares

**Files:**
- Create: `docs/superpowers/specs/2026-04-22-atlas-referencias-codigo-design.md`
- Create: `docs/superpowers/plans/2026-04-22-atlas-referencias-codigo.md`

- [ ] Descrever o objetivo do atlas
- [ ] Registrar a estrutura adotada e o resultado esperado
