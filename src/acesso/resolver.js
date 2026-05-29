/**
 * Resolve permissões efetivas de um usuário.
 *
 * Regra: efetivo = (união das atividades dos grupos ∪ concessões individuais) − revogações individuais.
 * Revogação sempre vence.
 *
 * @param {string[]} atividadesGrupos - IDs de atividades vindas dos grupos do usuário
 * @param {{ atividade_id: string, efeito: 'conceder'|'revogar' }[]} overrides - overrides individuais
 * @returns {string[]} IDs de atividades efetivamente concedidas (ordenados)
 */
export function resolverEfetivo(atividadesGrupos = [], overrides = []) {
  const concessoes = new Set(atividadesGrupos);
  const revogacoes = new Set();

  for (const ov of overrides) {
    if (ov.efeito === 'conceder') concessoes.add(ov.atividade_id);
    else if (ov.efeito === 'revogar') revogacoes.add(ov.atividade_id);
  }

  // Revogação vence
  for (const rev of revogacoes) {
    concessoes.delete(rev);
  }

  return [...concessoes].sort();
}
