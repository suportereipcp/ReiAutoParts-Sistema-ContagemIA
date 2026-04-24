# Isolamento de Programas por Camera

Data: 2026-04-24

## Objetivo

Garantir que cameras Keyence 1 e 2 operem isoladas dentro da plataforma. A camera selecionada pelo usuario no formulario "Nova Sessao de Contagem" deve controlar toda a sequencia seguinte: validacao de disponibilidade, abertura da sessao, listagem de programas, confirmacao do programa e ativacao fisica da camera.

O sistema tambem deve manter um cache local de programas separado por camera para carregar a lista rapidamente, sem depender de varrer a camera a cada abertura de sessao.

## Regras Operacionais

1. Ao clicar em "Continuar" no formulario de nova sessao, o backend deve validar a camera informada.
2. Se a camera informada ja tiver uma sessao ativa, a plataforma deve bloquear o avanco e retornar uma mensagem objetiva:
   - `Camera 1 esta com sessao ativa. Encerre a sessao antes de continuar.`
   - `Camera 2 esta com sessao ativa. Encerre a sessao antes de continuar.`
3. Quando bloqueado, o sistema nao deve abrir nova sessao, nao deve carregar programas e nao deve enviar comandos para a camera.
4. A tela de selecao de programas deve listar apenas programas da camera vinculada a sessao aberta.
5. A atualizacao/varredura fisica dos programas da camera nao pode ocorrer se aquela camera estiver em sessao ativa.
6. A listagem normal pode usar o cache local mesmo que a camera esteja ocupada, desde que a sessao ja tenha sido aberta anteriormente para aquela camera.

## Cache Local de Programas

Os programas devem ser salvos em disco por camera, em pastas separadas:

```text
data/programas/camera-1/programas.json
data/programas/camera-2/programas.json
```

Formato proposto:

```json
{
  "cameraId": 1,
  "atualizadoEm": "2026-04-24T12:00:00.000Z",
  "programas": [
    { "numero": 0, "nome": "PECA-A" },
    { "numero": 1, "nome": "PECA-B" }
  ]
}
```

O cache e operacional e local ao Edge PC. Nao deve ser sincronizado para Supabase nesta etapa.

## Fluxo de Boot

Ao iniciar ou reiniciar o sistema:

1. Cada `CameraManager` conecta apenas na sua camera configurada.
2. Quando a camera conectar e estiver sem sessao ativa, o sistema deve varrer os programas daquela camera.
3. A varredura deve usar os comandos ja existentes: `PR`, `PW,NNN` e `PNR`.
4. Depois da varredura, o sistema deve restaurar o programa original quando possivel.
5. O resultado deve ser gravado no cache local da camera correspondente.
6. Se a camera estiver desconectada ou falhar durante a varredura, o sistema deve manter o ultimo cache salvo em disco para a UI.

## Fluxo de Nova Sessao

1. Usuario preenche embarque, OP, operador e camera.
2. Usuario clica "Continuar".
3. Frontend envia `POST /sessoes`.
4. Backend valida:
   - embarque existe e esta aberto;
   - OP existe;
   - operador existe e esta ativo;
   - camera existe;
   - camera esta conectada;
   - camera informada nao possui sessao ativa.
5. Se houver sessao ativa na camera, retorna erro e o frontend permanece no formulario.
6. Se aprovado, cria sessao ativa sem programa e avanca para selecao de programa.
7. A tela de selecao chama `GET /programas?camera=<camera_id>` e recebe apenas o cache daquela camera.
8. Ao selecionar programa, `POST /sessoes/:id/confirmar` envia `PW,NNN`, `CTR` e `OE,1` somente para a camera da sessao.

## APIs

### `GET /programas?camera=1`

Retorna programas do cache da camera selecionada.

Comportamento esperado:

- `404` se a camera nao existir.
- Lista vazia se nao houver cache e nao for solicitada atualizacao fisica.
- Nao deve iniciar varredura fisica automaticamente durante uma sessao ativa.

### `POST /programas/atualizar`

Payload:

```json
{ "camera": 1 }
```

Comportamento esperado:

- Valida camera existente.
- Bloqueia se a camera estiver desconectada.
- Bloqueia se houver sessao ativa naquela camera.
- Varre os programas fisicamente.
- Atualiza cache em memoria e em disco.
- Retorna a lista atualizada.

Mensagem quando bloqueado por sessao ativa:

```text
Camera 1 esta com sessao ativa. Encerre a sessao antes de atualizar programas.
```

## Componentes

### `ProgramCache`

Novo modulo em `src/camera/program-cache.js`.

Responsabilidades:

- resolver caminho do cache por camera;
- criar diretorios quando necessario;
- carregar `programas.json` do disco;
- salvar `programas.json` de forma atomica;
- filtrar programas por texto;
- expor lista em memoria para o `CameraManager`.

### `CameraManager`

Responsabilidades novas:

- carregar cache local ao iniciar;
- salvar cache apos descoberta fisica;
- expor `listarProgramas(q)`;
- expor `atualizarProgramas()` com bloqueio quando estado for `ativa`;
- manter isolamento por instancia, sem compartilhar cache entre cameras.

### `rotasProgramas`

Responsabilidades novas:

- `GET /programas` passa a listar cache da camera selecionada;
- `POST /programas/atualizar` executa refresh explicito;
- mensagens de erro devem mencionar a camera informada.

### `sessaoService`

Responsabilidade atual mantida e reforcada:

- `abrir()` bloqueia sessao nova quando `buscarAtivaPorCamera(db, camera_id)` retornar sessao ativa.
- A mensagem deve ser adequada para a UI:
  `Camera N esta com sessao ativa. Encerre a sessao antes de continuar.`

## Tratamento de Erros

- Camera desconhecida: erro de validacao.
- Camera desconectada: nao permite abrir sessao nem atualizar cache.
- Camera ativa: nao permite abrir nova sessao nem atualizar fisicamente programas.
- Cache ausente: retorna lista vazia na consulta normal e deixa o usuario usar a atualizacao manual quando a camera estiver disponivel.
- Falha parcial na varredura: se houver programas validos encontrados, salva os validos; se nenhum programa for encontrado e houve erro de comunicacao, retorna falha.

## Testes

Adicionar ou ajustar testes com `node:test`:

1. `ProgramCache` salva e carrega programas por camera em diretorios separados.
2. `GET /programas?camera=1` retorna apenas cache da camera 1.
3. `GET /programas?camera=2` retorna apenas cache da camera 2.
4. `POST /programas/atualizar` bloqueia camera com sessao ativa.
5. `POST /programas/atualizar` atualiza cache em memoria e disco quando camera esta livre.
6. `POST /sessoes` retorna erro claro quando a camera informada ja esta com sessao ativa.
7. Boot/reconnect chama refresh de programas por camera somente quando a camera esta sem sessao ativa.

## Fora de Escopo

- Alterar schema SQLite.
- Alterar schema Supabase.
- Sincronizar programas para Supabase.
- Editar/criar programas de visao da Keyence pela plataforma.
- Baixar parametros internos dos programas; o cache guarda somente numero e nome.
