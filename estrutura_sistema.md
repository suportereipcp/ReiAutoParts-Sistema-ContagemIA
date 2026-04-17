# Estrutura de Arquitetura Industrial - Sistema de Contagem Automatizada

Este documento detalha a arquitetura física e lógica do sistema de contagem automatizada utilizando câmeras com Inteligência Artificial (Keyence) integradas a um ambiente Edge Computing com sincronização em nuvem (Supabase).

A premissa fundamental desta arquitetura é a **tolerância a falhas de rede externa**, garantindo latência zero para o operador no chão de fábrica e consistência eventual dos dados no servidor central.

---

## 1. Topologia de Hardware e Rede (Camada Física)

A arquitetura utiliza o conceito de **Edge Computing** (computação de borda), onde o processamento crítico ocorre o mais próximo possível da geração do dado.

* **Câmeras Inteligentes (Keyence):** * Atuam como sensores independentes. Toda a inferência de IA (visão computacional para identificação e contagem) ocorre no hardware da própria câmera.
    * Elas não transmitem o fluxo de vídeo (stream) para processamento em nuvem, mas apenas os resultados brutos (ex: evento de contagem, timestamp, ID do lote).
* **Switch Industrial Gigabit:** * Ponto central de conexão cabeada em estrela. Isola o tráfego de vídeo e dados das câmeras na rede local (LAN).
* **Edge PC (Computador Local):** * Máquina dedicada conectada ao Switch, responsável por orquestrar o sistema.
    * Possui IP estático na rede local para garantir que as câmeras sempre encontrem o destino dos dados (Socket/TCP).
* **Displays de Exibição:** * **Monitor 1 (Operação):** Interface de controle (Start/Stop, relatórios).
    * **Monitor 2 (TV Dashboard):** Conectado diretamente via HDMI ao Edge PC. Exibe o feedback visual em tempo real sem depender de roteamento de rede.

---

## 2. Componentes Lógicos do Edge PC (Software Local)

O computador local hospeda um ecossistema de software que age como uma ponte (middleware) entre o hardware da fábrica e a nuvem.

* **Serviço de Aquisição (Listener):**
    * Processo em background (ex: rotina em Python ou Node.js) que escuta as portas de comunicação configuradas nas câmeras Keyence.
    * Sua única função é receber o gatilho da câmera, formatar em um objeto JSON (Payload) e enviar para o banco local.
* **Banco de Dados/Fila Local (Buffer):**
    * Um banco de dados leve (como SQLite ou Redis) hospedado no próprio PC.
    * Todo dado recebido é salvo **primeiro aqui**. Isso garante que, se a aplicação travar ou a rede cair no milissegundo seguinte, o dado já está em disco.
* **Webapp (Frontend):**
    * Interface web servida localmente (localhost).
    * Consome os dados do banco local para atualizar o dashboard da TV (Monitor 2) instantaneamente, oferecendo tempo de resposta visual abaixo de 50ms para o operador.

---

## 3. Máquina de Estados: Sincronização Híbrida (Store and Forward)

Para interagir com o **Supabase** (VPS), o sistema não faz envios síncronos diretos de cada peça contada. Ele utiliza um serviço de sincronização autônomo (Worker) que opera sob três estados possíveis:

### Estado 1: Operação Normal (Online)
* **Frequência:** A cada 1 minuto.
* **Ação:** O Worker local verifica os registros não sincronizados no banco SQLite e tenta enviá-los via Webhook/API REST para o Supabase.
* **Confirmação (ACK):** O registro local só é marcado como `sincronizado: true` após receber o código HTTP 200 (OK) do Supabase.

### Estado 2: Modo de Contingência (Timeout / Offline)
* **Gatilho:** Se a requisição HTTP demorar mais de 5 minutos sem resposta, ou retornar erros de rede (Timeouts, 503 Service Unavailable).
* **Ação:** O Worker pausa as tentativas de envio de 1 minuto para evitar o esgotamento de portas lógicas do sistema operacional e economizar CPU.
* **Enfileiramento:** Os dados das câmeras continuam chegando normalmente e são armazenados localmente. O sistema não tenta enviar os últimos 5 minutos de falha nem os dados subsequentes de imediato. A prioridade máxima passa a ser manter o dashboard do operador rodando.

### Estado 3: Recuperação (Recovery)
* **Frequência de Ping:** A cada 5 minutos, o Worker dispara um pacote pequeno (Healthcheck) para o Supabase para testar se a internet voltou.
* **Ação:** Ao detectar conexão estável, o sistema entra em modo de descarregamento (Flushing).
* **Envio em Lotes (Batching):** O sistema agrupa as centenas ou milhares de registros acumulados no período offline em arrays de objetos (Payloads em lote).
    * *Justificativa técnica:* Enviar 1000 registros em 1 única requisição com array é infinitamente mais eficiente e seguro para o limite de taxa (Rate Limit) do Supabase do que fazer 1000 requisições simultâneas assim que a internet volta.

---

## 4. Requisitos de Segurança e Manutenção

1.  **Limpeza de Buffer (Data Retention):** Para evitar que o disco do Edge PC lote com o tempo, o sistema deve possuir uma rotina (CRON) que expurga dados locais que já foram confirmados no Supabase e que sejam mais antigos que 7 dias.
2.  **Isolamento de Rede:** O Switch onde as câmeras e o Edge PC estão conectados não deve permitir que dispositivos externos à fábrica acessem diretamente os IPs das câmeras, prevenindo manipulação de dados na origem.
3.  **Logs de Diagnóstico:** O Worker de sincronização deve gerar arquivos de texto diários (logs) registrando os horários de início e fim de cada perda de conexão com a nuvem, facilitando auditorias futuras.