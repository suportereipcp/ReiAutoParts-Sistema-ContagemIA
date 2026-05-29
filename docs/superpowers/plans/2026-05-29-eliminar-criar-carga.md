# Eliminar "Criar Carga" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove "Nova Carga" / "Nova Contagem" buttons and allow operators to start counting sessions directly from the open shipments list or shipment detail page.

**Architecture:** Frontend-only changes. The existing `POST /sessoes` API and `sessao-service.js` validations remain unchanged. A new modal component (`modal-iniciar-sessao.js`) replaces the old modal and the full-page `iniciar-sessao.js` form. A toast component for camera-unavailable errors is added. The shipments table gains a "Status" column with badges.

**Tech Stack:** Vanilla JS (ESM), Tailwind CSS via CDN, existing UI primitives (Modal, Button, Input, toast)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `public/js/ui/composites/modal-iniciar-sessao.js` | Modal to start session (OP, operator, camera selects) |
| Create | `public/js/ui/primitives/toast-centralizado.js` | Centered red toast, 2s, reusable |
| Modify | `public/js/pages/selecao-carga.js` | Remove buttons, add Status column + "Iniciar Contagem" button per row |
| Modify | `public/js/pages/detalhes-carga.js` | Replace "Nova Sessao" navigation with modal |
| Modify | `public/js/app.js` | Remove routes `/sessoes/nova` and `/cargas/:numero/nova-sessao` |
| Delete | `public/js/pages/iniciar-sessao.js` | No longer needed (replaced by modal) |
| Delete | `public/js/ui/composites/modal-nova-contagem-carga-aberta.js` | Replaced by modal-iniciar-sessao |
| Test | `tests/frontend/pages/selecao-carga.test.js` | Updated tests |
| Test | `tests/frontend/composites/modal-iniciar-sessao.test.js` | New modal tests |

---
