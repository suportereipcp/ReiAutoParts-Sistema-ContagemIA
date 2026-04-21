export function TopNav({ caminho = [], badge } = {}) {
  const header = document.createElement('header');
  header.className = 'fixed top-0 right-0 left-64 z-40 bg-surface-container/80 backdrop-blur-xl flex justify-between items-center px-8 h-16 zen-shadow-ambient';

  const crumbs = document.createElement('div');
  crumbs.className = 'flex items-center gap-2 text-sm text-on-surface-variant';
  caminho.forEach((p, i) => {
    const span = document.createElement('span');
    span.className = i === caminho.length - 1 ? 'font-semibold text-on-surface' : 'opacity-60';
    span.textContent = p;
    crumbs.appendChild(span);
    if (i < caminho.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'material-symbols-outlined text-xs';
      sep.textContent = 'chevron_right';
      crumbs.appendChild(sep);
    }
  });
  header.appendChild(crumbs);

  const right = document.createElement('div');
  right.className = 'flex items-center gap-4';
  if (badge) right.appendChild(badge);
  header.appendChild(right);
  return header;
}
