# Módulo: Etiquetas ZPL v2

## Status: Implementado (2026-05-29)

## Specs
- Etiqueta: 100×70mm @ 203 DPI (799×559 dots)
- Layout 3 faixas com separadores horizontais
- QR Code com JSON: {"e","cx","op","qt","seq"}
- Paginação automática (PARTE N/M)

## Arquivos
- `src/labels/zpl-renderer.js` — renderizarEtiquetaCaixaZpl()
- `src/labels/caixa-label-service.js` — montarDocumento, emitir, reimprimir
- `src/printer/print-queue.js` — fila com retry
- `src/printer/transports/tcp.js` — envio TCP raw porta 9100

## Testes
- `tests/zpl-renderer.test.js` — 11 testes
- `tests/caixa-label-service.test.js` — 5 testes

## Config (.env)
- LABEL_PRINTER_ENABLED, LABEL_PRINTER_MODE (tcp/spooler)
- LABEL_PRINTER_HOST, LABEL_PRINTER_PORT
- LABEL_DPI=203, LABEL_WIDTH_DOTS=799, LABEL_HEIGHT_DOTS=559
- LABEL_LINES_PER_PART=10
