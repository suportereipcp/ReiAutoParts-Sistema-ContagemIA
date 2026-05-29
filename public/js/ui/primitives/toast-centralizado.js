/**
 * Toast centralizado — overlay fullscreen com card vermelho centrado.
 * Usado para erros críticos (ex.: câmera indisponível).
 */

export function toastCentralizado(texto, { duracaoMs = 2000 } = {}) {
  // Remove toast anterior, se existir
  document.querySelector('[data-toast-centralizado]')?.remove();

  const overlay = document.createElement('div');
  overlay.dataset.toastCentralizado = 'true';
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center pointer-events-none';

  const card = document.createElement('div');
  card.className = 'rounded-2xl bg-error px-8 py-5 shadow-2xl pointer-events-auto';

  const span = document.createElement('span');
  span.className = 'text-sm font-semibold text-on-error text-center';
  span.textContent = texto;

  card.appendChild(span);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), duracaoMs);

  return overlay;
}
