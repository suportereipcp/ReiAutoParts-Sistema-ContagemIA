function _criar(texto, className, duracaoMs) {
  const el = document.createElement('div');
  el.dataset.toast = 'true';
  el.className = `fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${className}`;
  el.textContent = texto;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duracaoMs);
  return el;
}

export const toast = {
  erro: (texto, { duracaoMs = 4000 } = {}) => _criar(texto, 'bg-error-container/80 text-on-error-container', duracaoMs),
  sucesso: (texto, { duracaoMs = 3000 } = {}) => _criar(texto, 'bg-secondary-container text-on-secondary-container', duracaoMs),
  info: (texto, { duracaoMs = 3000 } = {}) => _criar(texto, 'bg-surface-container-high text-on-surface', duracaoMs),
};
