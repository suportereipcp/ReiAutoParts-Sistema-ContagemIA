import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baixarArquivo } from '../../../public/js/infra/download.js';

test('baixarArquivo usa fetch, cria blob URL e dispara download sem navegar', async () => {
  const cliques = [];
  const anexados = [];
  const removidos = [];
  const documentFake = {
    body: {
      appendChild(el) { anexados.push(el); },
    },
    createElement(tag) {
      assert.equal(tag, 'a');
      return {
        style: {},
        click() { cliques.push({ href: this.href, download: this.download }); },
        remove() { removidos.push(this); },
      };
    },
  };
  const originalUrl = globalThis.URL;
  globalThis.URL = {
    createObjectURL: () => 'blob:relatorio',
    revokeObjectURL: (url) => { assert.equal(url, 'blob:relatorio'); },
  };

  try {
    const resultado = await baixarArquivo('/relatorios/embarque/01?fmt=pdf', {
      document: documentFake,
      fetch: async (url) => {
        assert.equal(url, '/relatorios/embarque/01?fmt=pdf');
        return {
          ok: true,
          headers: { get: () => 'attachment; filename=embarque-01.pdf' },
          blob: async () => new Blob(['pdf'], { type: 'application/pdf' }),
        };
      },
    });

    assert.equal(resultado.nome, 'embarque-01.pdf');
    assert.deepEqual(cliques, [{ href: 'blob:relatorio', download: 'embarque-01.pdf' }]);
    assert.equal(anexados.length, 1);
    assert.equal(removidos.length, 1);
  } finally {
    globalThis.URL = originalUrl;
  }
});

test('baixarArquivo propaga erro do backend', async () => {
  await assert.rejects(() => baixarArquivo('/relatorios/embarque/01?fmt=pdf', {
    document: { createElement() {}, body: { appendChild() {} } },
    fetch: async () => ({
      ok: false,
      statusText: 'Erro',
      json: async () => ({ erro: 'falha no relatorio' }),
    }),
  }), /falha no relatorio/);
});
