export function criarRouter({ root, rotas, render }) {
  const entradas = Object.entries(rotas).map(([pattern, handler]) => {
    const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    return { pattern, regex, handler };
  });

  async function resolver() {
    const hash = (window.location.hash || '#/').slice(1);
    for (const { regex, handler } of entradas) {
      const m = hash.match(regex);
      if (m) {
        const html = await handler({ ...(m.groups ?? {}) });
        if (typeof render === 'function') render(html);
        else document.querySelector(root).innerHTML = html;
        return;
      }
    }
    const fallback = rotas['/'];
    if (fallback) {
      const html = await fallback({});
      if (typeof render === 'function') render(html);
      else document.querySelector(root).innerHTML = html;
    }
  }

  window.addEventListener('hashchange', resolver);
  return { resolver };
}
