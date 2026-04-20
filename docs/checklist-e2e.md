# Checklist E2E — Pré-produção

Executar uma vez antes de liberar para produção. Cada item marcado com evidência (screenshot ou nota).

> **Status atual (2026-04-20):** Validação com `fake-keyence` concluída enquanto aguardamos TI liberar porta 8500 para IP `192.168.15.195`. Itens marcados `[F]` foram validados apenas com fake — precisam de ratificação com câmera física.

## Pré-requisitos
- [X] Supabase acessível (`curl https://supabase.pcpsuporterei.site/rest/v1/`)
- [X] Supabase com migrations 001 e 002 aplicadas
- [X] ERP já populou pelo menos 1 embarque aberto e 1 OP
- [X] Câmera 1 com porta 8500 habilitada + Método de alternação = Painel/PC/Rede/Troca automática
- [ ] (Opcional) Câmera 2 com mesma configuração
- [X] `npm install` executado
- [X] `.env` preenchido com IP das câmeras e credenciais Supabase

## Golden path
- [x] `npm run dev` → servidor sobe sem erro
- [x] `curl localhost:3000/health` → JSON com `status=ok`
- [x] Abrir `http://localhost:3000/operador/` → UI carrega, badge ONLINE verde
- [x] Dropdown de embarque populado (reverse poller trouxe dados)
- [x] Dropdown de OP funcional (digitando ou selecionando)
- [x] Lista de operadores presente
- [x] Selecionar embarque + OP + operador → câmera alocada
- [F] Pesquisar programa da câmera → lista filtra (GET /programas?camera=1&q=B retornou só PECA-B)
- [F] Selecionar programa → confirmar → câmera física muda programa (IV Smart Navigator — NÃO observado; verificar com hardware real)
- [F] Passar 5 peças reais → Monitor 2 (TV) mostra 5 (fake emite 1 pulso/800ms; contador subiu 0→12)
- [F] Passar mais 5 → Monitor 2 mostra 10 (seguiu subindo em tempo real via WS)
- [x] Encerrar caixa → total vai ao Supabase (sessão CX-E2E-001, 26 peças, outbox drenou a 0)
- [x] Abrir nova sessão na mesma câmera sem erro (sessão 289d8eac-... aberta após encerrar a anterior)

## Resiliência
- [F] Desconectar cabo de rede do Edge PC (simulado com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9999`)
- [x] Badge vira OFFLINE amarelo (observado após ~60s — 2 falhas de healthcheck com conn refused imediato)
- [x] Passar mais 5 peças → Monitor 2 mostra 15 (contagem seguiu offline: 0→22 peças enquanto OFFLINE)
- [x] Encerrar caixa offline → sessão fica local com outbox pendente (CX-E2E-OFFLINE-001, 27 peças, outbox=5)
- [ ] Reconectar rede → badge vai para RECOVERY azul e depois ONLINE (**não observável sem restart**: dotenv não recarrega em runtime; restart pula RECOVERY pois estado inicial é ONLINE. Revalidar com cabo físico.)
- [x] Verificar no Supabase que sessões offline foram sincronizadas (outbox drenou de 5→0 após restaurar URL; sem dead-letter nos logs)

## Duplicata
- [x] Tentar reusar número de caixa no mesmo embarque → erro claro (`"Caixa duplicada: já existe sessão com caixa CX-E2E-001 no embarque 01."`)
- [x] Tentar abrir 2 sessões na mesma câmera → erro (`"Câmera 1 já tem sessão ativa (...)"`)

## Câmera desconectada
- [F] Desligar câmera 1 fisicamente (simulado matando `fake-keyence` na porta 8500)
- [x] `/health` retorna `cameras[0].estado = 'desconectada'`
- [x] Tentar abrir sessão na câmera 1 → erro, sem crash (`"Câmera 1 desconectada."`; corrigido em `src/domain/sessao-service.js` após primeira rodada)
- [x] Religar câmera → reconecta automaticamente (backoff exp.) — observado após religar fake, câmera voltou a `suspensa`.

## Relatórios
- [x] `GET /relatorios/embarque/01?fmt=csv` baixa CSV (5 linhas, colunas corretas)
- [x] `GET /relatorios/embarque/01?fmt=xlsx` baixa XLSX válido (`file` → Microsoft Excel 2007+)
- [x] `GET /relatorios/embarque/01?fmt=pdf` baixa PDF legível (`file` → PDF 1.3, 1 página)

## Pendente com câmera física (TI liberar porta 8500 → 192.168.15.195)
- Ratificar todos os itens marcados `[F]` com a câmera real.
- Observar IV Smart Navigator trocando programa ao enviar `PW,nnn`.
- Validar transição OFFLINE → RECOVERY → ONLINE desconectando cabo físico (sem restart do server).
- Validar a segunda câmera quando disponível.
