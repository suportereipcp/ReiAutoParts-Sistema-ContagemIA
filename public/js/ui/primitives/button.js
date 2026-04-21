import { Icon } from './icon.js';

const BASE = 'transition-all active:scale-95 font-medium text-sm rounded-lg';
const VARIANTES = {
  primary: `${BASE} zen-satin text-on-primary px-6 py-3 shadow-lg shadow-primary/20`,
  secondary: `${BASE} text-primary hover:bg-primary-container/50 px-6 py-3`,
  'icon-only': 'p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors',
};

export function Button({ texto = '', variante = 'primary', icone, onClick, disabled = false, className = '' } = {}) {
  const el = document.createElement('button');
  el.className = `${VARIANTES[variante] ?? VARIANTES.primary} ${className}`.trim();
  if (icone) {
    const ic = Icon(icone, { className: 'text-lg mr-2' });
    el.appendChild(ic);
  }
  if (texto) el.appendChild(document.createTextNode(texto));
  if (disabled) el.disabled = true;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}
