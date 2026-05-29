import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  listarGrupos, buscarGrupo, criarGrupo, atualizarGrupo, excluirGrupo,
  listarAtividadesGrupo, definirAtividadesGrupo,
  listarUsuarios, upsertUsuario, upsertUsuariosBatch,
  listarGruposUsuario, definirGruposUsuario,
  listarOverrides, definirOverrides,
  atividadesDoUsuarioViaGrupos,
} from '../src/db/queries/acesso.js';

function criarDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const migrations = fs.readdirSync('src/db/migrations').sort();
  for (const file of migrations) {
    db.exec(fs.readFileSync(path.join('src', 'db', 'migrations', file), 'utf8'));
  }
  return db;
}

test('CRUD de grupos', () => {
  const db = criarDb();
  criarGrupo(db, { id: 'g1', nome: 'Admin', descricao: 'Administradores', criado_em: '2026-01-01', atualizado_em: '2026-01-01' });
  criarGrupo(db, { id: 'g2', nome: 'Operador', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });

  const todos = listarGrupos(db);
  assert.equal(todos.length, 2);
  assert.equal(todos[0].nome, 'Admin');

  atualizarGrupo(db, 'g1', { nome: 'Superadmin', atualizado_em: '2026-01-02' });
  assert.equal(buscarGrupo(db, 'g1').nome, 'Superadmin');

  excluirGrupo(db, 'g2');
  assert.equal(listarGrupos(db).length, 1);
});

test('definir e listar atividades de grupo', () => {
  const db = criarDb();
  criarGrupo(db, { id: 'g1', nome: 'Admin', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });

  definirAtividadesGrupo(db, 'g1', ['sessao.abrir', 'sessao.encerrar', 'carga.criar']);
  const atividades = listarAtividadesGrupo(db, 'g1');
  assert.equal(atividades.length, 3);
  assert.ok(atividades.includes('sessao.abrir'));

  // Redefinir substitui
  definirAtividadesGrupo(db, 'g1', ['carga.criar']);
  assert.equal(listarAtividadesGrupo(db, 'g1').length, 1);
});

test('upsert de usuários', () => {
  const db = criarDb();
  upsertUsuario(db, { id: 'u1', email: 'a@b.com', nome: 'Ana', sincronizado_em: '2026-01-01' });
  upsertUsuario(db, { id: 'u1', email: 'a@b.com', nome: 'Ana Silva', sincronizado_em: '2026-01-02' });

  const usuarios = listarUsuarios(db);
  assert.equal(usuarios.length, 1);
  assert.equal(usuarios[0].nome, 'Ana Silva');
});

test('upsert batch de usuários', () => {
  const db = criarDb();
  upsertUsuariosBatch(db, [
    { id: 'u1', email: 'a@b.com', nome: 'Ana', sincronizado_em: '2026-01-01' },
    { id: 'u2', email: 'b@b.com', nome: 'Bruno', sincronizado_em: '2026-01-01' },
  ]);
  assert.equal(listarUsuarios(db).length, 2);
});

test('grupos do usuário', () => {
  const db = criarDb();
  criarGrupo(db, { id: 'g1', nome: 'Admin', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });
  criarGrupo(db, { id: 'g2', nome: 'Operador', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });
  upsertUsuario(db, { id: 'u1', email: 'a@b.com', nome: 'Ana', sincronizado_em: '2026-01-01' });

  definirGruposUsuario(db, 'u1', ['g1', 'g2']);
  const grupos = listarGruposUsuario(db, 'u1');
  assert.equal(grupos.length, 2);

  definirGruposUsuario(db, 'u1', ['g1']);
  assert.equal(listarGruposUsuario(db, 'u1').length, 1);
});

test('overrides do usuário', () => {
  const db = criarDb();
  upsertUsuario(db, { id: 'u1', email: 'a@b.com', nome: 'Ana', sincronizado_em: '2026-01-01' });

  definirOverrides(db, 'u1', [
    { atividade_id: 'sessao.aprovar', efeito: 'conceder' },
    { atividade_id: 'carga.criar', efeito: 'revogar' },
  ]);

  const ovs = listarOverrides(db, 'u1');
  assert.equal(ovs.length, 2);
  assert.equal(ovs.find(o => o.atividade_id === 'sessao.aprovar').efeito, 'conceder');
});

test('atividades do usuário via grupos', () => {
  const db = criarDb();
  criarGrupo(db, { id: 'g1', nome: 'Admin', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });
  criarGrupo(db, { id: 'g2', nome: 'Operador', descricao: null, criado_em: '2026-01-01', atualizado_em: '2026-01-01' });
  definirAtividadesGrupo(db, 'g1', ['sessao.abrir', 'sessao.encerrar']);
  definirAtividadesGrupo(db, 'g2', ['sessao.abrir', 'carga.criar']);
  upsertUsuario(db, { id: 'u1', email: 'a@b.com', nome: 'Ana', sincronizado_em: '2026-01-01' });
  definirGruposUsuario(db, 'u1', ['g1', 'g2']);

  const atividades = atividadesDoUsuarioViaGrupos(db, 'u1');
  // Deve ter 3 distintas: sessao.abrir, sessao.encerrar, carga.criar
  assert.equal(atividades.length, 3);
  assert.ok(atividades.includes('sessao.abrir'));
  assert.ok(atividades.includes('sessao.encerrar'));
  assert.ok(atividades.includes('carga.criar'));
});
