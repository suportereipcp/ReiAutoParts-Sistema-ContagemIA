export function Icon(nome, { className = '' } = {}) {
  const el = document.createElement('span');
  el.className = `material-symbols-outlined ${className}`.trim();
  el.textContent = nome;
  return el;
}
