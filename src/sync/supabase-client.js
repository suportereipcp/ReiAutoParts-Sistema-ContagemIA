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

export async function buscarAlteracoes(sb, tabela, cursor, limite = 500) {
  let q = sb.from(tabela).select('*').order('atualizado_em', { ascending: true }).limit(limite);
  if (cursor) q = q.gt('atualizado_em', cursor);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
