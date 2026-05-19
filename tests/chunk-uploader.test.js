import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarChunkUploader } from '../src/audit/chunk-uploader.js';

function clienteFake() {
  const chamadas = [];
  let comportamento = () => ({ error: null });
  const sb = {
    from(tabela) {
      return {
        upsert: (payload, opts) => {
          chamadas.push({ tabela, payload, opts });
          return Promise.resolve(comportamento(payload));
        }
      };
    },
  };
  return { sb, chamadas, configurar: (fn) => { comportamento = fn; } };
}

test('upload bem-sucedido resolve com status success', async () => {
  const { sb, chamadas } = clienteFake();
  const uploader = criarChunkUploader({ supabase: sb });
  const r = await uploader.upload({
    id: 'c-uuid', sessao_id: 's1', camera_id: 1, chunk_seq: 1,
    pulsos_json: [{ t: 'x', n: 1, d: 1, b: 0 }],
    gravado_em: '2026-05-19T10:01:00.000Z',
  });
  assert.equal(r.status, 'success');
  assert.equal(chamadas[0].tabela, 'pulsos_chunks');
  assert.equal(chamadas[0].opts.onConflict, 'sessao_id,chunk_seq');
  assert.equal(chamadas[0].opts.ignoreDuplicates, true);
});

test('falha de rede resolve com status fail e razao (nao throw)', async () => {
  const { sb, configurar } = clienteFake();
  configurar(() => ({ error: { message: 'ECONNREFUSED' } }));
  const uploader = criarChunkUploader({ supabase: sb });
  const r = await uploader.upload({ id: 'c', sessao_id: 's', camera_id: 1, chunk_seq: 1, pulsos_json: [], gravado_em: 'x' });
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /ECONNREFUSED/);
});

test('excecao inesperada vira fail com mensagem', async () => {
  const sb = { from() { return { upsert: () => { throw new Error('boom'); } }; } };
  const uploader = criarChunkUploader({ supabase: sb });
  const r = await uploader.upload({ id: 'c', sessao_id: 's', camera_id: 1, chunk_seq: 1, pulsos_json: [], gravado_em: 'x' });
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /boom/);
});
