# Contexto de Implementação: Sistema de Contagem Industrial (Edge to Cloud)

## 1. Objetivo do Sistema
Implementar um middleware de alta disponibilidade que recebe contagens de câmeras Keyence (via TCP/IP local), exibe em um Dashboard de baixa latência e sincroniza de forma resiliente com o Supabase.

## 2. Tech Stack Obrigatória
- **Backend:** Python (FastAPI) ou Node.js (preferencialmente para sockets leves).
- **Banco Local:** SQLite ou JSON-based Queue (para persistência em caso de queda de energia).
- **Cloud:** Supabase (PostgreSQL + Webhooks).
- **Frontend:** Reaproveitar HTML/CSS existentes (focar na integração de WebSockets para tempo real).

## 3. Arquitetura de Comunicação (Hardware)
- **Protocolo Câmera:** As câmeras Keyence enviam strings TCP ou JSON via portas específicas (ex: 5000/5001).
- **Ouvinte (Listener):** O backend deve manter um socket aberto para capturar esses gatilhos instantaneamente.
- **Saída de Vídeo:** A exibição na TV é via HDMI direto (Monitor 2). O frontend deve ser configurado para abrir em `--kiosk` no Monitor 2.

## 4. Lógica de Sincronização (Core Logic)
O sistema opera como uma Máquina de Estados:

### A. Modo ONLINE (Default)
- Enviar cada registro para o Supabase via POST/Webhook.
- Intervalo de verificação de fila: 60 segundos.
- Sucesso: Marcar como enviado no banco local.

### B. Modo OFFLINE (Gatilho: 5 min de falha ou Timeout)
- Parar tentativas de envio para evitar overhead.
- Armazenar todo dado novo no banco local (SQLite).
- Manter o Dashboard Local (Websocket) atualizado normalmente.

### C. Modo RECUPERAÇÃO (Gatilho: Ping bem-sucedido após falha)
- Iniciar envio em **LOTES (Batches)**.
- Regra: Agrupar registros (ex: 100 por payload) para descarregar a fila local sem sobrecarregar a API.
- Retornar ao Modo ONLINE somente após a fila local estar zerada.

## 5. Instruções de Implementação para LLM
1. **Módulo de Rede:** Priorize o tratamento de erros de socket. Se a conexão com a Keyence oscilar, o sistema deve reconectar automaticamente.
2. **Módulo de Interface:** Integre os arquivos HTML/CSS fornecidos. Utilize WebSockets (Socket.io ou FastApi WebSockets) para garantir que o número de contagem na TV mude no exato momento em que o pulso TCP é recebido.
3. **Módulo de Inicialização:** Gere um script `.bat` para Windows que inicie o backend e o Chrome (Modo Kiosk) com as coordenadas de janela corretas para os dois monitores.

## 6. Segredos e Caminhos
- **Pasta Raiz sugerida:** `C:\Users\emiliojv\Downloads\`
- **Database Local:** `local_buffer.db`