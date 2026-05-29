/**
 * Catálogo de atividades — fonte da verdade em código.
 * Cada atividade pertence a uma página (agrupamento visual).
 * O `id` é estável e referenciado nas tabelas de acesso.
 */

export const CATALOGO_ATIVIDADES = [
  { pagina: 'Cargas', id: 'carga.criar', rotulo: 'Criar carga' },
  { pagina: 'Cargas', id: 'carga.finalizar', rotulo: 'Finalizar carga (faturar)' },
  { pagina: 'Sessões', id: 'sessao.abrir', rotulo: 'Abrir sessão' },
  { pagina: 'Sessões', id: 'sessao.encerrar', rotulo: 'Encerrar sessão' },
  { pagina: 'Sessões', id: 'sessao.reiniciar_contagem', rotulo: 'Reiniciar contagem' },
  { pagina: 'Sessões', id: 'sessao.reiniciar', rotulo: 'Reiniciar/cancelar sessão' },
  { pagina: 'Sessões', id: 'sessao.aprovar', rotulo: 'Aprovar sessão (faturamento)' },
  { pagina: 'Sessões', id: 'sessao.realocar', rotulo: 'Realocar sessão' },
  { pagina: 'Etiquetas', id: 'etiqueta.reimprimir', rotulo: 'Reimprimir etiqueta (única)' },
  { pagina: 'Etiquetas', id: 'etiqueta.reimprimir_massa', rotulo: 'Reimpressão em massa' },
  { pagina: 'Relatórios', id: 'relatorio.emitir', rotulo: 'Emitir relatório' },
  { pagina: 'Eventos', id: 'eventos.visualizar', rotulo: 'Visualizar eventos' },
  { pagina: 'Configurador', id: 'configurador.gerenciar', rotulo: 'Gerenciar acessos' },
];

/** Retorna o catálogo agrupado por página */
export function catalogoAgrupado() {
  const mapa = new Map();
  for (const at of CATALOGO_ATIVIDADES) {
    if (!mapa.has(at.pagina)) mapa.set(at.pagina, []);
    mapa.get(at.pagina).push({ id: at.id, rotulo: at.rotulo });
  }
  return [...mapa.entries()].map(([pagina, atividades]) => ({ pagina, atividades }));
}

/** Valida se um id de atividade existe no catálogo */
export function atividadeExiste(id) {
  return CATALOGO_ATIVIDADES.some(a => a.id === id);
}
