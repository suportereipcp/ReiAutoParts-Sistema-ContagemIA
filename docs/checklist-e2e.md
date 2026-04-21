# Checklist E2E — Pré-produção

Executar uma vez antes de liberar para produção. Cada item marcado com evidência (screenshot ou nota).

## Pré-requisitos
- [X] Supabase acessível (`curl https://supabase.pcpsuporterei.site/rest/v1/`)
- [X] Supabase com migrations 001 e 002 aplicadas
- [X] ERP já populou pelo menos 1 embarque aberto e 1 OP
- [X] Câmera 1 com porta 8500 habilitada + Método de alternação = Painel/PC/Rede/Troca automática
- [ ] (Opcional) Câmera 2 com mesma configuração
- [X] `npm install` executado
- [ ] `.env` preenchido com IP das câmeras e credenciais Supabase 

## Golden path
- [x] `npm run dev` → servidor sobe sem erro
- [x] `curl localhost:3000/health` → JSON com `status=ok`
- [x] Abrir `http://localhost:3000/operador/` → UI carrega, badge ONLINE verde
- [x] Dropdown de embarque populado (reverse poller trouxe dados)
- [x] Dropdown de OP funcional (digitando ou selecionando)
- [x] Lista de operadores presente
- [x] Selecionar embarque + OP + operador → câmera alocada
- [ ] Pesquisar programa da câmera → lista filtra
- [ ] Selecionar programa → confirmar → câmera física muda programa (IV Smart Navigator)
- [ ] Passar 5 peças reais → Monitor 2 (TV) mostra 5
- [ ] Passar mais 5 → Monitor 2 mostra 10
- [ ] Encerrar caixa → total vai ao Supabase (verificar via SQL)
- [ ] Abrir nova sessão na mesma câmera sem erro

## Resiliência
- [x] Desconectar cabo de rede do Edge PC
- [x] Badge vira OFFLINE amarelo (após ~90s — 3 falhas × 30s)
- [x] Passar mais 5 peças → Monitor 2 mostra 15 (contagem segue offline)
- [x] Encerrar caixa offline → sessão fica local com outbox pendente
- [x] Reconectar rede → badge vai para RECOVERY azul e depois ONLINE
- [x] Verificar no Supabase que sessões offline foram sincronizadas

## Duplicata
- [x] Tentar reusar número de caixa no mesmo embarque → erro claro
- [x] Tentar abrir 2 sessões na mesma câmera → erro

## Câmera desconectada
- [x] Desligar câmera 1 fisicamente
- [x] `/health` retorna `cameras[0].estado = 'desconectada'`
- [x] Tentar abrir sessão na câmera 1 → erro, sem crash
- [x] Religar câmera → reconecta automaticamente (backoff exp.)

## Relatórios
- [x] `GET /relatorios/embarque/<num>?fmt=csv` baixa CSV
- [x] `GET /relatorios/embarque/<num>?fmt=xlsx` baixa XLSX válido
- [x] `GET /relatorios/embarque/<num>?fmt=pdf` baixa PDF legível

## UI Industrial Zen (pós-migração)
- [ ] `/` renderiza dashboard Industrial Zen (sidenav + topnav + saudação + ações rápidas)
- [ ] `/#/cargas` lista cargas abertas em cards (paleta slate + teal)
- [ ] Botão "Nova Carga" abre modal (backdrop-blur + layers)
- [ ] Modal passo 2 exibe seletor de programa com busca
- [ ] `/#/cargas/<num>` mostra painel de contagem gigante + tabela de caixas
- [ ] Badge sync sincroniza ONLINE/OFFLINE/RECOVERY no canto superior
- [ ] `/#/relatorios` lista embarques e abre modal de emissão (CSV/XLSX/PDF)
- [ ] `/#/eventos` exibe tabela de eventos com cores por nível
- [ ] TV kiosk (`/tv/`) exibe PainelContagem em tela cheia para 2 câmeras
- [ ] Tailwind CDN + Inter/Manrope/Material Symbols carregam sem 404
