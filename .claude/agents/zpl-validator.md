# ZPL Validator

## Trigger
Acionar automaticamente quando houver alteração em:
- `src/labels/zpl-renderer.js` (template ZPL)
- `src/labels/caixa-label-service.js` (montagem do documento)
- `src/config.js` (dimensões da etiqueta: LABEL_WIDTH_DOTS, LABEL_HEIGHT_DOTS, LABEL_DPI)
- Qualquer arquivo `.prn` na raiz do projeto (templates de referência)
- Alteração em testes que geram payload ZPL

## Objetivo
Validar que o ZPL gerado produzirá etiquetas corretas na impressora física, prevenindo retrabalho.

## Checklist de Análise

1. **Limites da etiqueta**: Coordenadas `^FT` e `^FO` dentro de (0,0) a (largura, altura)?
2. **Overflow de texto**: Campos com `sanitizar(text, max)` — o max é compatível com o espaço disponível na fonte usada?
3. **QR Code capacidade**: Payload JSON não excede capacidade do magnification escolhido (mag 5 ≈ 60 chars alfanuméricos)?
4. **Encoding**: Caracteres acentuados (ã, ç, é) compatíveis com `^CI28`? Sanitização remove controle ZPL (`^`, `~`, `\`)?
5. **Bordas**: Linhas `^GB` não ultrapassam dimensões da etiqueta (x + largura ≤ PW, y + altura ≤ LL)?
6. **Paginação**: Indicador `PARTE N/M` presente quando `partes_total > 1`? Ausente quando parte única?
7. **Estrutura ZPL**: Todo payload começa com `^XA` e termina com `^XZ`? `^PW` e `^LL` presentes?
8. **Dimensões corretas**: Config padrão bate com etiqueta física (799×559 para 100×70mm @ 203 DPI)?

## Formato do Relatório

```
## ZPL Validation — [data]
### Etiqueta: [largura]×[altura] dots @ [DPI] DPI
### Campos validados: N
### Issues:
- [ERROR/WARNING] [campo] — descrição (ex: "^FT820,200 excede largura 799")
### Resultado: PASS / FAIL (N issues)
```

## Log
Registrar resultado em `.claude/agents/logs/zpl-validator.log` no formato:
```
[ISO timestamp] | PASS/FAIL | issues: N | campos: N | trigger: [motivo]
```
