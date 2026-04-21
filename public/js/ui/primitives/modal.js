export function Modal({ title = '', subtitle = '', onFechar } = {}) {
  let overlay = null;
  let escListener = null;

  function fechar() {
    if (!overlay) return;
    overlay.remove();
    if (escListener) { document.removeEventListener('keydown', escListener); escListener = null; }
    overlay = null;
    if (onFechar) onFechar();
  }

  function abrir() {
    overlay = document.createElement('div');
    overlay.dataset.modalOverlay = 'true';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-on-surface/10 backdrop-blur-sm p-4';
    const container = document.createElement('div');
    container.className = 'w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden';
    const header = document.createElement('div');
    header.className = 'px-10 pt-10 pb-6';
    header.innerHTML = `
      <h2 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mb-1">${title}</h2>
      <p class="text-sm font-body text-on-surface-variant font-light">${subtitle}</p>
    `;
    const body = document.createElement('div');
    body.dataset.modalBody = 'true';
    body.className = 'px-10 pb-10 space-y-8';
    container.appendChild(header);
    container.appendChild(body);
    overlay.appendChild(container);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
    document.body.appendChild(overlay);
    escListener = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', escListener);
  }

  function corpo() { return overlay?.querySelector('[data-modal-body]'); }

  return { abrir, fechar, corpo };
}
