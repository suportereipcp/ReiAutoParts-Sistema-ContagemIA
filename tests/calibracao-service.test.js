import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../src/db/sqlite.js';
import { criarSessao } from '../src/db/queries/sessoes.js';
import { listarProgramasCalibracao } from '../src/db/queries/calibracao.js';
import { criarCalibracaoService } from '../src/domain/calibracao-service.js';

function setup(overrides = {}) {
  const db = openDatabase(':memory:');
  const camera = {
    cameraId: 1,
    estado: 'suspensa',
    ativacoes: [],
    encerramentos: 0,
    async ativarSessao(args) {
      this.ativacoes.push(args);
      this.estado = 'ativa';
    },
    async encerrarSessao() {
      this.encerramentos += 1;
      this.estado = 'suspensa';
    },
  };
  const broadcasts = [];
  let seq = 0;
  const svc = criarCalibracaoService({
    db,
    cameraManagers: new Map([[1, camera]]),
    gerarUUID: () => `uuid-${++seq}`,
    broadcast: (evento, payload) => broadcasts.push({ evento, payload }),
    now: () => new Date('2026-05-04T10:00:00.000Z'),
    nowMs: overrides.nowMs ?? (() => 1000),
    existeSessaoContagemAtiva: overrides.existeSessaoContagemAtiva ?? (() => false),
  });
  return { db, svc, camera, broadcasts };
}

test('treinar gera tres programas de calibracao com tamanhos fixos', () => {
  const { db, svc } = setup();

  const rows = svc.treinar({ camera_id: 1 });

  assert.deepEqual(rows.map((row) => row.tamanho), ['nano', 'small', 'medium']);
  assert.deepEqual(rows.map((row) => row.programa_numero), [120, 121, 122]);
  assert.ok(rows.every((row) => row.versao === 1));
  assert.equal(listarProgramasCalibracao(db, 1).length, 3);
});

test('novo treino sobrescreve trio anterior e incrementa versao', () => {
  const { svc } = setup();

  svc.treinar({ camera_id: 1 });
  const rows = svc.treinar({ camera_id: 1 });

  assert.equal(rows.length, 3);
  assert.ok(rows.every((row) => row.versao === 2));
  assert.deepEqual(rows.map((row) => row.id), ['uuid-4', 'uuid-5', 'uuid-6']);
});

test('executar ativa a camera com o programa selecionado e nao enfileira sync', async () => {
  const { svc, camera, broadcasts } = setup();
  const [programa] = svc.treinar({ camera_id: 1 });

  const sessao = await svc.executar(programa.id);

  assert.equal(sessao.programa_id, programa.id);
  assert.deepEqual(camera.ativacoes, [{ programaNumero: programa.programa_numero }]);
  assert.equal(broadcasts[0].evento, 'calibracao.iniciada');
});

test('executar bloqueia camera com sessao de contagem ativa', async () => {
  const { svc } = setup({ existeSessaoContagemAtiva: () => true });
  const [programa] = svc.treinar({ camera_id: 1 });

  await assert.rejects(
    () => svc.executar(programa.id),
    /sessao de contagem ativa/i,
  );
});

test('processarPulso emite metricas de calibracao sem gravar contagem ou outbox', async () => {
  let t = 1000;
  const { db, svc, broadcasts } = setup({ nowMs: () => t });
  const [programa] = svc.treinar({ camera_id: 1 });
  await svc.executar(programa.id);
  t = 1200;

  const metricas = svc.processarPulso({
    cameraId: 1,
    contagem: 9,
    brilho: 128,
    pixels_objeto: 640,
    frames_detectados: 12,
  });

  assert.equal(metricas.frames_detectados, 12);
  assert.equal(metricas.pixels_objeto, 640);
  assert.equal(metricas.fps, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM sessoes_contagem').get().total, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM outbox').get().total, 0);
  assert.equal(broadcasts.at(-1).evento, 'calibracao.metricas');
});

test('encerrar suspende a camera e remove sessao ativa de calibracao', async () => {
  const { svc, camera, broadcasts } = setup();
  const [programa] = svc.treinar({ camera_id: 1 });
  await svc.executar(programa.id);

  const encerrada = await svc.encerrarPorCamera(1);

  assert.equal(encerrada.status, 'encerrada');
  assert.equal(camera.encerramentos, 1);
  assert.equal(svc.temSessaoAtiva(1), false);
  assert.equal(broadcasts.at(-1).evento, 'calibracao.encerrada');
});

test('calibracao nao altera sessao de contagem existente em outra camera', async () => {
  const { db, svc } = setup();
  db.prepare('INSERT INTO embarques (numero_embarque, status) VALUES (?, ?)').run('E1', 'aberto');
  db.prepare('INSERT INTO ordens_producao (codigo_op) VALUES (?)').run('OP1');
  db.prepare('INSERT INTO operadores (codigo, nome) VALUES (?, ?)').run('001', 'Fulano');
  criarSessao(db, {
    id: 's1',
    numero_embarque: 'E1',
    codigo_op: 'OP1',
    codigo_operador: '001',
    camera_id: 2,
    iniciada_em: '2026-05-04T10:00:00.000Z',
  });
  const [programa] = svc.treinar({ camera_id: 1 });
  await svc.executar(programa.id);

  svc.processarPulso({ cameraId: 1, contagem: 15, brilho: 500 });

  const sessao = db.prepare('SELECT quantidade_total FROM sessoes_contagem WHERE id = ?').get('s1');
  assert.equal(sessao.quantidade_total, 0);
});
