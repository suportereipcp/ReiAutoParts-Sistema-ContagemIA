import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { rotasAcesso } from '../src/http/routes/acesso.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const migrations = fs.readdirSync('src/db/migrations').sort();
  for (const file of migrations) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  return db;
}

function criarApp(db) {
  const app = Fastify();
  const synced = [];
  rotasAcesso(app, { db, supabase: null, enfileirarSync: (t, p) => synced.push({ t, p }) });
  return { app, synced };
}

test('GET /acesso/catalogo retorna atividades agrupadas', async () => {
  const { app } = criarApp(criarDb());
  const res = await app.inject({ method: 'GET', url: '/acesso/catalogo' });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.ok(Array.isArray(body));
  assert.ok(body.some(p => p.pagina === 'Sessões'));
});

test('POST /acesso/grupos cria grupo e enfileira sync', async () => {
  const { app, synced } = criarApp(criarDb());
  const res = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'Admin' } });
  assert.equal(res.statusCode, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.nome, 'Admin');
  assert.ok(body.id);
  assert.equal(synced.length, 1);
  assert.equal(synced[0].t, 'acesso_grupos');
});

test('POST /acesso/grupos rejeita nome vazio', async () => {
  const { app } = criarApp(criarDb());
  const res = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: '' } });
  assert.equal(res.statusCode, 400);
});

test('POST /acesso/grupos rejeita nome duplicado', async () => {
  const db = criarDb();
  const { app } = criarApp(db);
  await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'Admin' } });
  const res = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'Admin' } });
  assert.equal(res.statusCode, 409);
});

test('PATCH /acesso/grupos/:id renomeia grupo', async () => {
  const { app } = criarApp(criarDb());
  const criar = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'Old' } });
  const { id } = JSON.parse(criar.body);
  const res = await app.inject({ method: 'PATCH', url: `/acesso/grupos/${id}`, payload: { nome: 'New' } });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).nome, 'New');
});

test('DELETE /acesso/grupos/:id exclui grupo', async () => {
  const { app } = criarApp(criarDb());
  const criar = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'Temp' } });
  const { id } = JSON.parse(criar.body);
  const res = await app.inject({ method: 'DELETE', url: `/acesso/grupos/${id}` });
  assert.equal(res.statusCode, 200);
  // Verificar que não existe mais
  const lista = await app.inject({ method: 'GET', url: '/acesso/grupos' });
  assert.equal(JSON.parse(lista.body).length, 0);
});

test('PUT /acesso/grupos/:id/atividades define atividades', async () => {
  const { app, synced } = criarApp(criarDb());
  const criar = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'G1' } });
  const { id } = JSON.parse(criar.body);
  const res = await app.inject({
    method: 'PUT', url: `/acesso/grupos/${id}/atividades`,
    payload: { atividades: ['sessao.abrir', 'sessao.encerrar'] },
  });
  assert.equal(res.statusCode, 200);
  assert.ok(synced.some(s => s.t === 'acesso_grupo_atividades'));
});

test('PUT /acesso/grupos/:id/atividades rejeita atividade inválida', async () => {
  const { app } = criarApp(criarDb());
  const criar = await app.inject({ method: 'POST', url: '/acesso/grupos', payload: { nome: 'G1' } });
  const { id } = JSON.parse(criar.body);
  const res = await app.inject({
    method: 'PUT', url: `/acesso/grupos/${id}/atividades`,
    payload: { atividades: ['inexistente.xyz'] },
  });
  assert.equal(res.statusCode, 400);
});

test('PUT /acesso/usuarios/:id/overrides valida efeito', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO acesso_usuarios (id, email, nome, sincronizado_em) VALUES ('u1', 'a@b.com', 'Ana', '2026-01-01')`).run();
  const { app } = criarApp(db);
  const res = await app.inject({
    method: 'PUT', url: '/acesso/usuarios/u1/overrides',
    payload: { overrides: [{ atividade_id: 'sessao.abrir', efeito: 'invalido' }] },
  });
  assert.equal(res.statusCode, 400);
});

test('GET /acesso/usuarios/:id/acesso retorna efetivo calculado', async () => {
  const db = criarDb();
  db.prepare(`INSERT INTO acesso_usuarios (id, email, nome, sincronizado_em) VALUES ('u1', 'a@b.com', 'Ana', '2026-01-01')`).run();
  db.prepare(`INSERT INTO acesso_grupos (id, nome, descricao, criado_em, atualizado_em) VALUES ('g1', 'Admin', null, '2026-01-01', '2026-01-01')`).run();
  db.prepare(`INSERT INTO acesso_grupo_atividades (grupo_id, atividade_id) VALUES ('g1', 'sessao.abrir'), ('g1', 'carga.criar')`).run();
  db.prepare(`INSERT INTO acesso_usuario_grupos (usuario_id, grupo_id) VALUES ('u1', 'g1')`).run();
  db.prepare(`INSERT INTO acesso_usuario_overrides (usuario_id, atividade_id, efeito) VALUES ('u1', 'carga.criar', 'revogar')`).run();

  const { app } = criarApp(db);
  const res = await app.inject({ method: 'GET', url: '/acesso/usuarios/u1/acesso' });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.deepEqual(body.efetivo, ['sessao.abrir']);
  assert.equal(body.grupos.length, 1);
  assert.equal(body.overrides.length, 1);
});
