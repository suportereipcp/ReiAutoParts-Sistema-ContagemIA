export function Card({ title, children = [], className = '' } = {}) {
  const el = document.createElement('div');
  el.className = `bg-surface-container-lowest rounded-xl p-6 zen-shadow-ambient ${className}`.trim();
  if (title) {
    const h = document.createElement('h3');
    h.className = 'text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4';
    h.textContent = title;
    el.appendChild(h);
  }
  for (const c of children) el.appendChild(c);
  return el;
}
