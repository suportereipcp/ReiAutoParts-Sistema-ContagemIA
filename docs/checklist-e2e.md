# Checklist E2E — Pré-produção

Executar uma vez antes de liberar para produção. Cada item marcado com evidência (screenshot ou nota).

## Pré-requisitos
- [ ] Supabase acessível (`curl https://supabase.pcpsuporterei.site/rest/v1/`)
- [ ] Supabase com migrations 001 e 002 aplicadas
- [ ] ERP já populou pelo menos 1 embarque aberto e 1 OP
- [ ] Câmera 1 com porta 8500 habilitada + Método de alternação = Painel/PC/Rede/Troca automática
- [ ] (Opcional) Câmera 2 com mesma configuração
- [ ] `npm install` executado
- [ ] `.env` preenchido com IP das câmeras e credenciais Supabase

## Golden path
- [ ] `npm run dev` → servidor sobe sem erro
- [ ] `curl localhost:3000/health` → JSON com `status=ok`
- [ ] Abrir `http://localhost:3000/operador/` → UI carrega, badge ONLINE verde
- [ ] Dropdown de embarque populado (reverse poller trouxe dados)
- [ ] Dropdown de OP funcional (digitando ou selecionando)
- [ ] Lista de operadores presente
- [ ] Selecionar embarque + OP + operador → câmera alocada
- [ ] Pesquisar programa da câmera → lista filtra
- [ ] Selecionar programa → confirmar → câmera física muda programa (IV Smart Navigator)
- [ ] Passar 5 peças reais → Monitor 2 (TV) mostra 5
- [ ] Passar mais 5 → Monitor 2 mostra 10
- [ ] Encerrar caixa → total vai ao Supabase (verificar via SQL)
- [ ] Abrir nova sessão na mesma câmera sem erro

## Resiliência
- [ ] Desconectar cabo de rede do Edge PC
- [ ] Badge vira OFFLINE amarelo (após ~90s — 3 falhas × 30s)
- [ ] Passar mais 5 peças → Monitor 2 mostra 15 (contagem segue offline)
- [ ] Encerrar caixa offline → sessão fica local com outbox pendente
- [ ] Reconectar rede → badge vai para RECOVERY azul e depois ONLINE
- [ ] Verificar no Supabase que sessões offline foram sincronizadas

## Duplicata
- [ ] Tentar reusar número de caixa no mesmo embarque → erro claro
- [ ] Tentar abrir 2 sessões na mesma câmera → erro

## Câmera desconectada
- [ ] Desligar câmera 1 fisicamente
- [ ] `/health` retorna `cameras[0].estado = 'desconectada'`
- [ ] Tentar abrir sessão na câmera 1 → erro, sem crash
- [ ] Religar câmera → reconecta automaticamente (backoff exp.)

## Relatórios
- [ ] `GET /relatorios/embarque/<num>?fmt=csv` baixa CSV
- [ ] `GET /relatorios/embarque/<num>?fmt=xlsx` baixa XLSX válido
- [ ] `GET /relatorios/embarque/<num>?fmt=pdf` baixa PDF legível
