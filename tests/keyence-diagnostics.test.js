import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarRegistradorDiagnosticoKeyence,
  formatarLinhaKeyenceNaoReconhecida,
  formatarRespostaKeyenceSemComando,
} from '../src/camera/keyence-diagnostics.js';

test('formatarLinhaKeyenceNaoReconhecida preserva linha recebida em JSON', () => {
  assert.equal(
    formatarLinhaKeyenceNaoReconhecida({ cameraId: 1, linha: 'RDR,01,0000001' }),
    'Linha Keyence nao reconhecida na camera 1: "RDR,01,0000001"',
  );
});

test('formatarRespostaKeyenceSemComando serializa resposta parseada', () => {
  assert.equal(
    formatarRespostaKeyenceSemComando({
      cameraId: 2,
      resposta: { tipo: 'resposta', comando: 'RDR', valores: ['01', '0000001'] },
    }),
    'Resposta Keyence sem comando na camera 2: {"tipo":"resposta","comando":"RDR","valores":["01","0000001"]}',
  );
});

test('criarRegistradorDiagnosticoKeyence registra eventos ate o limite por camera', () => {
  const eventos = [];
  const avisos = [];
  const registrarDiagnostico = criarRegistradorDiagnosticoKeyence({
    limitePorCamera: 2,
    logger: {
      warn: (payload, mensagem) => avisos.push({ payload, mensagem }),
    },
    registrarEvento: (evento) => eventos.push(evento),
  });

  registrarDiagnostico(1, 'primeira');
  registrarDiagnostico(1, 'segunda');
  registrarDiagnostico(1, 'terceira');
  registrarDiagnostico(2, 'outra camera');

  assert.equal(avisos.length, 4);
  assert.deepEqual(eventos.map(evento => evento.mensagem), ['primeira', 'segunda', 'outra camera']);
  assert.deepEqual(eventos.map(evento => evento.nivel), ['WARN', 'WARN', 'WARN']);
  assert.deepEqual(eventos.map(evento => evento.categoria), ['CAMERA', 'CAMERA', 'CAMERA']);
});
