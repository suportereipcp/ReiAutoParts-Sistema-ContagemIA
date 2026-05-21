import { Icon } from './icon.js';

const SIZES = {
  md: 'text-sm px-6 py-3',
  sm: 'text-xs px-3 py-1.5'
};

const VARIANTS = {
  primary: 'zen-satin text-on-primary shadow-lg shadow-primary/20',
  secondary: 'text-primary hover:bg-primary-container/50',
  danger: 'bg-error hover:bg-error/90 text-on-error shadow-lg shadow-error/20',
  'outline-danger': 'border border-error text-error hover:bg-error/5',
  'icon-only': 'p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors'
};

export function Button({ texto = '', variante = 'primary', size = 'md', icone, onClick, disabled = false, className = '' } = {}) {
  const el = document.createElement('button');

  if (variante === 'icon-only') {
    el.className = `${VARIANTS['icon-only']} ${className}`.trim();
  } else {
    const sizeClass = SIZES[size] || SIZES.md;
    const variantClass = VARIANTS[variante] || VARIANTS.primary;
    el.className = `transition-all active:scale-95 font-medium rounded-lg ${sizeClass} ${variantClass} ${className}`.trim();
  }

  if (icone) {
    const ic = Icon(icone, { className: 'text-lg mr-2' });
    el.appendChild(ic);
  }
  if (texto) el.appendChild(document.createTextNode(texto));
  if (disabled) el.disabled = true;
  if (onClick) el.addEventListener('click', onClick);
  return el;
}
