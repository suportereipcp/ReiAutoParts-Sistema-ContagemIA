# Workflow Git

## Padrão de Trabalho
1. Claude Code cria worktree em `.claude/worktrees/`
2. Alterações feitas no worktree
3. Commit no branch do worktree
4. Merge fast-forward na main
5. Push para GitHub

## Preferências do Usuário
- Não usar PR intermediário (merge direto na main)
- Commitar apenas quando pedido explicitamente
- Não incluir `.claude/plugins-pack/` nos commits
- Push só quando autorizado

## Convenções de Commit
- `feat:` para features novas
- `docs:` para documentação
- `refactor:` para refatorações
- Mensagem em inglês, corpo pode ter detalhes em português
- Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

## Remote
- origin: github.com:suportereipcp/ReiAutoParts-Sistema-ContagemIA.git
- Branch principal: main
