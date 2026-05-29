import { randomUUID } from 'node:crypto';
import { catalogoAgrupado, atividadeExiste } from '../../acesso/catalogo.js';
import { resolverEfetivo } from '../../acesso/resolver.js';
import {
  listarGrupos, buscarGrupo, criarGrupo, atualizarGrupo, excluirGrupo,
  listarAtividadesGrupo, definirAtividadesGrupo,
  listarUsuarios, upsertUsuariosBatch,
  listarGruposUsuario, definirGruposUsuario,
  listarOverrides, definirOverrides,
  atividadesDoUsuarioViaGrupos,
} from '../../db/queries/acesso.js';

export function rotasAcesso(fastify, { db, supabase }) {
  const now = () => new Date().toISOString();

  // --- Catálogo ---
  fastify.get('/acesso/catalogo', () => catalogoAgrupado());

  // --- Grupos CRUD ---
  fastify.get('/acesso/grupos', () => {
    const grupos = listarGrupos(db);
    return grupos.map(g => ({
      ...g,
      atividades: listarAtividadesGrupo(db, g.id),
    }));
  });

  fastify.post('/acesso/grupos', (req, reply) => {
    const { nome, descricao } = req.body ?? {};
    if (!nome?.trim()) return reply.code(400).send({ error: 'nome obrigatório' });
    const id = randomUUID();
    const ts = now();
    try {
      criarGrupo(db, { id, nome: nome.trim(), descricao: descricao?.trim() ?? null, criado_em: ts, atualizado_em: ts });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return reply.code(409).send({ error: 'Grupo com esse nome já existe' });
      throw err;
    }
    return reply.code(201).send(buscarGrupo(db, id));
  });

  fastify.patch('/acesso/grupos/:id', (req, reply) => {
    const grupo = buscarGrupo(db, req.params.id);
    if (!grupo) return reply.code(404).send({ error: 'Grupo não encontrado' });
    const { nome, descricao } = req.body ?? {};
    try {
      atualizarGrupo(db, req.params.id, { nome: nome?.trim(), descricao: descricao?.trim(), atualizado_em: now() });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return reply.code(409).send({ error: 'Nome já em uso' });
      throw err;
    }
    return buscarGrupo(db, req.params.id);
  });

  fastify.delete('/acesso/grupos/:id', (req, reply) => {
    const grupo = buscarGrupo(db, req.params.id);
    if (!grupo) return reply.code(404).send({ error: 'Grupo não encontrado' });
    excluirGrupo(db, req.params.id);
    return { ok: true };
  });

  // --- Atividades do Grupo ---
  fastify.put('/acesso/grupos/:id/atividades', (req, reply) => {
    const grupo = buscarGrupo(db, req.params.id);
    if (!grupo) return reply.code(404).send({ error: 'Grupo não encontrado' });
    const { atividades } = req.body ?? {};
    if (!Array.isArray(atividades)) return reply.code(400).send({ error: 'atividades deve ser array' });
    const invalidas = atividades.filter(a => !atividadeExiste(a));
    if (invalidas.length) return reply.code(400).send({ error: `Atividades inválidas: ${invalidas.join(', ')}` });
    definirAtividadesGrupo(db, req.params.id, atividades);
    return { ok: true, atividades };
  });

  // --- Usuários ---
  fastify.get('/acesso/usuarios', async (req, reply) => {
    // Tenta sincronizar do Supabase auth se disponível
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (!error && data?.users?.length) {
          const ts = now();
          const usuarios = data.users.map(u => ({
            id: u.id,
            email: u.email ?? null,
            nome: u.user_metadata?.name ?? u.email ?? '',
            sincronizado_em: ts,
          }));
          upsertUsuariosBatch(db, usuarios);
        }
      } catch { /* offline — usa cache local */ }
    }
    return listarUsuarios(db);
  });

  // --- Grupos do Usuário ---
  fastify.get('/acesso/usuarios/:id/grupos', (req) => {
    return listarGruposUsuario(db, req.params.id);
  });

  fastify.put('/acesso/usuarios/:id/grupos', (req, reply) => {
    const { grupos } = req.body ?? {};
    if (!Array.isArray(grupos)) return reply.code(400).send({ error: 'grupos deve ser array' });
    definirGruposUsuario(db, req.params.id, grupos);
    return { ok: true };
  });

  // --- Overrides ---
  fastify.get('/acesso/usuarios/:id/overrides', (req) => {
    return listarOverrides(db, req.params.id);
  });

  fastify.put('/acesso/usuarios/:id/overrides', (req, reply) => {
    const { overrides } = req.body ?? {};
    if (!Array.isArray(overrides)) return reply.code(400).send({ error: 'overrides deve ser array' });
    for (const ov of overrides) {
      if (!atividadeExiste(ov.atividade_id)) return reply.code(400).send({ error: `Atividade inválida: ${ov.atividade_id}` });
      if (!['conceder', 'revogar'].includes(ov.efeito)) return reply.code(400).send({ error: `Efeito inválido: ${ov.efeito}` });
    }
    definirOverrides(db, req.params.id, overrides);
    return { ok: true };
  });

  // --- Acesso efetivo ---
  fastify.get('/acesso/usuarios/:id/acesso', (req) => {
    const grupos = listarGruposUsuario(db, req.params.id);
    const atividadesGrupos = atividadesDoUsuarioViaGrupos(db, req.params.id);
    const overrides = listarOverrides(db, req.params.id);
    const efetivo = resolverEfetivo(atividadesGrupos, overrides);
    return { grupos, overrides, efetivo };
  });
}
