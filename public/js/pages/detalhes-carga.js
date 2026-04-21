import { PainelContagem } from '../ui/composites/painel-contagem.js';
import { TabelaCaixas } from '../ui/composites/tabela-caixas.js';
import { Button } from '../ui/primitives/button.js';
import { toast } from '../ui/primitives/toast.js';
import { formatarNumero } from '../infra/formatters.js';

export async function renderDetalhesCarga(ctx, numero) {
  const el = document.createElement('div');
  el.className = 'space-y-8 max-w-6xl';

  const [embarque, caixas] = await Promise.all([
    ctx.api.get(`/embarques/${encodeURIComponent(numero)}`),
    ctx.api.get(`/sessoes?embarque=${encodeURIComponent(numero)}`).catch(() => []),
  ]);

  const header = document.createElement('section');
  header.className = 'flex justify-between items-end';
  header.innerHTML = `
    <div>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mb-2">Detalhes da Carga</p>
      <h2 class="text-4xl font-headline font-light tracking-tight text-on-surface">${embarque.numero_embarque}</h2>
      <p class="text-sm text-on-surface-variant font-light">${embarque.motorista ?? '-'} · ${embarque.placa ?? '-'}</p>
    </div>
  `;
  const btnFinalizar = Button({ texto: 'Finalizar Carga', icone: 'check_circle', onClick: () => toast.info('Finalização via Supabase ainda pendente.') });
  header.appendChild(btnFinalizar);
  el.appendChild(header);

  const ativa = caixas.find(c => c.status === 'ativa');
  if (ativa) el.appendChild(PainelContagem({ sessao: ativa }));

  el.appendChild(TabelaCaixas({ caixas: caixas.filter(c => c.status === 'encerrada') }));

  if (ativa) {
    const unsub = ctx.sessoes.subscribe(() => {
      const atualizada = ctx.sessoes.porCamera(ativa.camera_id);
      if (atualizada && atualizada.id === ativa.id) {
        const c = el.querySelector('[data-contagem]');
        if (c) c.textContent = formatarNumero(atualizada.quantidade_total);
      }
    });
    window.addEventListener('hashchange', unsub, { once: true });
  }
  return el;
}
