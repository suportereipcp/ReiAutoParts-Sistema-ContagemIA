import { buscarAtivaPorCamera } from '../db/queries/sessoes.js';

export function criarContagemService({ db, registrarEvento, enfileirarSync, broadcast }) {
  function processarPulso({ cameraId, contagem, total_dia, brilho }) {
    const sessao = buscarAtivaPorCamera(db, cameraId);
    if (!sessao) {
      registrarEvento({
        nivel: 'WARN', categoria: 'CAMERA',
        mensagem: `Pulso recebido em câmera ${cameraId} sem sessão ativa (contagem=${contagem})`,
      });
      return null;
    }
    db.prepare(`UPDATE sessoes_contagem SET quantidade_total = ? WHERE id = ?`).run(contagem, sessao.id);
    broadcast('contagem.incrementada', {
      sessao_id: sessao.id,
      camera_id: cameraId,
      quantidade_total: contagem,
      total_dia,
      brilho,
    });
    return contagem;
  }

  return { processarPulso };
}
