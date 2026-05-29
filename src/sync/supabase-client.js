import { createClient } from '@supabase/supabase-js';

export function createSupabase(config) {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: 'sistema_contagem' },
  });
}

export async function upsertSessao(sb, sessao) {
  const { error } = await sb.from('sessoes_contagem').upsert(sessao, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertEvento(sb, evento) {
  const { error } = await sb.from('eventos_log').upsert(evento, { onConflict: 'origem,id_local' });
  if (error) throw error;
}

export async function upsertEtiquetaCaixa(sb, payload) {
  const { error } = await sb.from('etiquetas_caixa').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertEtiquetaCaixaParte(sb, payload) {
  const { error } = await sb.from('etiquetas_caixa_partes').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function atualizarStatusEmbarque(sb, { numero_embarque, status }) {
  const { error } = await sb.from('embarques').update({ status }).eq('numero_embarque', numero_embarque);
  if (error) throw error;
}

// --- Acesso ---

export async function upsertAcessoGrupo(sb, payload) {
  const { error } = await sb.from('acesso_grupos').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertAcessoGrupoAtividades(sb, payload) {
  // payload: { grupo_id, atividades: [...] }
  const { grupo_id, atividades } = payload;
  // Limpa e reinsere
  await sb.from('acesso_grupo_atividades').delete().eq('grupo_id', grupo_id);
  if (atividades.length > 0) {
    const rows = atividades.map(a => ({ grupo_id, atividade_id: a }));
    const { error } = await sb.from('acesso_grupo_atividades').insert(rows);
    if (error) throw error;
  }
}

export async function upsertAcessoUsuarioGrupos(sb, payload) {
  // payload: { usuario_id, grupos: [...] }
  const { usuario_id, grupos } = payload;
  await sb.from('acesso_usuario_grupos').delete().eq('usuario_id', usuario_id);
  if (grupos.length > 0) {
    const rows = grupos.map(g => ({ usuario_id, grupo_id: g }));
    const { error } = await sb.from('acesso_usuario_grupos').insert(rows);
    if (error) throw error;
  }
}

export async function upsertAcessoUsuarioOverrides(sb, payload) {
  // payload: { usuario_id, overrides: [{ atividade_id, efeito }] }
  const { usuario_id, overrides } = payload;
  await sb.from('acesso_usuario_overrides').delete().eq('usuario_id', usuario_id);
  if (overrides.length > 0) {
    const rows = overrides.map(o => ({ usuario_id, atividade_id: o.atividade_id, efeito: o.efeito }));
    const { error } = await sb.from('acesso_usuario_overrides').insert(rows);
    if (error) throw error;
  }
}

export async function deleteAcessoGrupo(sb, id) {
  const { error } = await sb.from('acesso_grupos').delete().eq('id', id);
  if (error) throw error;
}

export async function buscarAlteracoes(sb, tabela, cursor, limite = 500) {
  let q = sb.from(tabela).select('*').order('atualizado_em', { ascending: true }).limit(limite);
  if (cursor) q = q.gt('atualizado_em', cursor);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
