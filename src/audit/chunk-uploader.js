export function criarChunkUploader({ supabase, logger } = {}) {
  async function upload(chunk) {
    try {
      const { error } = await supabase
        .from('pulsos_chunks')
        .upsert(chunk, { onConflict: 'sessao_id,chunk_seq', ignoreDuplicates: true });
      if (error) {
        const reason = error.message ?? JSON.stringify(error);
        logger?.warn?.({ err: error, chunk_seq: chunk.chunk_seq }, 'falha ao subir chunk');
        return { status: 'fail', reason };
      }
      return { status: 'success' };
    } catch (e) {
      logger?.warn?.({ err: e, chunk_seq: chunk.chunk_seq }, 'excecao ao subir chunk');
      return { status: 'fail', reason: e.message ?? String(e) };
    }
  }
  return { upload };
}
